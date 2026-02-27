import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendMail, otpEmailHTML } from "@/lib/mail";
import crypto from "crypto";

// POST /api/auth/forgot-password — Step 1: Send OTP to user's email
export async function POST(request: Request) {
  try {
    const { college_id } = await request.json();

    if (!college_id || !college_id.trim()) {
      return NextResponse.json(
        { error: "College ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ college_id: college_id.trim() });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this College ID" },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "No email is associated with this account. Contact your admin to reset your password." },
        { status: 400 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "This account is restricted. Contact your admin." },
        { status: 403 }
      );
    }

    // Rate limiting: max 1 OTP per 60 seconds
    const recentOTP = await OTP.findOne({
      user: user._id,
      purpose: "forgot_password",
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOTP) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting a new OTP" },
        { status: 429 }
      );
    }

    // Delete old OTPs
    await OTP.deleteMany({ user: user._id, purpose: "forgot_password" });

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();

    await OTP.create({
      user: user._id,
      code,
      purpose: "forgot_password",
      email: user.email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email
    await sendMail({
      to: user.email,
      subject: "Acadex — Password Reset Code",
      html: otpEmailHTML(user.name, code, "forgot_password"),
    });

    // Mask email
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      message: `OTP sent to ${maskedEmail}`,
      maskedEmail,
    });
  } catch (error) {
    console.error("Forgot password send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}

// PUT /api/auth/forgot-password — Step 2: Verify OTP and reset password
export async function PUT(request: Request) {
  try {
    const { college_id, code, newPassword, confirmPassword } =
      await request.json();

    if (!college_id || !code || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
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

    const user = await User.findOne({ college_id: college_id.trim() });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this College ID" },
        { status: 404 }
      );
    }

    // Find the OTP
    const otpRecord = await OTP.findOne({
      user: user._id,
      purpose: "forgot_password",
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new one." },
        { status: 404 }
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (otpRecord.code !== code.toString().trim()) {
      return NextResponse.json(
        { error: "Invalid OTP code" },
        { status: 400 }
      );
    }

    // Hash new password
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(user._id, {
      password_hash: passwordHash,
      must_change_password: false,
    });

    // Clean up OTPs
    await OTP.deleteMany({ user: user._id, purpose: "forgot_password" });

    return NextResponse.json({
      message: "Password reset successfully! You can now log in.",
    });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
