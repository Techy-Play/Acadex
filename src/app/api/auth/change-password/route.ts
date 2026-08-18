/**
 * @module API/Auth/ChangePassword
 * @description Authenticated. Forces the current user to set a new password
 * (typically used on first login with a temporary password). Re-issues JWT.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/auth";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword, confirmPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    await connectDB();

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        password_hash: passwordHash,
        must_change_password: false,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: "PASSWORD_CHANGED",
      details: `User ${user.name} changed their password`,
      section: user.section || null,
    });

    // Issue new token (must_change_password is now false)
    const token = signToken({
      userId: user._id.toString(),
      collegeId: user.college_id,
      role: user.role,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin || false,
      section: user.section ? user.section.toString() : null,
      assignedSections: user.assignedSections?.map((s: unknown) => String(s)) || [],
      semester: user.semester || null,
      isStudent: user.isStudent !== false,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("acadex-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
