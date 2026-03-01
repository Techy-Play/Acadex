/**
 * @module API/Completions
 * @description Assignment completion tracking.
 * - GET   → returns IDs of assignments the user has completed.
 * - POST  → marks an assignment as complete.
 * - DELETE → un-marks a completion.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Completion from "@/models/Completion";

// GET /api/completions — get all completed assignment IDs for the current user
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const completions = await Completion.find({ user: userId }).select(
      "assignment"
    );

    const completedIds = completions.map((c) => c.assignment.toString());

    return NextResponse.json({ completedIds });
  } catch (error) {
    console.error("Get completions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/completions — mark an assignment as complete
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Upsert to avoid duplicate errors
    await Completion.findOneAndUpdate(
      { user: userId, assignment: assignmentId },
      { user: userId, assignment: assignmentId, completedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/completions — unmark an assignment as complete
export async function DELETE(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    await Completion.findOneAndDelete({
      user: userId,
      assignment: assignmentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
