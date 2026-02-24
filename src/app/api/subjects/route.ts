import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";

// GET /api/subjects - List all subjects
export async function GET() {
  try {
    await connectDB();

    const subjects = await Subject.find().sort({ name: 1 });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("List subjects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create a new subject (admin only)
export async function POST(request: Request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate
    const existing = await Subject.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A subject with this name already exists" },
        { status: 409 }
      );
    }

    const subject = await Subject.create({ name: name.trim() });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Create subject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
