/**
 * @module API/Practicals/[id]
 * @description Single practical operations.
 * - GET    → fetches one practical by ID.
 * - PUT    → updates the practical (admin with section permission).
 * - DELETE → removes the practical (admin with section permission).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";
import Practical from "@/models/Practical";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import { requireAdmin, canAdminManageResource } from "@/lib/rbac";

const populateFields = [
  { path: "subject", select: "name type" },
  { path: "section", select: "name" },
  { path: "sections", select: "name" },
];

// GET /api/practicals/[id] - Get a single practical
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    void Subject;
    void Section;

    const practical = await Practical.findById(id).populate(populateFields);
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ practical });
  } catch (error) {
    console.error("Get practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/practicals/[id] - Update a practical (admin only)
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
    void Subject;

    const practical = await Practical.findById(id);
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    // Determine target section if being modified
    const targetSection =
      body.section !== undefined ? (body.section || null) : undefined;

    // Check permissions on origin and destination sections
    if (!canAdminManageResource(authUser, practical.section?.toString(), targetSection)) {
      return NextResponse.json(
        { error: "You do not have permission to manage practicals in this section" },
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
      practical.subject = body.subject;
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
    if (body.title !== undefined) practical.title = body.title;
    if (body.description !== undefined) practical.description = body.description;
    if (body.file_url !== undefined) practical.file_url = body.file_url;
    if (body.deadline !== undefined) {
      practical.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.section !== undefined) practical.section = body.section || null;
    if (body.sections !== undefined) {
      practical.sections = body.sections;
    } else if (body.section !== undefined) {
      practical.sections = body.section ? [body.section] : [];
    }

    await practical.save();
    const populated = await practical.populate(populateFields);

    await ActivityLog.create({
      user: authUser.userId,
      action: "PRACTICAL_UPDATED",
      details: `Updated practical: ${practical.title}`,
      section: practical.section || null,
    });

    return NextResponse.json({ success: true, practical: populated });
  } catch (error) {
    console.error("Update practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/practicals/[id] - Delete a practical (admin only)
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

    const practical = await Practical.findById(id);
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    // Check permission on practical's section
    if (!canAdminManageResource(authUser, practical.section?.toString())) {
      return NextResponse.json(
        { error: "You do not have permission to delete practicals from this section" },
        { status: 403 }
      );
    }

    await Practical.findByIdAndDelete(id);

    await ActivityLog.create({
      user: authUser.userId,
      action: "PRACTICAL_DELETED",
      details: `Deleted practical: ${practical.title}`,
      section: practical.section || null,
    });

    return NextResponse.json({ success: true, message: "Practical deleted" });
  } catch (error) {
    console.error("Delete practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
