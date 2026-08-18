/**
 * @module API/Admin/Students/[id]
 * @description Admin operations on a single student.
 * - GET   → full user details.
 * - PATCH → update user fields.
 * - DELETE → remove the student account.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import AdminRequest from "@/models/AdminRequest";
import Notification from "@/models/Notification";

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
      .populate("assignedSections", "name")
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

    // Sub-admins can only modify users from their own section
    if (!isSuperAdmin && adminSection) {
      const userSection = user.section?.toString();
      if (userSection !== adminSection) {
        return NextResponse.json(
          { error: "You can only modify users from your own section" },
          { status: 403 }
        );
      }
    }

    // Admin changing their OWN section/stream/semester → requires super admin approval
    const isChangingSectionStream =
      body.stream !== undefined || body.section !== undefined || body.semester !== undefined || body.assignedSections !== undefined || body.isStudent !== undefined;
    const isEditingSelf = id === adminId;
    const isTargetAdmin = user.role === "admin";

    if (
      !isSuperAdmin &&
      isChangingSectionStream &&
      isTargetAdmin &&
      isEditingSelf
    ) {
      // Create approval request instead of applying directly
      await AdminRequest.create({
        type: "change_section_stream",
        requestedBy: adminId!,
        targetUser: user._id,
        data: {
          newStream: body.stream !== undefined ? body.stream || null : undefined,
          newSection: body.section !== undefined ? body.section || null : undefined,
          newSemester: body.semester !== undefined ? (body.semester ? Number(body.semester) : null) : undefined,
          newAssignedSections: body.assignedSections !== undefined ? body.assignedSections : undefined,
          newIsStudent: body.isStudent !== undefined ? body.isStudent : undefined,
        },
      });

      // Notify super admins
      const superAdmins = await User.find({ isSuperAdmin: true })
        .select("_id")
        .lean();
      if (superAdmins.length > 0) {
        await Notification.create({
          type: "new_access_request",
          title: "Section/Stream/Semester Change Request",
          message: `${user.name} requested to change their section/stream/semester`,
          link: "/admin/admin-requests",
          targetUsers: superAdmins.map((sa) => sa._id),
        });
      }

      return NextResponse.json({
        success: true,
        pending: true,
        message:
          "Section/stream/semester change request sent to super admin for approval.",
      });
    }

    // Update stream if provided
    if (body.stream !== undefined) {
      user.stream = body.stream || null;
    }

    // Update section if provided (super admin can always; sub-admin can for non-self)
    if (body.section !== undefined) {
      if (isSuperAdmin || !isEditingSelf) {
        user.section = body.section || null;
      }
    }

    // Update semester if provided
    if (body.semester !== undefined) {
      user.semester = body.semester ? Number(body.semester) : null;
    }

    // Only super admin can change roles
    if (body.role !== undefined && isSuperAdmin) {
      user.role = body.role;
    }

    if (body.assignedSections !== undefined && isSuperAdmin) {
      user.assignedSections = body.assignedSections;
    }

    if (body.isStudent !== undefined && isSuperAdmin) {
      user.isStudent = body.isStudent;
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

    // Migrate profile picture in Google Drive if stream/semester/section changed
    const { migrateUserProfilePicture } = await import("@/lib/profile-migration");
    void migrateUserProfilePicture(user._id.toString());

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "STUDENT_UPDATED",
      details: `Updated student: ${user.name} (${user.college_id})`,
      section: user.section || null,
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

    // Sub-admins can only delete users from their own section
    if (!isSuperAdmin && adminSection) {
      const userSection = user.section?.toString();
      if (userSection !== adminSection) {
        return NextResponse.json(
          { error: "You can only delete users from your own section" },
          { status: 403 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "STUDENT_DELETED",
      details: `Deleted user: ${user.name} (${user.college_id})`,
      section: user.section || null,
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
