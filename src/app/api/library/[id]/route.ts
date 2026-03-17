/**
 * @module API/Library/[id]
 * @description Single library resource operations.
 * - GET   → fetches one resource by ID.
 * - PUT   → updates the resource (admin only).
 * - DELETE → removes the resource (admin only).
 */
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import LibraryResource from "@/models/LibraryResource";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

const asObjectId = (value: unknown): Types.ObjectId | null =>
  typeof value === "string" && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;

const normalizeSectionIds = (value: unknown): Types.ObjectId[] => {
  if (!Array.isArray(value)) return [];

  const uniqueIds = new Set(
    value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim())
  );

  return Array.from(uniqueIds)
    .map((item) => asObjectId(item))
    .filter((item): item is Types.ObjectId => item !== null);
};

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
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

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

    // Section admin can only edit their own section resources
    if (!isSuperAdmin && resource.section?.toString() !== adminSection) {
      return NextResponse.json(
        { error: "You can only edit resources from your own section" },
        { status: 403 }
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

    const normalizedSectionIds = normalizeSectionIds(body.sectionIds);

    if (isSuperAdmin) {
      if (normalizedSectionIds.length > 0) {
        resource.section = normalizedSectionIds[0];
      } else if (body.section !== undefined) {
        resource.section = asObjectId(body.section);
      }
    } else {
      resource.section = asObjectId(adminSection);
    }

    await resource.save();

    let replicatedCount = 0;
    if (isSuperAdmin && normalizedSectionIds.length > 1) {
      const siblingSectionIds = normalizedSectionIds.slice(1);
      for (const sectionId of siblingSectionIds) {
        const existingSibling = await LibraryResource.findOne({
          _id: { $ne: resource._id },
          subject: resource.subject,
          section: sectionId,
          title: resource.title,
          fileUrl: resource.fileUrl,
          uploadedBy: resource.uploadedBy,
        });

        if (existingSibling) {
          existingSibling.description = resource.description;
          existingSibling.semester = resource.semester;
          existingSibling.academicYear = resource.academicYear;
          existingSibling.resourceType = resource.resourceType;
          existingSibling.tags = resource.tags;
          await existingSibling.save();
        } else {
          await LibraryResource.create({
            title: resource.title,
            description: resource.description,
            subject: resource.subject,
            section: sectionId,
            semester: resource.semester,
            academicYear: resource.academicYear,
            resourceType: resource.resourceType,
            uploadedBy: resource.uploadedBy,
            tags: resource.tags,
            fileUrl: resource.fileUrl,
          });
        }
        replicatedCount += 1;
      }
    }

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

    return NextResponse.json({ resource: populated, replicatedCount });
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
