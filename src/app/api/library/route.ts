/**
 * @module API/Library
 * @description Library resource list & creation.
 * - GET  → lists resources with optional subject/semester/type/year/section/search filters.
 * - POST → creates a new resource (admin only, validated with `addLibraryResourceSchema`).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { addLibraryResourceSchema } from "@/lib/validations";
import LibraryResource from "@/models/LibraryResource";
import Section from "@/models/Section";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { resolveUserIdsForAudience } from "@/lib/push/targets";

// GET /api/library - List library resources with optional filters
export async function GET(request: Request) {
  try {
    await connectDB();
    void Section;
    void User;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subject");
    const semester = searchParams.get("semester");
    const resourceType = searchParams.get("type");
    const academicYear = searchParams.get("year");
    const sectionParam = searchParams.get("section");
    const search = searchParams.get("search");

    const userRole = request.headers.get("x-user-role");
    const isSuperAdmin =
      request.headers.get("x-user-is-super-admin") === "true";
    const userSection = request.headers.get("x-user-section");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (subjectId) filter.subject = subjectId;
    if (semester) filter.semester = parseInt(semester);
    if (resourceType) filter.resourceType = resourceType;
    if (academicYear) filter.academicYear = academicYear;

    // Section filtering
    if (userRole === "admin" && !isSuperAdmin && userSection) {
      filter.section = userSection;
    } else if (sectionParam && sectionParam !== "all") {
      filter.section = sectionParam;
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      filter.section = userSection;
    }

    // Text search on title/description/tags
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    const resources = await LibraryResource.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("List library resources error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/library - Add a library resource (admin only)
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");
    const isSuperAdmin =
      request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const parsed = addLibraryResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedSectionIds = Array.from(
      new Set((parsed.data.sectionIds || []).filter(Boolean))
    );

    const targetSectionIds: Array<string | null> = !isSuperAdmin
      ? [adminSection || null]
      : normalizedSectionIds.length > 0
        ? normalizedSectionIds
        : parsed.data.section
          ? [parsed.data.section]
          : [null];

    await connectDB();
    void Section;

    const createdResources = await Promise.all(
      targetSectionIds.map((sectionId) =>
        LibraryResource.create({
          title: parsed.data.title,
          description: parsed.data.description,
          subject: parsed.data.subject,
          semester: parsed.data.semester,
          academicYear: parsed.data.academicYear,
          resourceType: parsed.data.resourceType,
          tags: parsed.data.tags,
          fileUrl: parsed.data.fileUrl,
          section: sectionId,
          uploadedBy: adminId,
        })
      )
    );

    const populatedResources = await LibraryResource.find({
      _id: { $in: createdResources.map((r) => r._id) },
    })
      .populate([
        { path: "subject", select: "name type" },
        { path: "section", select: "name" },
        { path: "uploadedBy", select: "name" },
      ])
      .sort({ createdAt: -1 });

    // Activity log
    try {
      await ActivityLog.create({
        user: adminId!,
        action: "add_library_resource",
        details:
          targetSectionIds.length > 1
            ? `Added library resource: ${parsed.data.title} for ${targetSectionIds.length} sections`
            : `Added library resource: ${parsed.data.title}`,
      });
    } catch {
      /* non-critical */
    }

    // Notification
    try {
      const targetUserIds =
        targetSectionIds.length === 1 && targetSectionIds[0] === null
          ? []
          : await resolveUserIdsForAudience({
              targetType: "section",
              sectionIds: targetSectionIds.filter(
                (s): s is string => typeof s === "string" && s.length > 0
              ),
            });

      await Notification.create({
        type: "admin_message",
        title: "New Library Resource",
        message: `New ${parsed.data.resourceType} added: ${parsed.data.title}`,
        ...(targetUserIds.length > 0
          ? { targetUsers: targetUserIds }
          : { targetRole: "student" }),
      });
    } catch {
      /* non-critical */
    }

    return NextResponse.json(
      {
        resource: populatedResources[0] || null,
        createdCount: populatedResources.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add library resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
