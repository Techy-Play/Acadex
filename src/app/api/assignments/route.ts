import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addAssignmentSchema } from "@/lib/validations";
import Assignment from "@/models/Assignment";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// GET /api/assignments - List assignments (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section;
    void User;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");
    const sectionParam = searchParams.get("section");

    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const userSection = request.headers.get("x-user-section");

    const filter: Record<string, string> = {};
    if (subjectId) filter.subject = subjectId;

    // Section filtering logic:
    // - Super admins see all (unless they explicitly filter)
    // - Sub-admins are hard-filtered to their own section
    // - Students default to their section; can use ?section=all to see all
    if (userRole === "admin" && !isSuperAdmin && userSection) {
      filter.section = userSection;
    } else if (sectionParam && sectionParam !== "all") {
      filter.section = sectionParam;
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.section = userSection;
    }

    const assignments = await Assignment.find(filter)
      .populate("subject", "name type")
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

    let sectionId = parsed.data.section || null;
    if (!isSuperAdmin) {
      sectionId = adminSection || null;
    }

    await connectDB();
    void Section;

    const assignment = await Assignment.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || "",
      file_url: parsed.data.file_url || "",
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      section: sectionId,
      uploadedBy: adminId,
    });

    const populated = await assignment.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
    ]);

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "ASSIGNMENT_ADDED",
      details: `Added assignment: ${parsed.data.title}`,
    });

    // Notify students
    const deadlineInfo = parsed.data.deadline
      ? ` (Due: ${new Date(parsed.data.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`
      : "";
    await Notification.create({
      type: "new_assignment",
      title: "New Assignment Added",
      message: `"${parsed.data.title}"${deadlineInfo} has been posted`,
      link: "/user/dashboard/assignments",
      targetRole: "student",
    });

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
