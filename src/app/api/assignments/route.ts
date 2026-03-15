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
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { assignmentUploadedPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";

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

    // Section filtering logic:
    // - Super admins see all (unless they explicitly filter)
    // - Sub-admins are hard-filtered to their own section
    // - Students default to their section; can use ?section=all to see all
    if (userRole === "admin" && !isSuperAdmin && userSection) {
      if (sectionParam && sectionParam !== "all") {
        filter.section = sectionParam;
      } else if (sectionParam !== "all") {
        filter.section = userSection;
      }
    } else if (sectionParam && sectionParam !== "all") {
      filter.section = sectionParam;
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.section = userSection;
    }

    const assignments = await Assignment.find(filter)
      .populate("subject", "name type semester")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ assignments });
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
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = addAssignmentSchema.safeParse(body);
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

    const createdAssignments = await Promise.all(
      targetSectionIds.map((sectionId) =>
        Assignment.create({
          subject: parsed.data.subject,
          title: parsed.data.title,
          description: parsed.data.description || "",
          file_url: parsed.data.file_url || "",
          deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
          section: sectionId,
          uploadedBy: adminId,
        })
      )
    );

    const populatedAssignments = await Assignment.find({
      _id: { $in: createdAssignments.map((a) => a._id) },
    })
      .populate([
        { path: "subject", select: "name type" },
        { path: "section", select: "name" },
      ])
      .sort({ createdAt: -1 });

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "ASSIGNMENT_ADDED",
      details:
        targetSectionIds.length > 1
          ? `Added assignment: ${parsed.data.title} for ${targetSectionIds.length} sections`
          : `Added assignment: ${parsed.data.title}`,
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
    const deadlineInfo = parsed.data.deadline
      ? ` (Due: ${new Date(parsed.data.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`
      : "";
    await Notification.create({
      type: "new_assignment",
      title: "New Assignment Added",
      message: `"${parsed.data.title}"${deadlineInfo} has been posted`,
      link: `/user/dashboard/assignments?subject=${parsed.data.subject}`,
      ...(targetSectionIds.length === 1 && targetSectionIds[0] === null
        ? { targetRole: "student" }
        : { targetUsers: targetUserIds }),
    });

    if (targetUserIds.length > 0) {
      await sendPushToUsers({
        userIds: targetUserIds,
        preferenceKey: "new_assignment",
        payload: assignmentUploadedPayload(
          (populatedAssignments[0]?.subject as { name?: string } | undefined)?.name || "this subject",
          parsed.data.subject
        ),
      });
    }

    return NextResponse.json(
      {
        success: true,
        assignment: populatedAssignments[0] || null,
        createdCount: populatedAssignments.length,
      },
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
