/**
 * @module API/Subjects
 * @description Subject management.
 * - GET  → lists subjects based on user role and enrollment.
 * - POST → creates a new subject (super admin only).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";
import StreamModel from "@/models/Stream";
import User from "@/models/User";
import { requireSuperAdmin } from "@/lib/rbac";

// GET /api/subjects - List subjects based on user role and enrollment
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(userId)
      .select("role isSuperAdmin stream semester")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Super Admin → return all subjects
    if (user.isSuperAdmin) {
      const subjects = await Subject.find().sort({ semester: 1, name: 1 }).lean();
      return NextResponse.json({ subjects });
    }

    // Non-super users must have a stream to receive subjects
    if (!user.stream) {
      return NextResponse.json({ subjects: [] });
    }

    const stream = await StreamModel.findById(user.stream).select("subjects");

    if (!stream || !stream.subjects.length) {
      return NextResponse.json({ subjects: [] });
    }

    const filter: Record<string, unknown> = {
      _id: { $in: stream.subjects },
    };

    // Non-super users: Stream + Semester visibility when semester is available
    if (user.semester && user.semester >= 1 && user.semester <= 8) {
      filter.semester = user.semester;
    }

    const subjects = await Subject.find(filter).sort({ semester: 1, name: 1 }).lean();

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("List subjects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create a new subject (super admin only)
export async function POST(request: Request) {
  try {
    const authResult = await requireSuperAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await request.json();
    const { name, type, semester, streamId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    if (!semester || semester < 1 || semester > 8) {
      return NextResponse.json(
        { error: "Semester is required and must be between 1 and 8" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate within stream if streamId is provided
    if (streamId) {
      const targetStream = await StreamModel.findById(streamId).populate("subjects");
      if (!targetStream) {
        return NextResponse.json(
          { error: "Selected stream does not exist" },
          { status: 400 }
        );
      }
      const existingInStream = (targetStream.subjects as unknown as { name: string }[]).some(
        (s) => s.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (existingInStream) {
        return NextResponse.json(
          { error: "A subject with this name already exists in the selected stream" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate across same name + same semester
    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      semester: Number(semester),
    });
    if (existing) {
      return NextResponse.json(
        { error: "A subject with this name already exists for this semester" },
        { status: 409 }
      );
    }

    const subject = await Subject.create({
      name: name.trim(),
      type: type === "practical" ? "practical" : "theory",
      semester: Number(semester),
    });

    if (streamId) {
      await StreamModel.findByIdAndUpdate(streamId, {
        $addToSet: { subjects: subject._id },
      });
    }

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
