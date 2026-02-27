import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addPracticalSchema } from "@/lib/validations";
import Subject from "@/models/Subject";
import Practical from "@/models/Practical";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// GET /api/practicals - List practicals (optionally filter by subject and/or section)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Subject;
    void Section;
    void User;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");
    const sectionParam = searchParams.get("section");

    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const userSection = request.headers.get("x-user-section");

    const filter: Record<string, string> = {};
    if (subjectId) filter.subject = subjectId;

    // Section filtering logic:
    // - Super admins see all (unless they explicitly filter)
    // - Sub-admins are hard-filtered to their own section
    // - Students default to their section; can use ?section=all to see all
    if (userRole === "admin" && !isSuperAdmin && userSection) {
      filter.section = userSection;
    } else if (sectionParam && sectionParam !== "all") {
      filter.section = sectionParam;
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.section = userSection;
    }

    const practicals = await Practical.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ practicals });
  } catch (error) {
    console.error("List practicals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/practicals - Add a practical (admin only)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = addPracticalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let sectionId = parsed.data.section || null;
    if (!isSuperAdmin) {
      sectionId = adminSection || null;
    }

    await connectDB();
    void Subject;
    void Section;

    const practical = await Practical.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || "",
      file_url: parsed.data.file_url || "",
      section: sectionId,
      uploadedBy: adminId,
    });

    const populated = await practical.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
    ]);

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "PRACTICAL_ADDED",
      details: `Added practical: ${parsed.data.title}`,
      section: sectionId || null,
    });

    // Notify students
    await Notification.create({
      type: "new_practical",
      title: "New Practical Added",
      message: `"${parsed.data.title}" has been uploaded`,
      link: "/user/dashboard/practicals",
      targetRole: "student",
    });

    return NextResponse.json(
      { success: true, practical: populated },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
