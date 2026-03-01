/**
 * @module API/Subjects
 * @description Subject management.
 * - GET  → lists subjects (super admin: all; others: user's stream + semester).
 * - POST → creates a new subject (admin with `isAdminSubject` or super admin).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";

// GET /api/subjects - List all subjects
export async function GET(request: Request) {
  try {
    await connectDB();

    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const UserModel = (await import("@/models/User")).default;
    const StreamModel = (await import("@/models/Stream")).default;

    const user = await UserModel.findById(userId).select(
      "role stream isSuperAdmin semester"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 👑 Super Admin → return all subjects
    if (user.isSuperAdmin) {
      const subjects = await Subject.find().sort({ semester: 1, name: 1 });
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

    const subjects = await Subject.find(filter).sort({ semester: 1, name: 1 });

    return NextResponse.json({ subjects });

  } catch (error) {
    console.error("List subjects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create a new subject (admin with isAdminSubject or super admin)
export async function POST(request: Request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      const { connectDB: connect } = await import("@/lib/db");
      const UserModel = (await import("@/models/User")).default;
      await connect();
      const admin = await UserModel.findById(userId).select("isAdminSubject").lean();
      if (!admin?.isAdminSubject) {
        return NextResponse.json({ error: "You don't have permission to manage subjects" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, type, semester } = body;

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

    // Check for duplicate (same name + same semester)
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

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
