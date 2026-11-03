/**
 * @module API/Subjects/[id]
 * @description Single subject operations.
 * - PUT    → updates subject fields (super admin only).
 * - DELETE → removes the subject (super admin only, requires admin password confirmation).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";
import Stream from "@/models/Stream";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { requireSuperAdmin } from "@/lib/rbac";

// DELETE /api/subjects/[id] — delete a subject (super admin only + password confirmation)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSuperAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const userId = request.headers.get("x-user-id");
    await connectDB();

    const admin = await User.findById(userId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
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

    // Check if subject has any associated materials
    const [noteCount, assignmentCount, practicalCount, libraryCount] = await Promise.all([
      Note.countDocuments({ subject: id }),
      Assignment.countDocuments({ subject: id }),
      mongoose.models.Practical ? mongoose.models.Practical.countDocuments({ subject: id }) : 0,
      mongoose.models.LibraryResource ? mongoose.models.LibraryResource.countDocuments({ subject: id }) : 0,
    ]);

    if (noteCount > 0 || assignmentCount > 0 || practicalCount > 0 || libraryCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: This subject has ${noteCount} note(s), ${assignmentCount} assignment(s), ${practicalCount} practical(s), and ${libraryCount} library resource(s). Remove them first.`,
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

    // Clean up reference in any streams
    await Stream.updateMany(
      { subjects: id },
      { $pull: { subjects: id } }
    );

    return NextResponse.json({ success: true, message: "Subject deleted" });
  } catch (error) {
    console.error("Delete subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/subjects/[id] — update a subject (super admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSuperAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json();
    const { name, type, semester, streamId } = body;
    const { id } = await params;

    await connectDB();

    const update: Record<string, string | number> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "Invalid name" }, { status: 400 });
      }
      update.name = name.trim();
    }

    if (type !== undefined) {
      if (!["theory", "practical"].includes(type)) {
        return NextResponse.json({ error: "Type must be 'theory' or 'practical'" }, { status: 400 });
      }
      update.type = type;
    }

    if (semester !== undefined) {
      const semNum = Number(semester);
      if (isNaN(semNum) || semNum < 1 || semNum > 8) {
        return NextResponse.json({ error: "Semester must be between 1 and 8" }, { status: 400 });
      }
      update.semester = semNum;
    }

    if (Object.keys(update).length === 0 && !streamId) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // If name or semester is changing, check duplicate
    if (update.name || update.semester) {
      const currentSubject = await Subject.findById(id);
      if (!currentSubject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      const checkName = (update.name as string) || currentSubject.name;
      const checkSem = (update.semester as number) || currentSubject.semester;
      const dup = await Subject.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${checkName}$`, "i") },
        semester: checkSem,
      });
      if (dup) {
        return NextResponse.json(
          { error: "A subject with this name already exists for this semester" },
          { status: 409 }
        );
      }
    }

    let subject = null;
    if (Object.keys(update).length > 0) {
      subject = await Subject.findByIdAndUpdate(id, { $set: update }, { new: true });
    } else {
      subject = await Subject.findById(id);
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (streamId) {
      const targetStream = await Stream.findById(streamId);
      if (targetStream) {
        await Stream.findByIdAndUpdate(streamId, {
          $addToSet: { subjects: subject._id },
        });
      }
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