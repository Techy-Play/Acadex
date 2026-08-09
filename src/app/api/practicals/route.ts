/**
 * @module API/Practicals
 * @description Practical list & creation.
 * - GET  → lists practicals with optional subject/section/semester filters.
 * - POST → creates a new practical (admin only, validated with `addPracticalSchema`).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addPracticalSchema } from "@/lib/validations";
import Subject from "@/models/Subject";
import Practical from "@/models/Practical";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { practicalUploadedPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";

// GET /api/practicals - List practicals (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Subject;
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
        const semSubjects = await Subject.find({ semester: semesterNum })
          .select("_id")
          .lean();
        const semSubjectIds = semSubjects.map((s) => s._id.toString());
        if (semSubjectIds.length === 0) {
          return NextResponse.json({ practicals: [] });
        }

        if (subjectId) {
          if (!semSubjectIds.includes(subjectId)) {
            return NextResponse.json({ practicals: [] });
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

      const student = await User.findById(userId).select("stream semester").lean();

      if (!student?.stream) {
        return NextResponse.json({ practicals: [] });
      }

      const stream = await StreamModel.findById(student.stream).select("subjects").lean();

      if (!stream?.subjects?.length) {
        return NextResponse.json({ practicals: [] });
      }

      const subjectFilter: Record<string, unknown> = {
        _id: { $in: stream.subjects },
      };

      if (student.semester && student.semester >= 1 && student.semester <= 8) {
        subjectFilter.semester = student.semester;
      }

      const allowedSubjects = await Subject.find(subjectFilter)
        .select("_id")
        .lean();

      const allowedSubjectIds = allowedSubjects.map((s) => s._id.toString());

      if (allowedSubjectIds.length === 0) {
        return NextResponse.json({ practicals: [] });
      }

      if (subjectId) {
        if (!allowedSubjectIds.includes(subjectId)) {
          return NextResponse.json({ practicals: [] });
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

    const practicals = await Practical.find(filter)
      .populate("subject", "name type semester")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ practicals });
  } catch (error) {
    console.error("List practicals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/practicals - Add a practical (admin only)
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

    const parsed = addPracticalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let sectionId = parsed.data.section || null;
    if (!isSuperAdmin) {
      sectionId = adminSection || null;
    }

    await connectDB();
    void Subject;
    void Section;

    const practical = await Practical.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || "",
      file_url: parsed.data.file_url || "",
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      section: sectionId,
      uploadedBy: adminId,
    });

    const populated = await practical.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
    ]);

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "PRACTICAL_ADDED",
      details: `Added practical: ${parsed.data.title}`,
      section: sectionId || null,
    });

    // Notify students
    const targetUserIds = await resolveStudentUserIdsForSubject(
      parsed.data.subject,
      sectionId
    );

    if (targetUserIds.length > 0) {
      await Notification.create({
        type: "new_practical",
        title: "New Practical Added",
        message: `"${parsed.data.title}" has been uploaded`,
        link: `/user/dashboard/practicals?subject=${parsed.data.subject}`,
        targetUsers: targetUserIds,
      });
    } else {
      await Notification.create({
        type: "new_practical",
        title: "New Practical Added",
        message: `"${parsed.data.title}" has been uploaded`,
        link: `/user/dashboard/practicals?subject=${parsed.data.subject}`,
        targetRole: "student",
      });
    }

    if (targetUserIds.length > 0) {
      await sendPushToUsers({
        userIds: targetUserIds,
        preferenceKey: "new_practical",
        payload: practicalUploadedPayload(
          (populated.subject as { name?: string } | undefined)?.name || "this subject",
          parsed.data.subject,
          parsed.data.title
        ),
      });
    }

    return NextResponse.json(
      { success: true, practical: populated },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
