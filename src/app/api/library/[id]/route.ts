/**
 * @module API/Library/[id]
 * @description Single library resource operations.
 * - GET    → fetches one resource by ID.
 * - PUT    → updates the resource (admin with section permission).
 * - DELETE → removes the resource (admin with section permission).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LibraryResource from "@/models/LibraryResource";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { requireAdmin, canAdminManageResource } from "@/lib/rbac";
import { logAdminOperation, calculateAuditDiff } from "@/lib/audit-logger";

const populateFields = [
  { path: "subject", select: "name type" },
  { path: "section", select: "name" },
  { path: "uploadedBy", select: "name" },
];

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

    const resource = await LibraryResource.findById(id).populate(populateFields);

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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
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

    // Determine target section if being modified
    const targetSection =
      body.section !== undefined ? (body.section || null) : undefined;

    // Check permissions on origin and destination sections
    if (!canAdminManageResource(authUser, resource.section?.toString(), targetSection)) {
      return NextResponse.json(
        { error: "You do not have permission to manage library resources in this section" },
        { status: 403 }
      );
    }

    // Validate subject if provided
    if (body.subject !== undefined) {
      const subjectExists = await Subject.findById(body.subject);
      if (!subjectExists) {
        return NextResponse.json(
          { error: "Selected subject does not exist" },
          { status: 400 }
        );
      }
      resource.subject = body.subject;
    }

    // Validate destination section in DB if provided
    if (targetSection) {
      const sectionExists = await Section.findById(targetSection);
      if (!sectionExists) {
        return NextResponse.json(
          { error: "Selected section does not exist" },
          { status: 400 }
        );
      }
    }

    // Capture pre-update state for audit diff
    const beforeData = {
      title: resource.title,
      description: resource.description,
      semester: resource.semester,
      academicYear: resource.academicYear,
      resourceType: resource.resourceType,
      fileUrl: resource.fileUrl,
      subject: resource.subject ? String(resource.subject) : null,
      section: resource.section ? String(resource.section) : null,
    };

    // Update allowed fields
    const allowedFields = [
      "title",
      "description",
      "semester",
      "academicYear",
      "resourceType",
      "tags",
      "fileUrl",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (resource as any)[field] = body[field];
      }
    }
    if (body.section !== undefined) {
      resource.section = body.section || null;
    }

    await resource.save();

    const populated = await resource.populate(populateFields);

    // Structured Audit Log with diff
    const afterData = {
      title: resource.title,
      description: resource.description,
      semester: resource.semester,
      academicYear: resource.academicYear,
      resourceType: resource.resourceType,
      fileUrl: resource.fileUrl,
      subject: resource.subject ? String(resource.subject) : null,
      section: resource.section ? String(resource.section) : null,
    };
    const diff = calculateAuditDiff(beforeData, afterData);

    try {
      await logAdminOperation({
        admin: authUser,
        action: "LIBRARY_RESOURCE_UPDATE",
        description: `Updated library resource "${resource.title}"`,
        target: {
          id: resource._id.toString(),
          type: "library",
          name: resource.title,
          section: resource.section || null,
          subject: resource.subject ? String(resource.subject) : null,
        },
        route: `/user/dashboard/library`,
        diff,
        req: request,
      });
    } catch (auditErr) {
      console.warn("Failed to log library resource update:", auditErr);
    }

    try {
      await ActivityLog.create({
        user: authUser.userId,
        action: "update_library_resource",
        details: `Updated library resource: ${resource.title}`,
        section: resource.section || null,
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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const { id } = await params;

    await connectDB();

    const resource = await LibraryResource.findById(id);
    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    // Check permission on resource's section
    if (!canAdminManageResource(authUser, resource.section?.toString())) {
      return NextResponse.json(
        { error: "You do not have permission to delete library resources from this section" },
        { status: 403 }
      );
    }

    await LibraryResource.findByIdAndDelete(id);

    // Structured Audit Log with retained safe metadata
    try {
      await logAdminOperation({
        admin: authUser,
        action: "LIBRARY_RESOURCE_DELETE",
        description: `Deleted library resource "${resource.title}"`,
        target: {
          id: resource._id.toString(),
          type: "library",
          name: resource.title,
          section: resource.section || null,
          subject: resource.subject ? String(resource.subject) : null,
        },
        metadata: {
          deletedRecord: {
            title: resource.title,
            resourceType: resource.resourceType,
            subject: resource.subject ? String(resource.subject) : null,
            section: resource.section ? String(resource.section) : null,
          },
        },
        req: request,
      });
    } catch (auditErr) {
      console.warn("Failed to log library resource delete:", auditErr);
    }

    try {
      await ActivityLog.create({
        user: authUser.userId,
        action: "delete_library_resource",
        details: `Deleted library resource: ${resource.title}`,
        section: resource.section || null,
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
