/**
 * @module API/Admin/AccessRequests
 * @description Admin management of student access requests.
 * - GET   → lists pending/reviewed requests (section-scoped for sub-admins).
 * - PATCH → approves or denies a request; sends email with temp password on approval.
 * - DELETE → removes access-request records.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import { sendMail, approvalEmailHTML, denialEmailHTML } from "@/lib/mail";

// Ensure models are registered
void Stream;
void Section;

function generateTempPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// GET /api/admin/access-requests — List all access requests
export async function GET(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    await connectDB();

    // Section admin only sees requests for their section
    const filter: Record<string, unknown> = {};
    if (!isSuperAdmin && adminSection) {
      filter.section = adminSection;
    }

    const requests = await AccessRequest.find(filter)
      .populate("stream", "name")
      .populate("section", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Check which college_ids already exist in Users collection
    const collegeIds = requests.map((r) => r.college_id);
    const existingUsers = await User.find(
      { college_id: { $in: collegeIds } },
      { college_id: 1 }
    ).lean();
    const existingIdSet = new Set(existingUsers.map((u) => u.college_id));

    const enrichedRequests = requests.map((r) => ({
      ...r,
      duplicateId: existingIdSet.has(r.college_id),
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    console.error("List access requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/access-requests — Approve or deny a request
export async function PATCH(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, role, admin_note } = body;

    if (!requestId || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "requestId and action (approve/deny) are required" },
        { status: 400 }
      );
    }

    const approvedRole: "student" | "admin" = role === "admin" ? "admin" : "student";
    if (action === "approve" && approvedRole === "admin" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admin can approve a request as admin" },
        { status: 403 }
      );
    }

    await connectDB();

    const accessReq = await AccessRequest.findById(requestId);
    if (!accessReq) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    if (accessReq.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${accessReq.status}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Check if user with same college_id already exists
      const existingUser = await User.findOne({ college_id: accessReq.college_id });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this College ID already exists" },
          { status: 409 }
        );
      }

      const normalizedEmail = accessReq.email?.trim().toLowerCase();
      if (normalizedEmail) {
        const existingEmailUser = await User.findOne({ email: normalizedEmail });
        if (existingEmailUser) {
          return NextResponse.json(
            { error: "A user with this email already exists" },
            { status: 409 }
          );
        }
      }

      // Generate temp password & create user
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await User.create({
        name: accessReq.name,
        college_id: accessReq.college_id,
        email: normalizedEmail || null,
        password_hash: passwordHash,
        role: approvedRole,
        stream: accessReq.stream,
        section: accessReq.section,
        semester: accessReq.semester || null,
        must_change_password: true,
      });

      // Update request status
      accessReq.status = "approved";
      accessReq.admin_note = (admin_note || "").slice(0, 500);
      await accessReq.save();

      // Log activity
      await ActivityLog.create({
        user: adminId!,
        action: "ACCESS_REQUEST_APPROVED",
        details: `Approved access for ${accessReq.name} (${accessReq.college_id}) as ${approvedRole}`,
        section: accessReq.section || null,
      });

      // Send approval email
      try {
        await sendMail({
          to: accessReq.email,
          subject: "✅ Acadex — Account Approved!",
          html: approvalEmailHTML(accessReq.name, accessReq.college_id, tempPassword),
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the request just because email failed
      }

      return NextResponse.json({
        success: true,
        message: `Approved! ${approvedRole} account created for ${accessReq.name}. Temp password: ${tempPassword}`,
        tempPassword,
        role: approvedRole,
      });
    } else {
      // Deny
      accessReq.status = "denied";
      accessReq.admin_note = (admin_note || "").slice(0, 500);
      await accessReq.save();

      // Log activity
      await ActivityLog.create({
        user: adminId!,
        action: "ACCESS_REQUEST_DENIED",
        details: `Denied access for ${accessReq.name} (${accessReq.college_id})`,
        section: accessReq.section || null,
      });

      // Send denial email
      try {
        await sendMail({
          to: accessReq.email,
          subject: "Acadex — Access Request Update",
          html: denialEmailHTML(accessReq.name, admin_note || ""),
        });
      } catch (emailError) {
        console.error("Failed to send denial email:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: `Request from ${accessReq.name} has been denied.`,
      });
    }
  } catch (error) {
    console.error("Handle access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/access-requests — Delete a request
export async function DELETE(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "clear-older") {
      await connectDB();
      const filter: Record<string, unknown> = {
        status: { $in: ["approved", "denied"] },
      };
      if (!isSuperAdmin && adminSection) {
        filter.section = adminSection;
      }
      const result = await AccessRequest.deleteMany(filter);
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

    const deleted = await AccessRequest.findByIdAndDelete(requestId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
