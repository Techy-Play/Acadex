import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserUpload from "@/models/UserUpload";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import Practical from "@/models/Practical";
import Subject from "@/models/Subject";
import Notification from "@/models/Notification";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";

import mongoose from "mongoose";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";

// Ensure models are registered for populate
void Note;
void Assignment;
void Practical;

// Normalizes internal operation kind used by business logic.
function normalizeRequestKind(value?: string | null): "create" | "edit" | "delete" {
  const normalized = (value || "").toLowerCase();
  if (normalized === "edit" || normalized === "update") return "edit";
  if (normalized === "delete" || normalized === "remove") return "delete";
  return "create";
}

// Normalizes dashboard-facing request type labels.
function normalizeReqType(value?: string | null): "Upload" | "edit" | "remove" {
  const normalized = (value || "").toLowerCase();
  if (normalized === "edit" || normalized === "update") return "edit";
  if (normalized === "remove" || normalized === "delete") return "remove";
  return "Upload";
}

// Maps internal operation kind to dashboard label type.
function requestKindToReqType(requestKind: "create" | "edit" | "delete"): "Upload" | "edit" | "remove" {
  if (requestKind === "edit") return "edit";
  if (requestKind === "delete") return "remove";
  return "Upload";
}

// Resolves both request flags into one canonical pair.
// Priority: delete > edit > create when fields conflict.
function resolveRequestFlags(
  requestKindRaw?: string | null,
  reqTypeRaw?: string | null
): { requestKind: "create" | "edit" | "delete"; reqType: "Upload" | "edit" | "remove" } {
  const fromRequestKind = normalizeRequestKind(requestKindRaw);
  const fromReqType = normalizeRequestKind(reqTypeRaw);

  let requestKind: "create" | "edit" | "delete" = "create";
  if (fromRequestKind === "delete" || fromReqType === "delete") {
    requestKind = "delete";
  } else if (fromRequestKind === "edit" || fromReqType === "edit") {
    requestKind = "edit";
  }

  return {
    requestKind,
    reqType: requestKindToReqType(requestKind),
  };
}

// Loads the currently-live target resource for edit/delete requests.
async function loadTargetResource(
  type: "note" | "assignment" | "practical",
  resourceId: string
): Promise<{
  title: string;
  description?: string;
  file_url: string;
  subject?: unknown;
} | null> {
  if (type === "note") {
    return await Note.findById(resourceId)
      .select("title file_url subject")
      .lean();
  }

  if (type === "assignment") {
    return await Assignment.findById(resourceId)
      .select("title description file_url subject")
      .lean();
  }

  return await Practical.findById(resourceId)
    .select("title description file_url subject")
    .lean();
}

// Builds DB filter for requested dashboard request type.
function buildReqTypeFilter(reqType: "Upload" | "edit" | "remove"): Record<string, unknown> {
  if (reqType === "Upload") {
    return {
      $or: [
        { reqType: "Upload" },
        { reqType: "upload" },
        { reqType: { $exists: false }, requestKind: "create" },
        { reqType: { $exists: false }, requestKind: "upload" },
        { reqType: { $exists: false }, requestKind: { $exists: false } },
        { reqType: { $exists: false }, requestKind: null },
      ],
    };
  }

  if (reqType === "edit") {
    return {
      $or: [
        { reqType: "edit" },
        { reqType: "update" },
        { reqType: { $exists: false }, requestKind: "edit" },
        { reqType: { $exists: false }, requestKind: "update" },
      ],
    };
  }

  return {
    $or: [
      { reqType: "remove" },
      { reqType: "delete" },
      { reqType: { $exists: false }, requestKind: "delete" },
      { reqType: { $exists: false }, requestKind: "remove" },
    ],
  };
}

