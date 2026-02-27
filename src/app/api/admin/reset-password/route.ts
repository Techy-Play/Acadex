import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

// POST /api/admin/reset-password - Reset a user's password
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate temporary password
    const tempPassword =
      "temp" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await User.findByIdAndUpdate(userId, {
      password_hash: passwordHash,
      must_change_password: true,
    });

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "PASSWORD_RESET",
      details: `Reset password for: ${user.name} (${user.college_id})`,
      section: user.section || null,
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      message: `Temporary password generated for ${user.name}. They will be required to change it on next login.`,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
