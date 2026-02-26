import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import { sendMail, otpEmailHTML } from "@/lib/mail";
import { isAllowedEmailDomain, ALLOWED_EMAIL_DOMAINS } from "@/lib/validations";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { purpose, newEmail } = await request.json();

    if (!purpose || !["password_change", "email_change"].includes(purpose)) {
      return NextResponse.json(
        { error: "Invalid purpose. Must be 'password_change' or 'email_change'" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For email change, require newEmail and check the user has a current email to send OTP to
    if (purpose === "email_change") {
      if (!newEmail || !newEmail.trim()) {
        return NextResponse.json(
          { error: "New email is required for email change" },
          { status: 400 }
        );
      }
      // Email domain validation
      if (!isAllowedEmailDomain(newEmail.trim())) {
        return NextResponse.json(
          { error: `Email must be from one of: ${ALLOWED_EMAIL_DOMAINS.join(", ")}` },
          { status: 400 }
        );
      }
      // Check if new email is already used by another user
      const existingUser = await User.findOne({ email: newEmail.toLowerCase().trim(), _id: { $ne: userId } });
      if (existingUser) {
        return NextResponse.json(
          { error: "This email is already in use by another account" },
          { status: 409 }
        );
      }
    }

    // Determine which email to send OTP to
    const targetEmail = purpose === "email_change" && user.email
      ? user.email // Send to current email for verification
      : user.email;

    if (!targetEmail) {
      // If user has no email, for email_change purpose, send to the new email
      if (purpose === "email_change" && newEmail) {
        // Send OTP to new email directly (first time setup)
      } else {
        return NextResponse.json(
          { error: "No email address found. Please set your email first." },
          { status: 400 }
        );
      }
    }

    const sendTo = targetEmail || newEmail;

    // Rate limiting: max 1 OTP per purpose per 60 seconds
    const recentOTP = await OTP.findOne({
      user: userId,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOTP) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting a new OTP" },
        { status: 429 }
      );
    }

    // Delete old OTPs for this user and purpose
    await OTP.deleteMany({ user: userId, purpose });

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();

    // Create OTP record (expires in 10 minutes)
    await OTP.create({
      user: userId,
      code,
      purpose,
      newEmail: purpose === "email_change" ? newEmail?.toLowerCase().trim() : null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send email
    await sendMail({
      to: sendTo!,
      subject: `Acadex — Your Verification Code`,
      html: otpEmailHTML(user.name, code, purpose),
    });

    // Mask email for response
    const maskedEmail = sendTo!.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return NextResponse.json({
      message: `OTP sent to ${maskedEmail}`,
      maskedEmail,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
