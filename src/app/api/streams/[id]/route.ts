/**
 * @module API/Streams/[id]
 * @description Single stream operations.
 * - PUT   → updates the stream's name/subjects (admin with `isAdminStream` or super admin).
 * - DELETE → removes the stream.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Stream from "@/models/Stream";
import Subject from "@/models/Subject";
import User from "@/models/User";

// PUT /api/streams/[id] - Update a stream (admin with isAdminStream or super admin)
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
      const admin = await User.findById(userId).select("isAdminStream").lean();
      if (!admin?.isAdminStream) {
        return NextResponse.json({ error: "You don't have permission to manage streams" }, { status: 403 });
      }
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subjects } = body;

    await connectDB();

    const stream = await Stream.findById(id);
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // If renaming, check for duplicate
    if (name && name.trim() !== stream.name) {
      const existing = await Stream.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A stream with this name already exists" },
          { status: 409 }
        );
      }
      stream.name = name.trim();
    }

    if (subjects !== undefined) {
      stream.subjects = subjects;
    }

    await stream.save();

    void Subject; // Ensure Subject model is registered for populate
    const populated = await Stream.findById(id).populate("subjects");

    return NextResponse.json({ stream: populated });
  } catch (error) {
    console.error("Update stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/streams/[id] - Delete a stream (admin with isAdminStream or super admin)
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
    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      await connectDB();
      const admin = await User.findById(userId).select("isAdminStream").lean();
      if (!admin?.isAdminStream) {
        return NextResponse.json({ error: "You don't have permission to manage streams" }, { status: 403 });
      }
    }

    const { id } = await params;

    await connectDB();

    const stream = await Stream.findById(id);
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Check if any students are assigned to this stream
    const studentCount = await User.countDocuments({ stream: id });
    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete — ${studentCount} student${studentCount > 1 ? "s" : ""} are assigned to this stream. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await Stream.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
