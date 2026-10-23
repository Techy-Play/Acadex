/**
 * @module API/Assignments
 * @description Assignment list & creation.
 * - GET  → lists assignments with optional subject/section/semester filters.
 * - POST → creates a new assignment (admin only, validated with `addAssignmentSchema`).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addAssignmentSchema } from "@/lib/validations";
import Assignment from "@/models/Assignment";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { assignmentUploadedPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";
import { logAdminOperation } from "@/lib/audit-logger";

// GET /api/assignments - List assignments (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section;
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
          return NextResponse.json({ assignments: [] });
        }

        if (subjectId) {
          if (!semSubjectIds.includes(subjectId)) {
            return NextResponse.json({ assignments: [] });
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
        return NextResponse.json({ assignments: [] });
      }

      const stream = await StreamModel.findById(student.stream).select("subjects").lean();

      if (!stream?.subjects?.length) {
        return NextResponse.json({ assignments: [] });
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
        return NextResponse.json({ assignments: [] });
      }

      if (subjectId) {
        if (!allowedSubjectIds.includes(subjectId)) {
          return NextResponse.json({ assignments: [] });
        }
      } else {
        filter.subject = { $in: allowedSubjectIds };
      }
    }

    const authUser = await getAuthUser(request);
    const allowedSections: string[] = authUser ? authUser.effectiveSectionIds : [];

    if (userRole === "admin" && !isSuperAdmin) {
      // M-02: Prevent section=all bypass for sub-admins
      const querySection = sectionParam && sectionParam !== "all" ? sectionParam : null;
      if (querySection) {
        if (allowedSections.length > 0 && !allowedSections.includes(querySection)) {
          return NextResponse.json({ assignments: [] });
        }
        filter.$or = [{ section: querySection }, { sections: querySection }];
      } else if (allowedSections.length > 0) {
        filter.$or = [
          { section: { $in: allowedSections } },
          { sections: { $in: allowedSections } }
        ];
      } else {
        return NextResponse.json({ assignments: [] });
      }
    } else if (sectionParam && sectionParam !== "all") {
      filter.$or = [{ section: sectionParam }, { sections: sectionParam }];
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.$or = [{ section: userSection }, { sections: userSection }];
    }

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    // Default to 50 items per page if not specified
    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam) || 50) : 50;
    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(filter)
      .populate("subject", "name type semester")
      .populate("section", "name")
      .populate("sections", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Assignment.countDocuments(filter);

    return NextResponse.json({ 
      assignments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("List assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Add an assignment (admin only)
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const body = await request.json();

    const parsed = addAssignmentSchema.safeParse(body);
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
            { error: "You cannot add assignments to a section you are not assigned to" },
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

    const assignment = await Assignment.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || "",
      file_url: parsed.data.file_url || "",
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      section: sectionId,
      sections: sectionsIds,
      uploadedBy: authUser.userId,
    });

    const populated = await assignment.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
      { path: "sections", select: "name" },
    ]);

    // Structured Audit Log
    try {
      await logAdminOperation({
        admin: authUser,
        action: "ASSIGNMENT_CREATE",
        description: `Created assignment "${parsed.data.title}"`,
        target: {
          id: assignment._id.toString(),
          type: "assignment",
          name: parsed.data.title,
          section: sectionId || null,
          subject: parsed.data.subject,
        },
        route: `/user/dashboard/viewer?type=assignment&id=${assignment._id}`,
        metadata: {
          title: parsed.data.title,
          deadline: parsed.data.deadline,
          subject: parsed.data.subject,
          section: sectionId || null,
          sections: sectionsIds,
        },
        req: request,
      });
    } catch (auditErr) {
      console.warn("Failed to record assignment create audit log:", auditErr);
    }

    // Log activity
    await ActivityLog.create({
      user: authUser.userId,
      action: "ASSIGNMENT_ADDED",
      details: `Added assignment: ${parsed.data.title}`,
      section: sectionId || null,
    });

    // Notify students
    const deadlineInfo = parsed.data.deadline
      ? ` (Due: ${new Date(parsed.data.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`
      : "";
    const targetUserIds = await resolveStudentUserIdsForSubject(
      parsed.data.subject,
      sectionId
    );

    if (targetUserIds.length > 0) {
      await Notification.create({
        type: "new_assignment",
        title: "New Assignment Added",
        message: `"${parsed.data.title}"${deadlineInfo} has been posted`,
        link: `/user/dashboard/assignments?subject=${parsed.data.subject}`,
        targetUsers: targetUserIds,
      });
    } else {
      await Notification.create({
        type: "new_assignment",
        title: "New Assignment Added",
        message: `"${parsed.data.title}"${deadlineInfo} has been posted`,
        link: `/user/dashboard/assignments?subject=${parsed.data.subject}`,
        targetRole: "student",
      });
    }

    if (targetUserIds.length > 0) {
      await sendPushToUsers({
        userIds: targetUserIds,
        preferenceKey: "new_assignment",
        payload: assignmentUploadedPayload(
          (populated.subject as { name?: string } | undefined)?.name || "this subject",
          parsed.data.subject
        ),
      });
    }

    return NextResponse.json(
      { success: true, assignment: populated },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
