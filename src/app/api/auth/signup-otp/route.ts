import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AccessRequest from "@/models/AccessRequest";
import OTP from "@/models/OTP";
import { sendMail, otpEmailHTML } from "@/lib/mail";
import { isAllowedEmailDomain, ALLOWED_EMAIL_DOMAINS } from "@/lib/validations";
import crypto from "crypto";

// POST /api/auth/signup-otp — Send OTP to email for signup verification (public)
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Domain check
    if (!isAllowedEmailDomain(trimmedEmail)) {
      return NextResponse.json(
        { error: `Email must be from one of: ${ALLOWED_EMAIL_DOMAINS.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email is already used by an existing user
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }

    // Check if email is already in a pending access request
    const existingRequest = await AccessRequest.findOne({
      email: trimmedEmail,
      status: "pending",
    });
    if (existingRequest) {
      return NextResponse.json(
        { error: "An access request with this email is already pending" },
        { status: 409 }
      );
    }

    // Rate limiting: max 1 OTP per 60 seconds for this email
    const recentOTP = await OTP.findOne({
      email: trimmedEmail,
      purpose: "signup_verification",
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOTP) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting a new OTP" },
        { status: 429 }
      );
    }

    // Delete old OTPs for this email
    await OTP.deleteMany({ email: trimmedEmail, purpose: "signup_verification" });

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();

    await OTP.create({
      user: null,
      code,
      purpose: "signup_verification",
      email: trimmedEmail,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email
    await sendMail({
      to: trimmedEmail,
      subject: "Acadex — Email Verification Code",
      html: otpEmailHTML(name || "User", code, "signup_verification"),
    });

    // Mask email
    const maskedEmail = trimmedEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      message: `OTP sent to ${maskedEmail}`,
      maskedEmail,
    });
  } catch (error) {
    console.error("Signup OTP send error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}

// PUT /api/auth/signup-otp — Verify the signup OTP (public)
export async function PUT(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and OTP code are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    await connectDB();

    const otpRecord = await OTP.findOne({
      email: trimmedEmail,
      purpose: "signup_verification",
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

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return NextResponse.json({
      message: "Email verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Signup OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
