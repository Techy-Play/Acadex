import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addAssignmentSchema } from "@/lib/validations";
import Assignment from "@/models/Assignment";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// GET /api/assignments - List assignments (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");
    const sectionId = searchParams.get("section");

    const filter: Record<string, string> = {};
    if (subjectId) filter.subject = subjectId;
    if (sectionId) filter.section = sectionId;

    const assignments = await Assignment.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
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
