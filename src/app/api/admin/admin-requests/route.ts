/**
 * @module API/Admin/AdminRequests
 * @description Manage admin-role requests (promote / revoke).
 * - GET   → lists admin requests (super admin sees all; sub-admin sees own).
 * - PATCH → approves or denies an admin request.
 * - DELETE → removes admin-request records.
 */
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import AdminRequest from "@/models/AdminRequest";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// Ensure models are registered for populate
void Stream;
void Section;

// GET /api/admin/admin-requests — List admin requests
// Super admin: all requests. Sub-admin: only their own.
export async function GET(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin =
      request.headers.get("x-user-is-super-admin") === "true";
    const adminId = request.headers.get("x-user-id");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (!isSuperAdmin) {
      filter.requestedBy = adminId;
    }

    const requests = await AdminRequest.find(filter)
      .populate("requestedBy", "name college_id")
      .populate("targetUser", "name college_id role")
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with stream/section names from the data field
    const streamIds = new Set<string>();
    const sectionIds = new Set<string>();
    for (const r of requests) {
      const d = r.data as Record<string, unknown>;
      if (d.stream) streamIds.add(d.stream as string);
      if (d.section) sectionIds.add(d.section as string);
      if (d.assignedSections) {
        (d.assignedSections as string[]).forEach(s => sectionIds.add(s));
      }
      if (d.newStream) streamIds.add(d.newStream as string);
      if (d.newSection) sectionIds.add(d.newSection as string);
      if (d.newAssignedSections) {
        (d.newAssignedSections as string[]).forEach(s => sectionIds.add(s));
      }
    }

    const [streamsArr, sectionsArr] = await Promise.all([
      streamIds.size > 0
        ? Stream.find({ _id: { $in: [...streamIds] } })
            .select("_id name")
            .lean()
        : [],
      sectionIds.size > 0
        ? Section.find({ _id: { $in: [...sectionIds] } })
            .select("_id name")
            .lean()
        : [],
    ]);

    const streamMap: Record<string, string> = {};
    for (const s of streamsArr) streamMap[s._id.toString()] = s.name;
    const sectionMap: Record<string, string> = {};
    for (const s of sectionsArr) sectionMap[s._id.toString()] = s.name;

    const enriched = requests.map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        ...r,
        _streamName: d.stream
          ? streamMap[d.stream as string] || null
          : d.newStream
          ? streamMap[d.newStream as string] || null
          : null,
        _sectionName: d.section
          ? sectionMap[d.section as string] || null
          : d.newSection
          ? sectionMap[d.newSection as string] || null
          : null,
        _assignedSectionsNames: d.assignedSections
          ? (d.assignedSections as string[]).map(s => sectionMap[s]).filter(Boolean)
          : d.newAssignedSections
          ? (d.newAssignedSections as string[]).map(s => sectionMap[s]).filter(Boolean)
          : [],
        _isStudent: d.isStudent !== undefined ? d.isStudent : d.newIsStudent !== undefined ? d.newIsStudent : undefined,
      };
    });

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error("List admin requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/admin-requests — Approve or deny (super admin only)
export async function PATCH(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin =
      request.headers.get("x-user-is-super-admin") === "true";
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin" || !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admin can approve/deny admin requests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action, admin_note } = body;

    if (!requestId || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and action (approve/deny) are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const adminReq = await AdminRequest.findById(requestId);
    if (!adminReq) {
      return NextResponse.json(
        { error: "Admin request not found" },
        { status: 404 }
      );
    }

    if (adminReq.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${adminReq.status}` },
        { status: 400 }
      );
    }

    const data = adminReq.data as Record<string, unknown>;

    if (action === "approve") {
      if (adminReq.type === "create_admin") {
        // Check if college_id already exists
        const existing = await User.findOne({
          college_id: data.college_id as string,
        });
        if (existing) {
          return NextResponse.json(
            { error: "A user with this College ID already exists" },
            { status: 409 }
          );
        }

        const requestedEmail =
          typeof data.email === "string" && data.email.trim()
            ? data.email.trim().toLowerCase()
            : null;
        if (requestedEmail) {
          const existingByEmail = await User.findOne({ email: requestedEmail });
          if (existingByEmail) {
            return NextResponse.json(
              { error: "A user with this email already exists" },
              { status: 409 }
            );
          }
        }

        // Create the admin user
        await User.create({
          name: data.name as string,
          college_id: data.college_id as string,
          email: requestedEmail,
          password_hash: data.password_hash as string,
          role: "admin",
          stream: (data.stream as string) || null,
          section: (data.section as string) || null,
          semester: (data.semester as number) || null,
          must_change_password: true,
          ...(data.isStudent !== undefined && { isStudent: data.isStudent as boolean }),
          ...(data.assignedSections && (data.assignedSections as string[]).length > 0 && { assignedSections: data.assignedSections as string[] }),
        });

        await ActivityLog.create({
          user: adminId!,
          action: "ADMIN_REQUEST_APPROVED",
          details: `Approved admin creation: ${data.name} (${data.college_id})`,
          section: (data.section as string) || null,
        });

        // Notify the requesting admin
        await Notification.create({
          type: "admin_message",
          title: "Admin Request Approved",
          message: `Your request to create admin "${data.name}" has been approved.`,
          link: "/admin/users",
          targetUsers: [adminReq.requestedBy],
        });
      } else if (adminReq.type === "change_section_stream") {
        const user = await User.findById(adminReq.targetUser);
        if (!user) {
          return NextResponse.json(
            { error: "Target user no longer exists" },
            { status: 404 }
          );
        }

        if (data.newStream !== undefined) {
          user.stream = data.newStream
            ? new mongoose.Types.ObjectId(data.newStream as string)
            : null;
        }
        if (data.newSection !== undefined) {
          user.section = data.newSection
            ? new mongoose.Types.ObjectId(data.newSection as string)
            : null;
        }
        if (data.newSemester !== undefined) {
          user.semester = data.newSemester ? Number(data.newSemester) : null;
        }
        if (data.newAssignedSections !== undefined) {
          user.assignedSections = data.newAssignedSections as string[];
        }
        if (data.newIsStudent !== undefined) {
          user.isStudent = data.newIsStudent as boolean;
        }
        await user.save();

        await ActivityLog.create({
          user: adminId!,
          action: "ADMIN_REQUEST_APPROVED",
          details: `Approved section/stream change for ${user.name} (${user.college_id})`,
          section: (data.newSection as string) || user.section || null,
        });

        // Notify the requesting admin
        await Notification.create({
          type: "admin_message",
          title: "Section/Stream Change Approved",
          message: `Your request to change section/stream has been approved.`,
          link: "/admin/users",
          targetUsers: [adminReq.requestedBy],
        });
      }

      adminReq.status = "approved";
      adminReq.admin_note = (admin_note || "").slice(0, 500);
      await adminReq.save();

      return NextResponse.json({
        success: true,
        message: "Request approved successfully",
      });
    } else {
      // Deny
      adminReq.status = "denied";
      adminReq.admin_note = (admin_note || "").slice(0, 500);
      await adminReq.save();

      await ActivityLog.create({
        user: adminId!,
        action: "ADMIN_REQUEST_DENIED",
        details: `Denied admin request: ${adminReq.type} by ${adminReq.requestedBy}`,
        section: (data.section as string) || (data.newSection as string) || null,
      });

      // Notify the requesting admin
      const denyMessage =
        adminReq.type === "create_admin"
          ? `Your request to create admin "${data.name}" was denied.${admin_note ? ` Note: ${admin_note}` : ""}`
          : `Your section/stream change request was denied.${admin_note ? ` Note: ${admin_note}` : ""}`;

      await Notification.create({
        type: "admin_message",
        title: "Admin Request Denied",
        message: denyMessage,
        link: "/admin/users",
        targetUsers: [adminReq.requestedBy],
      });

      return NextResponse.json({
        success: true,
        message: "Request denied",
      });
    }
  } catch (error) {
    console.error("Handle admin request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/admin-requests — Delete a request (super admin only)
export async function DELETE(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin =
      request.headers.get("x-user-is-super-admin") === "true";

    if (userRole !== "admin" || !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admin can delete admin requests" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "clear-older") {
      await connectDB();
      const result = await AdminRequest.deleteMany({ status: { $in: ["approved", "denied"] } });
      return NextResponse.json({ success: true, deletedCount: result.deletedCount || 0 });
    }

    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = await AdminRequest.findByIdAndDelete(requestId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Admin request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete admin request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
