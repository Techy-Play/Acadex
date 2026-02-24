import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addPracticalSchema } from "@/lib/validations";
import Subject from "@/models/Subject";
import Practical from "@/models/Practical";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";

// GET /api/practicals - List practicals (optionally filter by subject)
export async function GET(request: Request) {
  try {
    await connectDB();
    void Subject; // Ensure Subject model is registered for populate

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");

    const filter = subjectId ? { subject: subjectId } : {};
    const practicals = await Practical.find(filter)
      .populate("subject", "name")
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

    await connectDB();
    void Subject;

    const practical = await Practical.create({
      subject: parsed.data.subject,
      title: parsed.data.title,
      description: parsed.data.description || "",
      file_url: parsed.data.file_url || "",
    });

    const populated = await practical.populate("subject", "name");

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "PRACTICAL_ADDED",
      details: `Added practical: ${parsed.data.title}`,
    });

    // Notify students
    await Notification.create({
      type: "new_practical",
      title: "New Practical Added",
      message: `"${parsed.data.title}" has been uploaded`,
      link: "/dashboard/practicals",
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
