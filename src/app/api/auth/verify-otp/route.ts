/**
 * @module API/Auth/VerifyOTP
 * @description Authenticated. Verifies an OTP code for password_change
 * or email_change purposes.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OTP from "@/models/OTP";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, purpose } = await request.json();

    if (!code || !purpose) {
      return NextResponse.json(
        { error: "OTP code and purpose are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const otpRecord = await OTP.findOne({
      user: userId,
      purpose,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new one." },
        { status: 404 }
      );
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Verify code
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
      message: "OTP verified successfully",
      otpId: otpRecord._id,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
