import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Section from "@/models/Section";
import User from "@/models/User";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import Practical from "@/models/Practical";

// PUT /api/sections/[id] — update section name (super admin or admin with isAdminSection)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can manage sections" },
        { status: 403 }
      );
    }

    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      await connectDB();
      const admin = await User.findById(userId).select("isAdminSection").lean();
      if (!admin?.isAdminSection) {
        return NextResponse.json(
          { error: "You don't have permission to manage sections" },
          { status: 403 }
        );
      }
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Section name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const section = await Section.findById(id);
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name (case-insensitive, exclude self)
    const duplicate = await Section.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A section with this name already exists" },
        { status: 409 }
      );
    }

    section.name = name.trim();
    await section.save();

    return NextResponse.json({ success: true, section });
  } catch (error) {
    console.error("Update section error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sections/[id] — delete section (super admin or admin with isAdminSection)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can manage sections" },
        { status: 403 }
      );
    }

    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      await connectDB();
      const admin = await User.findById(userId).select("isAdminSection").lean();
      if (!admin?.isAdminSection) {
        return NextResponse.json(
          { error: "You don't have permission to manage sections" },
          { status: 403 }
        );
      }
    }

    const { id } = await params;

    await connectDB();

    const section = await Section.findById(id);
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // Block deletion if users are assigned to this section
    const userCount = await User.countDocuments({ section: id });
    if (userCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${userCount} user(s) are assigned to this section. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Block deletion if content references this section
    const noteCount = await Note.countDocuments({ section: id });
    const assignmentCount = await Assignment.countDocuments({ section: id });
    const practicalCount = await Practical.countDocuments({ section: id });
    const contentCount = noteCount + assignmentCount + practicalCount;

    if (contentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${contentCount} content item(s) are linked to this section.`,
        },
        { status: 400 }
      );
    }

    await Section.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Section deleted" });
  } catch (error) {
    console.error("Delete section error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
