/**
 * @module API/Assignments/[id]
 * @description Single assignment operations.
 * - GET    → fetches one assignment by ID.
 * - PUT    → updates the assignment (admin with section permission).
 * - DELETE → removes the assignment (admin with section permission).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Assignment from "@/models/Assignment";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import ActivityLog from "@/models/ActivityLog";
import { requireAdmin, canAdminManageResource } from "@/lib/rbac";

const populateFields = [
  { path: "subject", select: "name type" },
  { path: "section", select: "name" },
  { path: "sections", select: "name" },
];

// GET /api/assignments/[id] - Get a single assignment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    void Section;

    const assignment = await Assignment.findById(id).populate(populateFields);
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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Determine target section if being modified
    const targetSection =
      body.section !== undefined ? (body.section || null) : undefined;

    // Check permissions on origin and destination sections
    if (!canAdminManageResource(authUser, assignment.section?.toString(), targetSection)) {
      return NextResponse.json(
        { error: "You do not have permission to manage assignments in this section" },
        { status: 403 }
      );
    }

    // Validate subject if provided
    if (body.subject !== undefined) {
      const subjectExists = await Subject.findById(body.subject);
      if (!subjectExists) {
        return NextResponse.json(
          { error: "Selected subject does not exist" },
          { status: 400 }
        );
      }
      assignment.subject = body.subject;
    }

    // Validate destination section in DB if provided
    if (targetSection) {
      const sectionExists = await Section.findById(targetSection);
      if (!sectionExists) {
        return NextResponse.json(
          { error: "Selected section does not exist" },
          { status: 400 }
        );
      }
    }

    // Update allowed fields
    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.file_url !== undefined) assignment.file_url = body.file_url;
    if (body.deadline !== undefined) {
      assignment.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.section !== undefined) assignment.section = body.section || null;
    if (body.sections !== undefined) {
      assignment.sections = body.sections;
    } else if (body.section !== undefined) {
      assignment.sections = body.section ? [body.section] : [];
    }

    await assignment.save();
    const populated = await assignment.populate(populateFields);

    await ActivityLog.create({
      user: authUser.userId,
      action: "ASSIGNMENT_UPDATED",
      details: `Updated assignment: ${assignment.title}`,
      section: assignment.section || null,
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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const { id } = await params;

    await connectDB();

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Check permission on assignment's section
    if (!canAdminManageResource(authUser, assignment.section?.toString())) {
      return NextResponse.json(
        { error: "You do not have permission to delete assignments from this section" },
        { status: 403 }
      );
    }

    await Assignment.findByIdAndDelete(id);

    await ActivityLog.create({
      user: authUser.userId,
      action: "ASSIGNMENT_DELETED",
      details: `Deleted assignment: ${assignment.title}`,
      section: assignment.section || null,
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
