import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subject from "@/models/Subject";
import Practical from "@/models/Practical";
import ActivityLog from "@/models/ActivityLog";

// GET /api/practicals/[id] - Get a single practical
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    void Subject;

    const practical = await Practical.findById(id).populate("subject", "name");
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ practical });
  } catch (error) {
    console.error("Get practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/practicals/[id] - Update a practical (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectDB();
    void Subject;

    const practical = await Practical.findById(id);
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (body.title !== undefined) practical.title = body.title;
    if (body.description !== undefined) practical.description = body.description;
    if (body.file_url !== undefined) practical.file_url = body.file_url;
    if (body.subject !== undefined) practical.subject = body.subject;

    await practical.save();
    const populated = await practical.populate("subject", "name");

    await ActivityLog.create({
      user: adminId!,
      action: "PRACTICAL_UPDATED",
      details: `Updated practical: ${practical.title}`,
    });

    return NextResponse.json({ success: true, practical: populated });
  } catch (error) {
    console.error("Update practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/practicals/[id] - Delete a practical (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const practical = await Practical.findByIdAndDelete(id);
    if (!practical) {
      return NextResponse.json(
        { error: "Practical not found" },
        { status: 404 }
      );
    }

    await ActivityLog.create({
      user: adminId!,
      action: "PRACTICAL_DELETED",
      details: `Deleted practical: ${practical.title}`,
    });

    return NextResponse.json({ success: true, message: "Practical deleted" });
  } catch (error) {
    console.error("Delete practical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