// GET /api/user-uploads — List upload requests
// Admin/super-admin: all for their section (super sees all). Student: their own.
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reqTypeParamRaw = searchParams.get("reqType") || searchParams.get("requestKind");
    const reqTypeParam = reqTypeParamRaw
      ? normalizeReqType(reqTypeParamRaw)
      : null;
    const semesterParam = searchParams.get("semester");

    await connectDB();

    // 2) Build role-scoped list filter.
    const filter: Record<string, unknown> = {};

    if (authUser.role === "admin") {
      // Super admin sees all, sub-admin sees their assigned sections' uploads
      if (!authUser.isSuperAdmin) {
        filter.section = {
          $in: authUser.effectiveSectionIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      if (reqTypeParam) {
        Object.assign(filter, buildReqTypeFilter(reqTypeParam));
      }

      // Super-admin optional semester filter.
      if (authUser.isSuperAdmin && semesterParam && semesterParam !== "all") {
        const semesterNum = Number(semesterParam);
        if (!Number.isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8) {
          const SubjectModel = (await import("@/models/Subject")).default;
          const semSubjects = await SubjectModel.find({ semester: semesterNum })
            .select("_id")
            .lean();
          const semSubjectIds = semSubjects.map((subject) => subject._id);
          if (semSubjectIds.length === 0) {
            return NextResponse.json({ uploads: [], yourUploads: [] });
          }
          filter.subject = { $in: semSubjectIds };
        }
      }
    } else {
      // Students see only their own uploads
      filter.uploadedBy = authUser.userId;

      if (reqTypeParam) {
        Object.assign(filter, buildReqTypeFilter(reqTypeParam));
      }
    }

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    const page = pageParam ? Math.max(1, parseInt(pageParam) || 1) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam) || 50) : 50;
    const skip = (page - 1) * limit;

    // 3) Fetch request rows for panel tables.
    const uploads = await UserUpload.find(filter)
      .populate("uploadedBy", "name college_id")
      .populate("subject", "name semester")
      .populate("section", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await UserUpload.countDocuments(filter);

    // H-12 FIX: Reconciliation on GET violates HTTP idempotency and causes DB write contention.
    // This block now only runs for admins (not on every student page load) and can be fully
    // disabled by setting DISABLE_UPLOAD_RECONCILIATION=true in environment variables.
    // TODO: Migrate this logic to a one-time migration script (node scripts/reconcile-uploads.ts).
    const reconciliationEnabled = process.env.DISABLE_UPLOAD_RECONCILIATION !== "true";
    if (reconciliationEnabled && authUser.role === "admin") {
      for (const upload of uploads) {
        if (!upload.resourceId || upload.status !== "pending") continue;

        const resolved = resolveRequestFlags(
          (upload as { requestKind?: string; reqType?: string }).requestKind || null,
          (upload as { requestKind?: string; reqType?: string }).reqType || null
        );

        if (resolved.requestKind !== "create") continue;

        const target = await loadTargetResource(upload.type, String(upload.resourceId));
        if (!target) continue;

        const uploadSubjectId =
          upload.subject && typeof upload.subject === "object"
            ? String((upload.subject as { _id?: unknown })._id || "")
            : String(upload.subject || "");
        const targetSubjectId = target.subject ? String(target.subject) : "";

        const isSameAsTarget =
          (upload.title || "").trim() === (target.title || "").trim() &&
          (upload.description || "").trim() === (target.description || "").trim() &&
          (upload.file_url || "").trim() === (target.file_url || "").trim() &&
          uploadSubjectId === targetSubjectId;

        const inferredKind: "edit" | "delete" = isSameAsTarget ? "delete" : "edit";
        const inferredReqType = requestKindToReqType(inferredKind);

        await UserUpload.findByIdAndUpdate(upload._id, {
          requestKind: inferredKind,
          reqType: inferredReqType,
        });

        (upload as { requestKind?: string; reqType?: string }).requestKind = inferredKind;
        (upload as { requestKind?: string; reqType?: string }).reqType = inferredReqType;
      }
    }

    // Backfill missing resourceId for old approved create requests so edit/remove can work.
    if (authUser.role !== "admin") {
      const needsBackfill = uploads.filter((upload) => {
        const kind = resolveRequestFlags(
          (upload as { requestKind?: string; reqType?: string }).requestKind || null,
          (upload as { requestKind?: string; reqType?: string }).reqType || null
        ).requestKind;
        return (
          upload.status === "approved" &&
          kind === "create" &&
          !upload.resourceId
        );
      });

      for (const upload of needsBackfill) {
        const uploadedById =
          typeof upload.uploadedBy === "object" && upload.uploadedBy
            ? String(upload.uploadedBy._id)
            : String(upload.uploadedBy || "");
        const subjectId =
          typeof upload.subject === "object" && upload.subject
            ? String(upload.subject._id)
            : String(upload.subject || "");
        const sectionId =
          upload.section && typeof upload.section === "object"
            ? String(upload.section._id)
            : null;

        if (!uploadedById || !subjectId) continue;

        const baseFilter: Record<string, unknown> = {
          uploadedBy: uploadedById,
          subject: subjectId,
          title: upload.title,
        };
        if (sectionId) {
          baseFilter.section = sectionId;
        }

        const byExactFile = {
          ...baseFilter,
          file_url: upload.file_url,
        };

        let resource: { _id: unknown } | null = null;

        if (upload.type === "note") {
          resource = await Note.findOne(byExactFile).select("_id").lean();
          if (!resource) {
            resource = await Note.findOne(baseFilter)
              .sort({ uploadedAt: -1 })
              .select("_id")
              .lean();
          }
        } else if (upload.type === "assignment") {
          resource = await Assignment.findOne(byExactFile).select("_id").lean();
          if (!resource) {
            resource = await Assignment.findOne(baseFilter)
              .sort({ createdAt: -1 })
              .select("_id")
              .lean();
          }
        } else {
          resource = await Practical.findOne(byExactFile).select("_id").lean();
          if (!resource) {
            resource = await Practical.findOne(baseFilter)
              .sort({ createdAt: -1 })
              .select("_id")
              .lean();
          }
        }

        if (resource?._id) {
          await UserUpload.findByIdAndUpdate(upload._id, {
            resourceId: resource._id,
          });
          upload.resourceId = resource._id as typeof upload.resourceId;
        }
      }
    }

    // 5) For student panel, also return user's live uploaded resources.
    let yourUploads: Array<{
      _id: string;
      type: "note" | "assignment" | "practical";
      title: string;
      description: string;
      file_url: string;
      subject: unknown;
      section: unknown;
      createdAt: string;
    }> = [];

    if (authUser.role !== "admin") {
      const [notes, assignments, practicals] = await Promise.all([
        Note.find({ uploadedBy: authUser.userId })
          .populate("subject", "name")
          .populate("section", "name")
          .select("title file_url subject section uploadedAt createdAt")
          .lean(),
        Assignment.find({ uploadedBy: authUser.userId })
          .populate("subject", "name")
          .populate("section", "name")
          .select("title description file_url subject section createdAt")
          .lean(),
        Practical.find({ uploadedBy: authUser.userId })
          .populate("subject", "name")
          .populate("section", "name")
          .select("title description file_url subject section createdAt")
          .lean(),
      ]);

      yourUploads = [
        ...notes.map((item) => ({
          _id: item._id.toString(),
          type: "note" as const,
          title: item.title,
          description: "",
          file_url: item.file_url,
          subject: item.subject || null,
          section: item.section || null,
          createdAt: new Date(item.uploadedAt as Date).toISOString(),
        })),
        ...assignments.map((item) => ({
          _id: item._id.toString(),
          type: "assignment" as const,
          title: item.title,
          description: item.description || "",
          file_url: item.file_url,
          subject: item.subject || null,
          section: item.section || null,
          createdAt: (item.createdAt as Date).toISOString(),
        })),
        ...practicals.map((item) => ({
          _id: item._id.toString(),
          type: "practical" as const,
          title: item.title,
          description: item.description || "",
          file_url: item.file_url,
          subject: item.subject || null,
          section: item.section || null,
          createdAt: (item.createdAt as Date).toISOString(),
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({ 
      uploads, 
      yourUploads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("List user uploads error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user-uploads — Submit an upload request (student) or directly upload (admin)
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      requestKind: requestKindRaw,
      reqType: reqTypeRaw,
      resourceId,
      title,
      description,
      file_url,
      subject,
      section,
      deadline,
    } =
      body;

    // 2) Resolve canonical request operation + dashboard type.
    const { requestKind, reqType } = resolveRequestFlags(
      requestKindRaw || null,
      reqTypeRaw || null
    );

    if (!type || !["note", "assignment", "practical"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be note, assignment, or practical" },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!file_url || !file_url.trim()) {
      return NextResponse.json(
        { error: "File URL is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (requestKind !== "create" && !resourceId) {
      return NextResponse.json(
        { error: "resourceId is required for edit/delete requests" },
        { status: 400 }
      );
    }

    await connectDB();

    // Admins directly create the resource — no approval needed
    if (authUser.role === "admin") {
      if (requestKind !== "create") {
        return NextResponse.json(
          { error: "Admins can only use direct create uploads here" },
          { status: 400 }
        );
      }
      // Section: super admin can choose, sub-admin must be assigned
      let sectionId: string | null = null;
      if (authUser.isSuperAdmin) {
        sectionId = section || null;
      } else {
        if (section) {
          if (!canAdminManageSection(authUser, section)) {
            return NextResponse.json(
              { error: "Cannot upload to an unassigned section" },
              { status: 403 }
            );
          }
          sectionId = section;
        } else {
          sectionId = authUser.effectiveSectionIds[0] || null;
        }
      }

      let created;
      if (type === "note") {
        created = await Note.create({
          title: title.trim(),
          file_url: file_url.trim(),
          subject,
          section: sectionId,
          uploadedBy: authUser.userId,
        });
      } else if (type === "assignment") {
        created = await Assignment.create({
          title: title.trim(),
          description: (description || "").trim(),
          file_url: file_url.trim(),
          subject,
          section: sectionId,
          uploadedBy: authUser.userId,
          deadline: deadline || null,
        });
      } else {
        created = await Practical.create({
          title: title.trim(),
          description: (description || "").trim(),
          file_url: file_url.trim(),
          subject,
          section: sectionId,
          uploadedBy: authUser.userId,
        });
      }

      await ActivityLog.create({
        user: authUser.userId,
        action: `${type.toUpperCase()}_ADDED`,
        details: `Admin uploaded ${type}: "${title.trim()}"`,
        section: sectionId || null,
      });

      // Notify students
      let subjectName = "";
      if (subject) {
        const subDoc = await Subject.findById(subject).select("name").lean();
        if (subDoc?.name) subjectName = subDoc.name;
      }
      const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
      await Notification.create({
        type: type === "note" ? "new_note" : "new_assignment",
        title: `${subjectPrefix}New ${type.charAt(0).toUpperCase() + type.slice(1)} Added`,
        message: `${subjectPrefix}"${title.trim()}" has been uploaded`,
        link: `/user/dashboard/${type === "note" ? "notes" : type === "assignment" ? "assignments" : "practicals"}`,
        targetRole: "student",
      });

      return NextResponse.json(
        { success: true, directUpload: true, resource: created },
        { status: 201 }
      );
    }

    // Students — create a pending upload request
    if (requestKind !== "create") {
      // For edit/delete, target resource must exist and belong to current student.
      let targetResource:
        | {
            _id: unknown;
            title?: string;
            description?: string;
            file_url?: string;
            subject?: unknown;
            uploadedBy?: unknown;
          }
        | null = null;

      if (type === "note") {
        targetResource = await Note.findById(resourceId)
          .select("_id title file_url subject uploadedBy")
          .lean();
      } else if (type === "assignment") {
        targetResource = await Assignment.findById(resourceId)
          .select("_id title description file_url subject uploadedBy")
          .lean();
      } else {
        targetResource = await Practical.findById(resourceId)
          .select("_id title description file_url subject uploadedBy")
          .lean();
      }

      if (!targetResource) {
        return NextResponse.json(
          { error: "Target resource not found" },
          { status: 404 }
        );
      }

      if (
        targetResource.uploadedBy &&
        String(targetResource.uploadedBy) !== authUser.userId
      ) {
        return NextResponse.json(
          { error: "You can only request changes for your own uploaded resources" },
          { status: 403 }
        );
      }

      if (requestKind === "edit") {
        const incomingTitle = title.trim();
        const incomingDescription = (description || "").trim();
        const incomingFileUrl = file_url.trim();
        const incomingSubject = String(subject);

        const currentTitle = (targetResource.title || "").trim();
        const currentDescription = (targetResource.description || "").trim();
        const currentFileUrl = (targetResource.file_url || "").trim();
        const currentSubject = targetResource.subject
          ? String(targetResource.subject)
          : "";

        const hasAnyChange =
          incomingTitle !== currentTitle ||
          incomingDescription !== currentDescription ||
          incomingFileUrl !== currentFileUrl ||
          incomingSubject !== currentSubject;

        if (!hasAnyChange) {
          return NextResponse.json(
            { error: "No changes detected. Update at least one field before submitting an edit request." },
            { status: 400 }
          );
        }
      }

      const duplicatePending = await UserUpload.findOne({
        uploadedBy: authUser.userId,
        requestKind,
        resourceId,
        status: "pending",
      }).lean();
      if (duplicatePending) {
        return NextResponse.json(
          { error: "A similar pending request already exists for this resource" },
          { status: 409 }
        );
      }
    }

    const upload = await UserUpload.create({
      type,
      requestKind,
      reqType,
      resourceId: resourceId || null,
      title: title.trim(),
      description: (description || "").trim(),
      file_url: file_url.trim(),
      subject,
      section: authUser.section || null,
      uploadedBy: authUser.userId,
    });

    // Notify admins of this section + super admins
    const adminFilter: Record<string, unknown> = {
      role: "admin",
      status: "active",
    };
    if (authUser.section) {
      adminFilter.$or = [
        { isSuperAdmin: true },
        { section: authUser.section },
        { assignedSections: authUser.section },
      ];
    }
    const admins = await User.find(adminFilter).select("_id").lean();
    const adminIds = admins.map((a) => a._id);

    if (adminIds.length > 0) {
      let subjectName = "";
      if (subject) {
        const subDoc = await Subject.findById(subject).select("name").lean();
        if (subDoc?.name) subjectName = subDoc.name;
      }
      const subjectPrefix = subjectName ? `[${subjectName}] ` : "";

      await Notification.create({
        type: "admin_message",
        title: `${subjectPrefix}New Upload Request`,
        message:
          requestKind === "create"
            ? `${subjectPrefix}A student submitted a ${type} upload: "${title.trim()}"`
            : `${subjectPrefix}A student submitted a ${requestKind} request for ${type}: "${title.trim()}"`,
        link: "/admin/user-uploads",
        targetUsers: adminIds,
      });
    }

    return NextResponse.json(
      { success: true, upload },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/user-uploads — Approve or deny an upload (admin only)
export async function PATCH(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    const body = await request.json();
    const { uploadId, action, admin_note } = body;

    if (!uploadId || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { error: "uploadId and action (approve/deny) are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Atomically lock the request to prevent double-approval duplicates
    const upload = await UserUpload.findOneAndUpdate(
      { _id: uploadId, status: "pending" },
      { status: "processing" },
      { new: true }
    );

    if (!upload) {
      const existing = await UserUpload.findById(uploadId);
      if (!existing) {
        return NextResponse.json(
          { error: "Upload request not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `This upload has already been reviewed or is being processed` },
        { status: 400 }
      );
    }

    // Sub-admins can only approve/deny requests belonging to their assigned section(s)
    if (!canAdminManageSection(authUser, upload.section?.toString())) {
      // Rollback the processing lock
      await UserUpload.findByIdAndUpdate(uploadId, { status: "pending" });
      return NextResponse.json(
        { error: "You can only review requests for your assigned section(s)" },
        { status: 403 }
      );
    }

    const uploadRequestKind = resolveRequestFlags(
      (upload.requestKind as string | null | undefined) || null,
      ((upload as unknown as { reqType?: string | null }).reqType || null)
    ).requestKind;

    if (action === "approve") {
      // Apply create/edit/delete request
      if (uploadRequestKind === "create") {
        let createdResourceId: string | null = null;
        if (upload.type === "note") {
          const created = await Note.create({
            title: upload.title,
            file_url: upload.file_url,
            subject: upload.subject,
            section: upload.section,
            uploadedBy: upload.uploadedBy,
          });
          createdResourceId = created._id.toString();
        } else if (upload.type === "assignment") {
          const created = await Assignment.create({
            title: upload.title,
            description: upload.description,
            file_url: upload.file_url,
            subject: upload.subject,
            section: upload.section,
            uploadedBy: upload.uploadedBy,
          });
          createdResourceId = created._id.toString();
        } else if (upload.type === "practical") {
          const created = await Practical.create({
            title: upload.title,
            description: upload.description,
            file_url: upload.file_url,
            subject: upload.subject,
            section: upload.section,
            uploadedBy: upload.uploadedBy,
          });
          createdResourceId = created._id.toString();
        }

        if (createdResourceId) {
          upload.resourceId = createdResourceId as unknown as typeof upload.resourceId;
        }
      } else if (uploadRequestKind === "edit") {
        if (!upload.resourceId) {
          return NextResponse.json(
            { error: "Target resource missing for edit request" },
            { status: 400 }
          );
        }

        if (upload.type === "note") {
          await Note.findByIdAndUpdate(upload.resourceId, {
            title: upload.title,
            file_url: upload.file_url,
            subject: upload.subject,
          });
        } else if (upload.type === "assignment") {
          await Assignment.findByIdAndUpdate(upload.resourceId, {
            title: upload.title,
            description: upload.description,
            file_url: upload.file_url,
            subject: upload.subject,
          });
        } else {
          await Practical.findByIdAndUpdate(upload.resourceId, {
            title: upload.title,
            description: upload.description,
            file_url: upload.file_url,
            subject: upload.subject,
          });
        }
      } else if (uploadRequestKind === "delete") {
        if (!upload.resourceId) {
          return NextResponse.json(
            { error: "Target resource missing for delete request" },
            { status: 400 }
          );
        }

        if (upload.type === "note") {
          await Note.findByIdAndDelete(upload.resourceId);
        } else if (upload.type === "assignment") {
          await Assignment.findByIdAndDelete(upload.resourceId);
        } else {
          await Practical.findByIdAndDelete(upload.resourceId);
        }
      }

      upload.status = "approved";
      upload.admin_note = (admin_note || "").slice(0, 500);
      upload.reviewedBy = new mongoose.Types.ObjectId(authUser.userId) as unknown as typeof upload.reviewedBy;
      await upload.save();

      await ActivityLog.create({
        user: authUser.userId,
        action: "USER_UPLOAD_APPROVED",
        details: `Approved ${upload.requestKind} ${upload.type} request: "${upload.title}"`,
        section: upload.section || null,
      });

      const approvalNotificationType =
        upload.type === "note"
          ? "new_note"
          : upload.type === "assignment"
          ? "new_assignment"
          : "new_practical";

      // Notify the student
      let uploadSubjectName = "";
      if (upload.subject) {
        const subDoc = await Subject.findById(upload.subject).select("name").lean();
        if (subDoc?.name) uploadSubjectName = subDoc.name;
      }
      const uploadSubjectPrefix = uploadSubjectName ? `[${uploadSubjectName}] ` : "";

      await Notification.create({
        type: approvalNotificationType,
        title: `${uploadSubjectPrefix}Upload Approved! 🎉`,
        message:
          uploadRequestKind === "create"
            ? `${uploadSubjectPrefix}Your ${upload.type} "${upload.title}" has been approved and is now live.`
            : uploadRequestKind === "edit"
            ? `${uploadSubjectPrefix}Your edit request for ${upload.type} "${upload.title}" was approved.`
            : `${uploadSubjectPrefix}Your removal request for ${upload.type} "${upload.title}" was approved.`,
        link: `/user/dashboard/${upload.type === "note" ? "notes" : upload.type === "assignment" ? "assignments" : "practicals"}`,
        targetUsers: [upload.uploadedBy],
      });

      return NextResponse.json({
        success: true,
        message: "Upload approved and resource created",
      });
    } else {
      // Deny
      upload.status = "denied";
      upload.admin_note = (admin_note || "").slice(0, 500);
      upload.reviewedBy = new mongoose.Types.ObjectId(authUser.userId) as unknown as typeof upload.reviewedBy;
      await upload.save();

      await ActivityLog.create({
        user: authUser.userId,
        action: "USER_UPLOAD_DENIED",
        details: `Denied ${upload.requestKind} ${upload.type} request: "${upload.title}"`,
        section: upload.section || null,
      });

      let uploadSubjectName = "";
      if (upload.subject) {
        const subDoc = await Subject.findById(upload.subject).select("name").lean();
        if (subDoc?.name) uploadSubjectName = subDoc.name;
      }
      const uploadSubjectPrefix = uploadSubjectName ? `[${uploadSubjectName}] ` : "";

      const denyMessage = admin_note
        ? `${uploadSubjectPrefix}Your ${uploadRequestKind} request for ${upload.type} "${upload.title}" was denied. Note: ${admin_note}`
        : `${uploadSubjectPrefix}Your ${uploadRequestKind} request for ${upload.type} "${upload.title}" was denied.`;

      await Notification.create({
        type: "admin_message",
        title: `${uploadSubjectPrefix}Upload Denied`,
        message: denyMessage,
        link: "/user/dashboard",
        targetUsers: [upload.uploadedBy],
      });

      return NextResponse.json({
        success: true,
        message: "Upload denied",
      });
    }
  } catch (error) {
    console.error("Handle user upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user-uploads — Delete an upload request
export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("id");
    const mode = searchParams.get("mode");

    await connectDB();

    if (mode) {
      if (authUser.role === "admin") {
        return NextResponse.json(
          { error: "Bulk clear is only available for normal users" },
          { status: 403 }
        );
      }

      const bulkFilter: Record<string, unknown> = { uploadedBy: authUser.userId };
      if (mode === "approved") bulkFilter.status = "approved";
      else if (mode === "denied") bulkFilter.status = "denied";
      else if (mode !== "all") {
        return NextResponse.json(
          { error: "mode must be all, approved, or denied" },
          { status: 400 }
        );
      }

      const result = await UserUpload.deleteMany(bulkFilter);
      return NextResponse.json({ success: true, deletedCount: result.deletedCount || 0 });
    }

    if (!uploadId) {
      return NextResponse.json(
        { error: "Upload ID is required" },
        { status: 400 }
      );
    }

    const upload = await UserUpload.findById(uploadId);
    if (!upload) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 }
      );
    }

    // Students can delete their own requests. Admins can delete requests for their assigned sections.
    if (authUser.role !== "admin" && upload.uploadedBy.toString() !== authUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (authUser.role === "admin" && !canAdminManageSection(authUser, upload.section?.toString())) {
      return NextResponse.json(
        { error: "You can only delete requests for your assigned section(s)" },
        { status: 403 }
      );
    }

    await UserUpload.findByIdAndDelete(uploadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
