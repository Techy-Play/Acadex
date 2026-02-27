import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LibraryResource from "@/models/LibraryResource";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

// GET /api/library/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    void Section;
    void User;

    const resource = await LibraryResource.findById(id)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name");

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Get library resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/library/[id] - Update a library resource (admin only)
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
    void Section;
    void User;

    const resource = await LibraryResource.findById(id);
    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedFields = [
      "title",
      "description",
      "subject",
      "semester",
      "academicYear",
      "resourceType",
      "tags",
      "fileUrl",
      "section",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (resource as any)[field] = body[field];
      }
    }

    await resource.save();

    const populated = await resource.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
      { path: "uploadedBy", select: "name" },
    ]);

    try {
      await ActivityLog.create({
        user: adminId!,
        action: "update_library_resource",
        details: `Updated library resource: ${resource.title}`,
      });
    } catch {
      /* non-critical */
    }

    return NextResponse.json({ resource: populated });
  } catch (error) {
    console.error("Update library resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/library/[id] - Delete a library resource (admin only)
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

    const resource = await LibraryResource.findByIdAndDelete(id);
    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    try {
      await ActivityLog.create({
        user: adminId!,
        action: "delete_library_resource",
        details: `Deleted library resource: ${resource.title}`,
      });
    } catch {
      /* non-critical */
    }

    return NextResponse.json({ message: "Resource deleted" });
  } catch (error) {
    console.error("Delete library resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
