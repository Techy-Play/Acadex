import { NextResponse } from "next/server";
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

    await connectDB();

    await Notification.updateOne(
      { _id: id },
      { $addToSet: { readBy: userId } }
    );

    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
