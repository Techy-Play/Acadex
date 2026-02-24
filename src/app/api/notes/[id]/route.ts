import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Note from "@/models/Note";
import ActivityLog from "@/models/ActivityLog";

// GET /api/notes/[id] - Get a single note
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const note = await Note.findById(id).populate("subject", "name");
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

    // Update allowed fields
    if (body.title !== undefined) note.title = body.title;
    if (body.file_url !== undefined) note.file_url = body.file_url;
    if (body.subject !== undefined) note.subject = body.subject;

    await note.save();
    const populated = await note.populate("subject", "name");

    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_UPDATED",
      details: `Updated note: ${note.title}`,
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
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const note = await Note.findByIdAndDelete(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_DELETED",
      details: `Deleted note: ${note.title}`,
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
