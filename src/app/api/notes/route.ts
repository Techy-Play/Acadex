import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addNoteSchema } from "@/lib/validations";
import Note from "@/models/Note";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// GET /api/notes - List notes (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section; // Ensure Section model is registered for populate
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
      // Sub-admin: always restricted to own section
      filter.section = userSection;
    } else if (sectionParam && sectionParam !== "all") {
      // Explicit section filter from query param
      filter.section = sectionParam;
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      // Student: default to own section
      filter.section = userSection;
    }

    const notes = await Note.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name")
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
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

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

    // Determine section: super admin can choose any; section admin auto-fills their section
    let sectionId = parsed.data.section || null;
    if (!isSuperAdmin) {
      sectionId = adminSection || null;
    }

    await connectDB();
    void Section;

    const note = await Note.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      file_url: parsed.data.file_url,
      section: sectionId,
      uploadedBy: adminId,
    });

    const populated = await note.populate(["subject", "section"].map(f =>
      f === "subject" ? { path: "subject", select: "name type" } : { path: "section", select: "name" }
    ));

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "NOTE_ADDED",
      details: `Added note: ${parsed.data.title}`,
    });

    // Notify students
    await Notification.create({
      type: "new_note",
      title: "New Note Added",
      message: `"${parsed.data.title}" has been uploaded`,
      link: "/user/dashboard/notes",
      targetRole: "student",
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
