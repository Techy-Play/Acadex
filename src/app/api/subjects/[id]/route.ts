/**
 * @module API/Subjects/[id]
 * @description Single subject operations.
 * - PUT   → updates subject fields (admin with `isAdminSubject` or super admin).
 * - DELETE → removes the subject (requires admin password confirmation).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// DELETE /api/subjects/[id] — delete a subject (requires admin password + isAdminSubject or super admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const admin = await User.findById(userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (!isSuperAdmin && !admin.isAdminSubject) {
      return NextResponse.json({ error: "You don't have permission to manage subjects" }, { status: 403 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete a subject" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if subject has notes or assignments
    const [noteCount, assignmentCount] = await Promise.all([
      Note.countDocuments({ subject: id }),
      Assignment.countDocuments({ subject: id }),
    ]);

    if (noteCount > 0 || assignmentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: This subject has ${noteCount} note(s) and ${assignmentCount} assignment(s). Remove them first.`,
        },
        { status: 400 }
      );
    }

    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Subject deleted" });
  } catch (error) {
    console.error("Delete subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/subjects/[id] — update a subject (admin with isAdminSubject or super admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      await connectDB();
      const admin = await User.findById(userId).select("isAdminSubject").lean();
      if (!admin?.isAdminSubject) {
        return NextResponse.json({ error: "You don't have permission to manage subjects" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, type, semester } = body;

    const { id } = await params;

    await connectDB();

    const update: Record<string, string | number> = {};
    if (name && name.trim()) update.name = name.trim();
    if (type && ["theory", "practical"].includes(type)) update.type = type;
    if (semester !== undefined && semester >= 1 && semester <= 8) update.semester = Number(semester);

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const subject = await Subject.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error("Update subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}