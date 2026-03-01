/**
 * @module API/Sections
 * @description Section management.
 * - GET  → lists all sections (public).
 * - POST → creates a new section (super admin or admin with `isAdminSection`).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Section from "@/models/Section";
import User from "@/models/User";

// GET /api/sections — list all sections (public for access request form + authenticated)
export async function GET() {
  try {
    await connectDB();
    const sections = await Section.find().sort({ name: 1 }).lean();
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("List sections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/sections — create section (super admin or admin with isAdminSection)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can manage sections" },
        { status: 403 }
      );
    }

    if (!isSuperAdmin) {
      const userId = request.headers.get("x-user-id");
      await connectDB();
      const admin = await User.findById(userId).select("isAdminSection").lean();
      if (!admin?.isAdminSection) {
        return NextResponse.json(
          { error: "You don't have permission to manage sections" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Section name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: "Section name too long (max 50 characters)" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for duplicate
    const existing = await Section.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A section with this name already exists" },
        { status: 409 }
      );
    }

    const section = await Section.create({ name: name.trim() });

    return NextResponse.json(
      { success: true, section },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
