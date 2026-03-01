/**
 * @module API/Admin/SendNotification
 * @description Admin-only. Sends a notification (title + body)
 * to an individual user.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";

// POST /api/admin/send-notification — Send notification to individual user
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, title, message } = body;

    if (!userId || !title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "userId, title, and message are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await Notification.create({
      type: "admin_message",
      title: title.trim().slice(0, 200),
      message: message.trim().slice(0, 500),
      link: null,
      targetUsers: [userId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
