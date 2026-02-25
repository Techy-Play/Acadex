import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";

// Ensure models are registered for populate
void Stream;
void Section;

// GET /api/admin/students/[id] - Get full user details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await connectDB();

    const user = await User.findById(id)
      .select("-password_hash")
      .populate("stream", "name")
      .populate("section", "name")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get student details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/students/[id] - Update a student's stream/section
export async function PATCH(
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

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Protect super admin from being modified by non-super admins
    if (user.isSuperAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot modify the super admin account" },
        { status: 403 }
      );
    }

    // Section admin can only update users in their section
    if (!isSuperAdmin && user.section?.toString() !== adminSection) {
      return NextResponse.json(
        { error: "You can only edit users in your section" },
        { status: 403 }
      );
    }

    // Update stream if provided
    if (body.stream !== undefined) {
      user.stream = body.stream || null;
    }

    // Update section if provided (only super admin can change sections)
    if (body.section !== undefined && isSuperAdmin) {
      user.section = body.section || null;
    }

    // Only super admin can change roles
    if (body.role !== undefined && isSuperAdmin) {
      user.role = body.role;
    }

    // Update status if provided
    if (body.status !== undefined && ["active", "banned", "suspended"].includes(body.status)) {
      // Cannot change super admin status
      if (user.isSuperAdmin) {
        return NextResponse.json(
          { error: "Cannot change super admin status" },
          { status: 403 }
        );
      }
      user.status = body.status;
    }

    await user.save();

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "STUDENT_UPDATED",
      details: `Updated student: ${user.name} (${user.college_id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/students/[id] - Delete a student
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
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (user._id.toString() === adminId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Protect super admin from being deleted
    if (user.isSuperAdmin) {
      return NextResponse.json(
        { error: "The super admin account cannot be deleted" },
        { status: 403 }
      );
    }

    // Only super admin can delete other admins
    if (user.role === "admin" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admin can remove other admins" },
        { status: 403 }
      );
    }

    // Section admin can only delete users in their section
    if (!isSuperAdmin && user.section?.toString() !== adminSection) {
      return NextResponse.json(
        { error: "You can only delete users in your section" },
        { status: 403 }
      );
    }

    await User.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "STUDENT_DELETED",
      details: `Deleted user: ${user.name} (${user.college_id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
