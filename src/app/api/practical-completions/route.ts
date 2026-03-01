/**
 * @module API/PracticalCompletions
 * @description Practical completion tracking.
 * - GET   → returns IDs of practicals the user has completed.
 * - POST  → marks a practical as complete.
 * - DELETE → un-marks a completion.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PracticalCompletion from "@/models/PracticalCompletion";

// GET /api/practical-completions — get all completed practical IDs for the current user
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const completions = await PracticalCompletion.find({
      user: userId,
    }).select("practical");

    const completedIds = completions.map((c) => c.practical.toString());

    return NextResponse.json({ completedIds });
  } catch (error) {
    console.error("Get practical completions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/practical-completions — mark a practical as complete
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { practicalId } = body;

    if (!practicalId) {
      return NextResponse.json(
        { error: "practicalId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Upsert to avoid duplicate errors
    await PracticalCompletion.findOneAndUpdate(
      { user: userId, practical: practicalId },
      { user: userId, practical: practicalId, completedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add practical completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/practical-completions — unmark a practical as complete
export async function DELETE(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const practicalId = searchParams.get("practicalId");

    if (!practicalId) {
      return NextResponse.json(
        { error: "practicalId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    await PracticalCompletion.findOneAndDelete({
      user: userId,
      practical: practicalId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove practical completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
