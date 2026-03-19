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
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { noteUploadedPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";

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

    // Section filtering logic:
    // - Super admins: unrestricted, unless explicit section filter is provided.
    // - Sub-admins: only own section + global (section:null) by default.
    // - Students: own section + global by default; ?section=all can view all.
    if (userRole === "admin" && !isSuperAdmin && userSection) {
      if (sectionParam === "all" || !sectionParam) {
        filter.$or = [{ section: userSection }, { section: null }];
      } else if (sectionParam === "global") {
        filter.section = null;
      } else if (sectionParam === userSection) {
        filter.section = userSection;
      } else {
        return NextResponse.json({ notes: [] });
      }
    } else if (userRole === "student" && userSection) {
      if (sectionParam === "all") {
        // no section filter
      } else if (!sectionParam) {
        filter.$or = [{ section: userSection }, { section: null }];
      } else if (sectionParam === "global") {
        filter.section = null;
      } else {
        filter.section = sectionParam;
      }
    } else if (sectionParam && sectionParam !== "all") {
      filter.section = sectionParam === "global" ? null : sectionParam;
    }

    const notes = await Note.find(filter)
      .populate("subject", "name type semester")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ uploadedAt: -1 });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("List notes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Add a note (admin only)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = addNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedSectionIds = Array.from(
      new Set((parsed.data.sectionIds || []).filter(Boolean))
    );

    const targetSectionIds: Array<string | null> = !isSuperAdmin
      ? [adminSection || null]
      : normalizedSectionIds.length > 0
        ? normalizedSectionIds
        : parsed.data.section
          ? [parsed.data.section]
          : [null];

    await connectDB();
    void Section;

    const createdNotes = await Promise.all(
      targetSectionIds.map((sectionId) =>
        Note.create({
          subject: parsed.data.subject,
          title: parsed.data.title,
          file_url: parsed.data.file_url,
          section: sectionId,
          uploadedBy: adminId,
        })
      )
    );

    const populatedNotes = await Note.find({
      _id: { $in: createdNotes.map((n) => n._id) },
    })
      .populate([
        { path: "subject", select: "name type" },
        { path: "section", select: "name" },
      ])
      .sort({ uploadedAt: -1 });

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_ADDED",
      details:
        targetSectionIds.length > 1
          ? `Added note: ${parsed.data.title} for ${targetSectionIds.length} sections`
          : `Added note: ${parsed.data.title}`,
      section: targetSectionIds[0] || null,
    });

    const targetUserIds = Array.from(
      new Set(
        (
          await Promise.all(
            targetSectionIds.map((sectionId) =>
              resolveStudentUserIdsForSubject(parsed.data.subject, sectionId)
            )
          )
        ).flat()
      )
    );

    // Notify students
    await Notification.create({
      type: "new_note",
      title: "New Note Added",
      message: `"${parsed.data.title}" has been uploaded`,
      link: `/user/dashboard/notes?subject=${parsed.data.subject}`,
      ...(targetSectionIds.length === 1 && targetSectionIds[0] === null
        ? { targetRole: "student" }
        : { targetUsers: targetUserIds }),
    });

    if (targetUserIds.length > 0) {
      await sendPushToUsers({
        userIds: targetUserIds,
        preferenceKey: "new_note",
        payload: noteUploadedPayload(
          (populatedNotes[0]?.subject as { name?: string } | undefined)?.name || "this subject",
          parsed.data.subject
        ),
      });
    }

    return NextResponse.json(
      {
        success: true,
        note: populatedNotes[0] || null,
        createdCount: populatedNotes.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
