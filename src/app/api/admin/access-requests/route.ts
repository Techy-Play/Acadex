import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import User from "@/models/User";
import Stream from "@/models/Stream";
import ActivityLog from "@/models/ActivityLog";
import { sendMail, approvalEmailHTML, denialEmailHTML } from "@/lib/mail";

// Ensure models are registered
void Stream;

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

    await connectDB();

    const requests = await AccessRequest.find()
      .populate("stream", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
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

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

      // Generate temp password & create user
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await User.create({
        name: accessReq.name,
        college_id: accessReq.college_id,
        password_hash: passwordHash,
        role: "student",
        stream: accessReq.stream,
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
        details: `Approved access for ${accessReq.name} (${accessReq.college_id})`,
      });

      // Send approval email
      try {
        await sendMail({
          to: accessReq.email,
          subject: "✅ Section C Hub — Account Approved!",
          html: approvalEmailHTML(accessReq.name, accessReq.college_id, tempPassword),
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the request just because email failed
      }

      return NextResponse.json({
        success: true,
        message: `Approved! Account created for ${accessReq.name}. Temp password: ${tempPassword}`,
        tempPassword,
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
      });

      // Send denial email
      try {
        await sendMail({
          to: accessReq.email,
          subject: "Section C Hub — Access Request Update",
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

    const { searchParams } = new URL(request.url);
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
