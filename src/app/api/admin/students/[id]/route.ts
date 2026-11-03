/**
 * @module API/Admin/Students/[id]
 * @description Admin operations on a single student / admin.
 * - GET    → full user details (scoped to assigned sections for sub-admins).
 * - PATCH  → update user fields (stream, section, role, assignedSections, status).
 * - DELETE → remove the student account.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import AdminRequest from "@/models/AdminRequest";
import Notification from "@/models/Notification";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";

// Ensure models are registered for populate
void Stream;
void Section;

// GET /api/admin/students/[id] - Get full user details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
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

    // Sub-admins can only view users from their assigned sections
    if (!authUser.isSuperAdmin) {
      const userSecId = user.section ? (typeof user.section === "object" ? String((user.section as { _id: unknown })._id) : String(user.section)) : null;
      if (!canAdminManageSection(authUser, userSecId)) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view this user" },
          { status: 403 }
        );
      }
    }

    // Normalize assignedSections to array of { _id: string, name: string }
    const assignedSectionsFormatted = Array.isArray(user.assignedSections)
      ? user.assignedSections.map((s: unknown) => {
          if (typeof s === "object" && s !== null && "_id" in s) {
            const secObj = s as { _id: unknown; name?: string };
            return {
              _id: String(secObj._id),
              name: secObj.name || "",
            };
          }
          return { _id: String(s), name: "" };
        })
      : [];

    return NextResponse.json({
      user: {
        ...user,
        _id: user._id.toString(),
        assignedSections: assignedSectionsFormatted,
      },
    });
  } catch (error) {
    console.error("Get student details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/students/[id] - Update a student's stream/section/role/assignedSections
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Protect super admin from being modified by non-super admins
    if (user.isSuperAdmin && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot modify the super admin account" },
        { status: 403 }
      );
    }

    // Sub-admins can only modify users from their assigned sections
    if (!authUser.isSuperAdmin) {
      const userSectionStr = user.section ? user.section.toString() : null;
      if (!canAdminManageSection(authUser, userSectionStr)) {
        return NextResponse.json(
          { error: "You can only modify users from your assigned sections" },
          { status: 403 }
        );
      }
    }

    // Admin changing their OWN section/stream/semester → requires super admin approval
    const isChangingSectionStream =
      body.stream !== undefined ||
      body.section !== undefined ||
      body.semester !== undefined ||
      body.assignedSections !== undefined ||
      body.isStudent !== undefined;
    const isEditingSelf = id === authUser.userId;
    const isTargetAdmin = user.role === "admin";

    if (
      !authUser.isSuperAdmin &&
      isChangingSectionStream &&
      isTargetAdmin &&
      isEditingSelf
    ) {
      await AdminRequest.create({
        type: "change_section_stream",
        requestedBy: authUser.userId,
        targetUser: user._id,
        data: {
          newStream: body.stream !== undefined ? body.stream || null : undefined,
          newSection: body.section !== undefined ? body.section || null : undefined,
          newSemester:
            body.semester !== undefined
              ? body.semester
                ? Number(body.semester)
                : null
              : undefined,
          newAssignedSections:
            body.assignedSections !== undefined ? body.assignedSections : undefined,
          newIsStudent:
            body.isStudent !== undefined ? body.isStudent : undefined,
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

    // Validate Stream if provided
    if (body.stream !== undefined) {
      if (body.stream) {
        const streamExists = await Stream.findById(body.stream);
        if (!streamExists) {
          return NextResponse.json(
            { error: "Selected stream does not exist" },
            { status: 400 }
          );
        }
      }
      user.stream = body.stream ? new mongoose.Types.ObjectId(body.stream) : null;
    }

    // Validate Section if provided
    if (body.section !== undefined) {
      const targetSec = body.section || null;
      if (targetSec) {
        const sectionExists = await Section.findById(targetSec);
        if (!sectionExists) {
          return NextResponse.json(
            { error: "Selected section does not exist" },
            { status: 400 }
          );
        }
        // Sub-admin can only assign sections they manage
        if (!authUser.isSuperAdmin && !canAdminManageSection(authUser, targetSec)) {
          return NextResponse.json(
            { error: "You cannot assign users to a section you do not manage" },
            { status: 403 }
          );
        }
      }
      user.section = targetSec ? new mongoose.Types.ObjectId(targetSec) : null;
    }

    // Update semester if provided
    if (body.semester !== undefined) {
      user.semester = body.semester ? Number(body.semester) : null;
    }

    // Reject privilege escalation attempts
    if (body.isSuperAdmin !== undefined && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmin can modify superadmin status" },
        { status: 403 }
      );
    }

    if (body.role !== undefined && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmin can modify user roles" },
        { status: 403 }
      );
    }

    if (body.assignedSections !== undefined && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmin can manage assigned sections" },
        { status: 403 }
      );
    }

    if (body.isStudent !== undefined && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmin can modify isStudent flag" },
        { status: 403 }
      );
    }

    // Role changes (Superadmin only)
    if (body.role !== undefined && authUser.isSuperAdmin) {
      user.role = body.role;
      if (body.role === "student") {
        user.assignedSections = [];
      }
    }

    // Multi-section assignments (Superadmin only)
    if (body.assignedSections !== undefined && authUser.isSuperAdmin) {
      if (!Array.isArray(body.assignedSections)) {
        return NextResponse.json(
          { error: "Assigned sections must be an array" },
          { status: 400 }
        );
      }

      const rawIds: string[] = Array.from(
        new Set<string>(
          body.assignedSections
            .map((s: unknown) =>
              typeof s === "object" && s !== null && "_id" in s
                ? String((s as { _id: unknown })._id)
                : String(s)
            )
            .map((s: string) => s.trim())
            .filter((s: string): s is string => Boolean(s))
        )
      );

      const invalidIds = rawIds.filter((idStr) => !mongoose.Types.ObjectId.isValid(idStr));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "One or more section IDs have an invalid format" },
          { status: 400 }
        );
      }

      if (rawIds.length > 0) {
        const foundSections = await Section.find({ _id: { $in: rawIds } })
          .select("_id")
          .lean();
        if (foundSections.length !== rawIds.length) {
          return NextResponse.json(
            { error: "One or more assigned sections do not exist" },
            { status: 400 }
          );
        }
      }

      user.assignedSections = rawIds.map((idStr) => new mongoose.Types.ObjectId(idStr));

      // If user's primary section is not set or not in assignedSections, default to first assigned section
      if (
        rawIds.length > 0 &&
        (!user.section || !rawIds.includes(user.section.toString()))
      ) {
        user.section = new mongoose.Types.ObjectId(rawIds[0]);
      }
    }

    if (body.isStudent !== undefined && authUser.isSuperAdmin) {
      user.isStudent = body.isStudent;
    }

    // Update status if provided
    if (
      body.status !== undefined &&
      ["active", "banned", "suspended"].includes(body.status)
    ) {
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
      user: authUser.userId,
      action: "STUDENT_UPDATED",
      details: `Updated ${user.role}: ${user.name} (${user.college_id})`,
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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const { id } = await params;

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (user._id.toString() === authUser.userId) {
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
    if (user.role === "admin" && !authUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admin can remove other admins" },
        { status: 403 }
      );
    }

    // Sub-admins can only delete users from their assigned sections
    if (!authUser.isSuperAdmin) {
      const userSectionStr = user.section ? user.section.toString() : null;
      if (!canAdminManageSection(authUser, userSectionStr)) {
        return NextResponse.json(
          { error: "You can only delete users from your assigned sections" },
          { status: 403 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    // Log activity
    await ActivityLog.create({
      user: authUser.userId,
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
