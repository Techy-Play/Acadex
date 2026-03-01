/**
 * @module API/Notifications/[id]/Read
 * @description Single notification actions.
 * - POST  → marks the notification as read (adds user to `readBy`).
 * - DELETE → dismisses the notification for the user (adds to `dismissedBy`).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

// POST /api/notifications/[id]/read — Mark a single notification as read
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    await connectDB();

    await Notification.updateOne(
      { _id: id },
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id]/read — Dismiss a single notification for this user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    await Notification.updateOne(
      { _id: id },
      { $addToSet: { dismissedBy: userObjId, readBy: userObjId } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
