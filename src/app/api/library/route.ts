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

    const assignedSectionsRaw = request.headers.get("x-user-assigned-sections");
    const assignedSections = assignedSectionsRaw ? JSON.parse(assignedSectionsRaw) : [];
    
    let allowedSections: string[] = [];
    if (userSection) allowedSections.push(userSection);
    allowedSections = Array.from(new Set([...allowedSections, ...assignedSections]));

    // Section filtering
    let sectionFilterOr: Record<string, any>[] | null = null;
    if (userRole === "admin" && !isSuperAdmin && allowedSections.length > 0) {
      if (sectionParam && sectionParam !== "all") {
        sectionFilterOr = [{ section: sectionParam }, { sections: sectionParam }];
      } else if (sectionParam !== "all") {
        sectionFilterOr = [
          { section: { $in: allowedSections } },
          { sections: { $in: allowedSections } }
        ];
      }
    } else if (sectionParam && sectionParam !== "all") {
      sectionFilterOr = [{ section: sectionParam }, { sections: sectionParam }];
    } else if (userRole === "student" && userSection && sectionParam !== "all") {
      sectionFilterOr = [{ section: userSection }, { sections: userSection }];
    }

    // Text search on title/description/tags
    let searchFilterOr: Record<string, any>[] | null = null;
    if (search) {
      searchFilterOr = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    if (sectionFilterOr && searchFilterOr) {
      filter.$and = [{ $or: sectionFilterOr }, { $or: searchFilterOr }];
    } else if (sectionFilterOr) {
      filter.$or = sectionFilterOr;
    } else if (searchFilterOr) {
      filter.$or = searchFilterOr;
    }

    const resources = await LibraryResource.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

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

    let sectionId = parsed.data.section || null;
    let sectionsIds = parsed.data.sections || [];
    if (!isSuperAdmin) {
      if (adminSection && sectionsIds.length === 0 && !sectionId) {
        sectionId = adminSection;
        sectionsIds = [adminSection];
      }
    } else {
      if (sectionId && sectionsIds.length === 0) {
        sectionsIds = [sectionId];
      }
    }

    await connectDB();
    void Section;

    const resource = await LibraryResource.create({
      title: parsed.data.title,
      description: parsed.data.description,
      subject: parsed.data.subject,
      semester: parsed.data.semester,
      academicYear: parsed.data.academicYear,
      resourceType: parsed.data.resourceType,
      tags: parsed.data.tags,
      fileUrl: parsed.data.fileUrl,
      section: sectionId,
      sections: sectionsIds,
      uploadedBy: adminId,
    });

    const populated = await resource.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
      { path: "uploadedBy", select: "name" },
    ]);

    // Activity log
    try {
      await ActivityLog.create({
        user: adminId!,
        action: "add_library_resource",
        details: `Added library resource: ${parsed.data.title}`,
      });
    } catch {
      /* non-critical */
    }

    // Notification
    try {
      await Notification.create({
        type: "admin_message",
        title: "New Library Resource",
        message: `New ${parsed.data.resourceType} added: ${parsed.data.title}`,
        targetRole: "student",
      });
    } catch {
      /* non-critical */
    }

    return NextResponse.json({ resource: populated }, { status: 201 });
  } catch (error) {
    console.error("Add library resource error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
