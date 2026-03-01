/**
 * @module API/Auth/Login
 * @description Public. Authenticates a user by college_id + password
 * (validated with `loginSchema`), issues a JWT cookie on success.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
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
      return NextResponse.json(
        { error: "Invalid college ID or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid college ID or password" },
        { status: 401 }
      );
    }

    // Check if account is banned or suspended
    if (user.status === "banned") {
      return NextResponse.json(
        { error: "Your account has been banned. Please contact the administrator." },
        { status: 403 }
      );
    }
    if (user.status === "suspended") {
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
      semester: user.semester || null,
    });

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: "LOGIN",
      details: `User ${user.name} (${user.college_id}) logged in`,
      section: user.section || null,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        college_id: user.college_id,
        role: user.role,
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
