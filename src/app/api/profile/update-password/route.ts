import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import OTP from "@/models/OTP";
import bcrypt from "bcrypt";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, otpId } = await request.json();

    if (!currentPassword || !newPassword || !otpId) {
      return NextResponse.json(
        { error: "Current password, new password, and verified OTP are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify OTP was verified
    const otpRecord = await OTP.findOne({
      _id: otpId,
      user: userId,
      purpose: "password_change",
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

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Clean up OTP
    await OTP.deleteMany({ user: userId, purpose: "password_change" });

    // Re-sign token
    const token = signToken({
      userId: user._id.toString(),
      collegeId: user.college_id,
      role: user.role,
      name: user.name,
    });
    await setAuthCookie(token);

    // Notify user about password change
    try {
      const Notification = (await import("@/models/Notification")).default;
      await Notification.create({
        type: "profile_update",
        title: "Password Changed",
        message: "Your password was successfully updated. If you didn't do this, contact admin immediately.",
        link: "/user/dashboard/profile",
        targetUsers: [userId],
      });
    } catch { /* non-blocking */ }

    // Send security email
    try {
      if (user.email) {
        const { sendMail, profileUpdateEmailHTML } = await import("@/lib/mail");
        await sendMail({
          to: user.email,
          subject: "🔒 Acadex — Password Changed",
          html: profileUpdateEmailHTML(user.name, "password"),
        });
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
