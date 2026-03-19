/**
 * @module API/Notes/[id]
 * @description Single note operations.
 * - GET   → fetches one note by ID.
 * - PUT   → updates the note (admin only).
 * - DELETE → removes the note (admin only).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";

const populateFields = [
  { path: "subject", select: "name type" },
  { path: "section", select: "name" },
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
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Section admin can only edit their own section's notes
    if (!isSuperAdmin && note.section?.toString() !== adminSection) {
      return NextResponse.json(
        { error: "You can only edit notes from your own section" },
        { status: 403 }
      );
    }

    // Update allowed fields
    if (body.title !== undefined) note.title = body.title;
    if (body.file_url !== undefined) note.file_url = body.file_url;
    if (body.subject !== undefined) note.subject = body.subject;
    const normalizedSectionIds = Array.isArray(body.sectionIds)
      ? Array.from(new Set(body.sectionIds.filter(Boolean)))
      : [];

    if (isSuperAdmin) {
      if (normalizedSectionIds.length > 0) {
        note.section = normalizedSectionIds[0];
      } else if (body.section !== undefined) {
        note.section = body.section || null;
      }
    } else {
      note.section = adminSection || null;
    }

    await note.save();

    let replicatedCount = 0;
    if (isSuperAdmin && normalizedSectionIds.length > 1) {
      const siblingSectionIds = normalizedSectionIds.slice(1);
      for (const sectionId of siblingSectionIds) {
        const existingSibling = await Note.findOne({
          _id: { $ne: note._id },
          subject: note.subject,
          section: sectionId,
          title: note.title,
          file_url: note.file_url,
          uploadedBy: note.uploadedBy,
        });

        if (!existingSibling) {
          await Note.create({
            subject: note.subject,
            title: note.title,
            file_url: note.file_url,
            section: sectionId,
            uploadedBy: note.uploadedBy,
          });
        }
        replicatedCount += 1;
      }
    }

    const populated = await note.populate(populateFields);

    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_UPDATED",
      details: `Updated note: ${note.title}`,
      section: note.section || null,
    });

    return NextResponse.json({ success: true, note: populated, replicatedCount });
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
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Section admin can only delete their own section's notes
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");
    if (!isSuperAdmin && note.section?.toString() !== adminSection) {
      return NextResponse.json(
        { error: "You can only delete notes from your own section" },
        { status: 403 }
      );
    }

    await Note.findByIdAndDelete(id);

    await ActivityLog.create({
      user: adminId!,
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
