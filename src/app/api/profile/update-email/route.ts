import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otpId } = await request.json();

    if (!otpId) {
      return NextResponse.json(
        { error: "Verified OTP is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify OTP was verified and get the newEmail from it
    const otpRecord = await OTP.findOne({
      _id: otpId,
      user: userId,
      purpose: "email_change",
      verified: true,
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or unverified OTP. Please verify your OTP first." },
        { status: 403 }
      );
    }

    // Check expiry (extra safety)
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (!otpRecord.newEmail) {
      return NextResponse.json(
        { error: "No new email found in OTP record" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if email is already taken (safety re-check)
    const existingUser = await User.findOne({
      email: otpRecord.newEmail,
      _id: { $ne: userId },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already in use by another account" },
        { status: 409 }
      );
    }

    // Update email using findByIdAndUpdate for reliable persistence
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { email: otpRecord.newEmail } },
      { new: true, runValidators: true }
    );

    if (!updatedUser || updatedUser.email !== otpRecord.newEmail) {
      console.error("Email update failed to persist:", {
        userId,
        intended: otpRecord.newEmail,
        actual: updatedUser?.email,
      });
      return NextResponse.json(
        { error: "Failed to save email. Please try again." },
        { status: 500 }
      );
    }

    // Clean up OTP
    await OTP.deleteMany({ user: userId, purpose: "email_change" });

    return NextResponse.json({
      message: "Email updated successfully",
      email: updatedUser.email,
    });
  } catch (error) {
    console.error("Update email error:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}
