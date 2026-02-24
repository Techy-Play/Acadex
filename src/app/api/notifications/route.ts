import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

// GET /api/notifications — Fetch notifications for current user's role
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get recent notifications for this role (last 30 days, max 50)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const notifications = await Notification.find({
      targetRole: userRole,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Map to include read status for this specific user
    const mapped = notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.readBy.some((id: mongoose.Types.ObjectId) => id.toString() === userId),
      createdAt: n.createdAt,
    }));

    const unreadCount = mapped.filter((n) => !n.read).length;

    return NextResponse.json({ notifications: mapped, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/notifications — Mark all notifications as read
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Add userId to readBy for all unread notifications of this role
    await Notification.updateMany(
      {
        targetRole: userRole,
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Required for the lean() ObjectId type
import mongoose from "mongoose";
