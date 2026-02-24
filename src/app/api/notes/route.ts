import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addNoteSchema } from "@/lib/validations";
import Note from "@/models/Note";
import ActivityLog from "@/models/ActivityLog";

// GET /api/notes - List notes (optionally filter by subject)
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");

    const filter = subjectId ? { subject: subjectId } : {};
    const notes = await Note.find(filter)
      .populate("subject", "name")
      .sort({ uploadedAt: -1 });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("List notes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Add a note (admin only)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = addNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const note = await Note.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      file_url: parsed.data.file_url,
    });

    const populated = await note.populate("subject", "name");

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_ADDED",
      details: `Added note: ${parsed.data.title}`,
    });

    return NextResponse.json({ success: true, note: populated }, { status: 201 });
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
