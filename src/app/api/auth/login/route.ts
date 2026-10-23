/**
 * @module API/Auth/Login
 * @description Public. Authenticates a user by college_id + password
 * (validated with `loginSchema`), issues a JWT cookie on success.
 * Logs successful authentication and security failure events to AuditLog.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { logUserActivity, logSecurityFailure } from "@/lib/audit-logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      await logSecurityFailure({
        action: "AUTH_FAILURE",
        identifier: body?.college_id || "unknown",
        reason: parsed.error.issues[0].message,
        req: request,
      });

      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { college_id, password } = parsed.data;

    await connectDB();

    // Find user by college_id
    const user = await User.findOne({ college_id });
    if (!user) {
      await logSecurityFailure({
        action: "AUTH_FAILURE",
        identifier: college_id,
        reason: "User not found with provided College ID",
        req: request,
      });

      return NextResponse.json(
        { error: "Invalid college ID or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await logSecurityFailure({
        action: "AUTH_FAILURE",
        identifier: college_id,
        reason: "Incorrect password attempt",
        req: request,
      });

      return NextResponse.json(
        { error: "Invalid college ID or password" },
        { status: 401 }
      );
    }

    // Check if account is banned or suspended
    if (user.status === "banned") {
      await logSecurityFailure({
        action: "AUTH_FAILURE",
        identifier: college_id,
        reason: "Account is banned",
        req: request,
      });

      return NextResponse.json(
        { error: "Your account has been banned. Please contact the administrator." },
        { status: 403 }
      );
    }
    if (user.status === "suspended") {
      await logSecurityFailure({
        action: "AUTH_FAILURE",
        identifier: college_id,
        reason: "Account is suspended",
        req: request,
      });

      return NextResponse.json(
        { error: "Your account has been suspended. Please contact the administrator." },
        { status: 403 }
      );
    }

    // Create JWT token
    const token = signToken({
      userId: user._id.toString(),
      collegeId: user.college_id,
      role: user.role,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin || false,
      section: user.section ? user.section.toString() : null,
      assignedSections: user.assignedSections?.map((s: unknown) => String(s)) || [],
      semester: user.semester || null,
      isStudent: user.isStudent !== false, // default true
    });

    // 1. Log to structured AuditLog collection
    await logUserActivity({
      user: {
        userId: user._id.toString(),
        name: user.name,
        collegeId: user.college_id,
        role: user.isSuperAdmin ? "superadmin" : user.role,
      },
      action: "USER_LOGIN",
      actionCategory: "auth",
      description: `User ${user.name} (${user.college_id}) signed in successfully`,
      target: {
        id: user._id.toString(),
        type: "user",
        name: user.name,
        section: user.section || null,
      },
      route: user.role === "admin" ? "/admin" : "/user/dashboard",
      metadata: {
        role: user.role,
        isSuperAdmin: Boolean(user.isSuperAdmin),
      },
      req: request,
    });

    // 2. Legacy ActivityLog entry for backward compatibility
    try {
      await ActivityLog.create({
        user: user._id,
        action: "LOGIN",
        details: `User ${user.name} (${user.college_id}) logged in`,
        section: user.section || null,
      });
    } catch {
      // ignore legacy table errors
    }

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        college_id: user.college_id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        isStudent: user.isStudent !== false,
        must_change_password: user.must_change_password,
      },
    });

    response.cookies.set("acadex-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
