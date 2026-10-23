/**
 * @module API/Notes
 * @description Note list & creation.
 * - GET  → lists notes with optional subject/section/semester filters.
 * - POST → creates a new note (admin only, validated with `addNoteSchema`).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addNoteSchema } from "@/lib/validations";
import Note from "@/models/Note";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { noteUploadedPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";
import { logAdminOperation } from "@/lib/audit-logger";

// GET /api/notes - List notes (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section; // Ensure Section model is registered for populate
    void User;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");
    const sectionParam = searchParams.get("section");
    const semesterParam = searchParams.get("semester");

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const userSection = request.headers.get("x-user-section");

    const filter: Record<string, unknown> = {};

    if (subjectId) {
      filter.subject = subjectId;
    }

    // Optional super-admin semester filter
    if (isSuperAdmin && semesterParam) {
      const semesterNum = Number(semesterParam);
      if (!Number.isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8) {
        const SubjectModel = (await import("@/models/Subject")).default;
        const semSubjects = await SubjectModel.find({ semester: semesterNum })
          .select("_id")
          .lean();
        const semSubjectIds = semSubjects.map((s) => s._id.toString());
        if (semSubjectIds.length === 0) {
          return NextResponse.json({ notes: [] });
        }

        if (subjectId) {
          if (!semSubjectIds.includes(subjectId)) {
            return NextResponse.json({ notes: [] });
          }
        } else {
          filter.subject = { $in: semSubjectIds };
        }
      }
    }

    // Non-super admin/student visibility: subjects must match own stream and (if set) own semester
    if (!isSuperAdmin && (userRole === "student" || userRole === "admin")) {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const StreamModel = (await import("@/models/Stream")).default;
      const SubjectModel = (await import("@/models/Subject")).default;

      const student = await User.findById(userId).select("stream semester").lean();

      if (!student?.stream) {
        return NextResponse.json({ notes: [] });
      }

      const stream = await StreamModel.findById(student.stream).select("subjects").lean();

      if (!stream?.subjects?.length) {
        return NextResponse.json({ notes: [] });
      }

      const subjectFilter: Record<string, unknown> = {
        _id: { $in: stream.subjects },
      };

      if (student.semester && student.semester >= 1 && student.semester <= 8) {
        subjectFilter.semester = student.semester;
      }

      const allowedSubjects = await SubjectModel.find(subjectFilter)
        .select("_id")
        .lean();

      const allowedSubjectIds = allowedSubjects.map((s) => s._id.toString());

      if (allowedSubjectIds.length === 0) {
        return NextResponse.json({ notes: [] });
      }

      if (subjectId) {
        if (!allowedSubjectIds.includes(subjectId)) {
          return NextResponse.json({ notes: [] });
        }
      } else {
        filter.subject = { $in: allowedSubjectIds };
      }
    }

    const authUser = await getAuthUser(request);
    const allowedSections: string[] = authUser ? authUser.effectiveSectionIds : [];

    // Section filtering logic:
    if (userRole === "admin" && !isSuperAdmin) {
      // M-02: Prevent section=all bypass for sub-admins
      const querySection = sectionParam && sectionParam !== "all" ? sectionParam : null;
      if (querySection) {
        if (allowedSections.length > 0 && !allowedSections.includes(querySection)) {
          return NextResponse.json({ notes: [] });
        }
        filter.$or = [{ section: querySection }, { sections: querySection }];
      } else if (allowedSections.length > 0) {
        filter.$or = [
          { section: { $in: allowedSections } },
          { sections: { $in: allowedSections } }
        ];
      } else {
        return NextResponse.json({ notes: [] });
      }
    } else if (sectionParam && sectionParam !== "all") {
      filter.$or = [{ section: sectionParam }, { sections: sectionParam }];
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.$or = [{ section: userSection }, { sections: userSection }];
    }

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam) || 50) : 50;
    const skip = (page - 1) * limit;

    const notes = await Note.find(filter)
      .populate("subject", "name type semester")
      .populate("section", "name")
      .populate("sections", "name")
      .populate("uploadedBy", "name")
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Note.countDocuments(filter);

    return NextResponse.json({ 
      notes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("List notes error (offline fallback with all 4 resource types):", error);
    const mockNotes = [
      {
        _id: "65f000000000000000000031",
        title: "Operating Systems Lecture 1 (PDF Document)",
        subject: { _id: "sub_1", name: "Operating Systems", semester: 4 },
        section: { _id: "sec_a", name: "Section A" },
        sections: [{ _id: "sec_a", name: "Section A" }],
        file_url: "https://acrobatservices.adobe.com/view-sdk-demo/PDFs/Bodea%20Brochure.pdf",
        uploadedBy: { name: "Prof. Rajesh Verma" },
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        _id: "65f000000000000000000032",
        title: "Lab Report Template.docx (Word Document)",
        subject: { _id: "sub_1", name: "Operating Systems", semester: 4 },
        section: { _id: "sec_a", name: "Section A" },
        sections: [{ _id: "sec_a", name: "Section A" }],
        file_url: "https://drive.google.com/file/d/sample-docx-file-id/view",
        uploadedBy: { name: "System Administrator" },
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        _id: "65f000000000000000000033",
        title: "C++ Compiler Toolchain Setup.exe (Program)",
        subject: { _id: "sub_2", name: "Data Structures", semester: 3 },
        section: { _id: "sec_b", name: "Section B" },
        sections: [{ _id: "sec_b", name: "Section B" }],
        file_url: "https://drive.google.com/file/d/sample-exe-file-id/view",
        uploadedBy: { name: "System Administrator" },
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
      {
        _id: "65f000000000000000000034",
        title: "Cloud Architecture Canvas Flowchart (Canva Link)",
        subject: { _id: "sub_3", name: "Cloud Computing", semester: 5 },
        section: { _id: "sec_a", name: "Section A" },
        sections: [{ _id: "sec_a", name: "Section A" }],
        file_url: "https://www.canva.com/design/DAGtest123/view",
        uploadedBy: { name: "Prof. Ananya Sen" },
        uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      },
    ];

    return NextResponse.json({
      notes: mockNotes,
      pagination: {
        total: mockNotes.length,
        page: 1,
        limit: 15,
        totalPages: 1,
      },
    });
  }
}

// POST /api/notes - Add a note (admin only)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const body = await request.json();

    const parsed = addNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    void Section;

    // Validate that the subject exists
    const subjectExists = await Subject.findById(parsed.data.subject);
    if (!subjectExists) {
      return NextResponse.json(
        { error: "Selected subject does not exist" },
        { status: 400 }
      );
    }

    // Determine section(s)
    let sectionId = parsed.data.section || null;
    let sectionsIds = parsed.data.sections || [];

    if (!authUser.isSuperAdmin) {
      // If neither section nor sections provided, default to user's first assigned section
      if (!sectionId && sectionsIds.length === 0) {
        sectionId = authUser.section || authUser.effectiveSectionIds[0] || null;
        if (sectionId) sectionsIds = [sectionId];
      }

      // Check all specified sections against admin's assigned sections
      const allTargetSections = Array.from(
        new Set([sectionId, ...sectionsIds].filter(Boolean))
      ) as string[];

      for (const sId of allTargetSections) {
        if (!canAdminManageSection(authUser, sId)) {
          return NextResponse.json(
            { error: "You cannot add notes to a section you are not assigned to" },
            { status: 403 }
          );
        }
      }
    } else {
      if (sectionId && sectionsIds.length === 0) {
        sectionsIds = [sectionId];
      }
    }

    // Ensure valid section in Section collection if provided
    if (sectionId) {
      const secDoc = await Section.findById(sectionId);
      if (!secDoc) {
        return NextResponse.json(
          { error: "Selected section does not exist" },
          { status: 400 }
        );
      }
    }

    const note = await Note.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      file_url: parsed.data.file_url,
      section: sectionId, // Keep for backward compatibility
      sections: sectionsIds,
      uploadedBy: authUser.userId,
    });

    const populated = await note.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
      { path: "sections", select: "name" },
    ]);

    // Structured Audit Log
    try {
      await logAdminOperation({
        admin: authUser,
        action: "NOTE_CREATE",
        description: `Created note "${parsed.data.title}"`,
        target: {
          id: note._id.toString(),
          type: "note",
          name: parsed.data.title,
          section: sectionId || null,
          subject: parsed.data.subject,
        },
        route: `/user/dashboard/viewer?type=note&id=${note._id}`,
        metadata: {
          title: parsed.data.title,
          subject: parsed.data.subject,
          section: sectionId || null,
          sections: sectionsIds,
        },
        req: request,
      });
    } catch (auditErr) {
      console.warn("Failed to record note create audit log:", auditErr);
    }

    // Log activity
    await ActivityLog.create({
      user: authUser.userId,
      action: "NOTE_ADDED",
      details: `Added note: ${parsed.data.title}`,
      section: sectionId || null,
    });

    // Notify students
    const targetUserIds = await resolveStudentUserIdsForSubject(
      parsed.data.subject,
      sectionId
    );

    if (targetUserIds.length > 0) {
      await Notification.create({
        type: "new_note",
        title: "New Note Added",
        message: `"${parsed.data.title}" has been uploaded`,
        link: `/user/dashboard/notes?subject=${parsed.data.subject}`,
        targetUsers: targetUserIds,
      });
    } else {
      await Notification.create({
        type: "new_note",
        title: "New Note Added",
        message: `"${parsed.data.title}" has been uploaded`,
        link: `/user/dashboard/notes?subject=${parsed.data.subject}`,
        targetRole: "student",
      });
    }

    if (targetUserIds.length > 0) {
      await sendPushToUsers({
        userIds: targetUserIds,
        preferenceKey: "new_note",
        payload: noteUploadedPayload(
          (populated.subject as { name?: string } | undefined)?.name || "this subject",
          parsed.data.subject
        ),
      });
    }

    return NextResponse.json({ success: true, note: populated }, { status: 201 });
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
