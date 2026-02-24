import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Assignment from "@/models/Assignment";
import ActivityLog from "@/models/ActivityLog";

// GET /api/assignments/[id] - Get a single assignment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const assignment = await Assignment.findById(id).populate("subject", "name");
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/assignments/[id] - Update an assignment (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Update allowed fields
    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.file_url !== undefined) assignment.file_url = body.file_url;
    if (body.subject !== undefined) assignment.subject = body.subject;
    if (body.deadline !== undefined) {
      assignment.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    await assignment.save();
    const populated = await assignment.populate("subject", "name");

    await ActivityLog.create({
      user: adminId!,
      action: "ASSIGNMENT_UPDATED",
      details: `Updated assignment: ${assignment.title}`,
    });

    return NextResponse.json({ success: true, assignment: populated });
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/[id] - Delete an assignment (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await ActivityLog.create({
      user: adminId!,
      action: "ASSIGNMENT_DELETED",
      details: `Deleted assignment: ${assignment.title}`,
    });

    return NextResponse.json({ success: true, message: "Assignment deleted" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
