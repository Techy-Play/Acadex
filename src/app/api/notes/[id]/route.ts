/**
 * @module API/Notes/[id]
 * @description Single note operations.
 * - GET    → fetches one note by ID.
 * - PUT    → updates the note (admin with section permission).
 * - DELETE → removes the note (admin with section permission).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import ActivityLog from "@/models/ActivityLog";
import { requireAdmin, canAdminManageResource } from "@/lib/rbac";

const populateFields = [
  { path: "subject", select: "name type" },
  { path: "section", select: "name" },
  { path: "sections", select: "name" },
];

// GET /api/notes/[id] - Get a single note
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    void Section;

    const note = await Note.findById(id).populate(populateFields);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Get note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update a note (admin only)
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

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Determine target section if being modified
    const targetSection =
      body.section !== undefined ? (body.section || null) : undefined;

    // Check permissions on origin and destination sections
    if (!canAdminManageResource(authUser, note.section?.toString(), targetSection)) {
      return NextResponse.json(
        { error: "You do not have permission to manage notes in this section" },
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
      note.subject = body.subject;
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
    if (body.title !== undefined) note.title = body.title;
    if (body.file_url !== undefined) note.file_url = body.file_url;
    if (body.section !== undefined) note.section = body.section || null;
    if (body.sections !== undefined) {
      note.sections = body.sections;
    } else if (body.section !== undefined) {
      note.sections = body.section ? [body.section] : [];
    }

    await note.save();
    const populated = await note.populate(populateFields);

    await ActivityLog.create({
      user: authUser.userId,
      action: "NOTE_UPDATED",
      details: `Updated note: ${note.title}`,
      section: note.section || null,
    });

    return NextResponse.json({ success: true, note: populated });
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note (admin only)
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

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check permission on note's section
    if (!canAdminManageResource(authUser, note.section?.toString())) {
      return NextResponse.json(
        { error: "You do not have permission to delete notes from this section" },
        { status: 403 }
      );
    }

    await Note.findByIdAndDelete(id);

    await ActivityLog.create({
      user: authUser.userId,
      action: "NOTE_DELETED",
      details: `Deleted note: ${note.title}`,
      section: note.section || null,
    });

    return NextResponse.json({ success: true, message: "Note deleted" });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
