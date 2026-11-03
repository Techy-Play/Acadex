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
import Subject from "@/models/Subject";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";

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

    const authUser = await getAuthUser(request);
    const allowedSections: string[] = authUser ? authUser.effectiveSectionIds : [];

    // Section filtering
    let sectionFilterOr: Record<string, any>[] | null = null;
    if (userRole === "admin" && !isSuperAdmin) {
      // M-02: Prevent section=all bypass for sub-admins
      const querySection = sectionParam && sectionParam !== "all" ? sectionParam : null;
      if (querySection) {
        if (allowedSections.length > 0 && !allowedSections.includes(querySection)) {
          return NextResponse.json({ resources: [] });
        }
        sectionFilterOr = [{ section: querySection }, { sections: querySection }];
      } else if (allowedSections.length > 0) {
        sectionFilterOr = [
          { section: { $in: allowedSections } },
          { sections: { $in: allowedSections } }
        ];
      } else {
        return NextResponse.json({ resources: [] });
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

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam) || 50) : 50;
    const skip = (page - 1) * limit;

    const resources = await LibraryResource.find(filter)
      .populate("subject", "name type")
      .populate("section", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await LibraryResource.countDocuments(filter);

    return NextResponse.json({ 
      resources,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
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
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const body = await request.json();

    const parsed = addLibraryResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    void Section;

    // Validate that the subject exists
    const subjectExists = await Subject.findById(parsed.data.subject);
    if (!subjectExists) {
      return NextResponse.json(
        { error: "Selected subject does not exist" },
        { status: 400 }
      );
    }

    let sectionId = parsed.data.section || null;
    let sectionsIds = parsed.data.sections || [];

    if (!authUser.isSuperAdmin) {
      // If neither section nor sections provided, default to user's first assigned section
      if (!sectionId && sectionsIds.length === 0) {
        sectionId = authUser.section || authUser.effectiveSectionIds[0] || null;
        if (sectionId) sectionsIds = [sectionId];
      }

      // Check all specified sections against admin's assigned sections
      const allTargetSections = Array.from(
        new Set([sectionId, ...sectionsIds].filter(Boolean))
      ) as string[];

      for (const sId of allTargetSections) {
        if (!canAdminManageSection(authUser, sId)) {
          return NextResponse.json(
            { error: "You cannot add library resources to a section you are not assigned to" },
            { status: 403 }
          );
        }
      }
    } else {
      if (sectionId && sectionsIds.length === 0) {
        sectionsIds = [sectionId];
      }
    }

    // Ensure valid section in Section collection if provided
    if (sectionId) {
      const secDoc = await Section.findById(sectionId);
      if (!secDoc) {
        return NextResponse.json(
          { error: "Selected section does not exist" },
          { status: 400 }
        );
      }
    }

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
      uploadedBy: authUser.userId,
    });

    const populated = await resource.populate([
      { path: "subject", select: "name type" },
      { path: "section", select: "name" },
      { path: "uploadedBy", select: "name" },
    ]);

    // Activity log
    try {
      await ActivityLog.create({
        user: authUser.userId,
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
