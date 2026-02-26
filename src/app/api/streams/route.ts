import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Stream from "@/models/Stream";
import Subject from "@/models/Subject";

// GET /api/streams - List all streams with populated subjects
export async function GET() {
  try {
    await connectDB();
    void Subject; // Ensure Subject model is registered for populate
    const streams = await Stream.find().populate("subjects").sort({ name: 1 });
    return NextResponse.json({ streams });
  } catch (error) {
    console.error("List streams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/streams - Create a new stream (admin with isAdminStream or super admin)
export async function POST(request: Request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      const UserModel = (await import("@/models/User")).default;
      await connectDB();
      const admin = await UserModel.findById(userId).select("isAdminStream").lean();
      if (!admin?.isAdminStream) {
        return NextResponse.json({ error: "You don't have permission to manage streams" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, subjects } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Stream name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate
    const existing = await Stream.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A stream with this name already exists" },
        { status: 409 }
      );
    }

    const stream = await Stream.create({
      name: name.trim(),
      subjects: subjects || [],
    });

    const populated = await Stream.findById(stream._id).populate("subjects");

    return NextResponse.json({ stream: populated }, { status: 201 });
  } catch (error) {
    console.error("Create stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
