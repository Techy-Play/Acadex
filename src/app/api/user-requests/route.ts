/* ================================================================== *
 *  /api/user-requests  — CRUD for student resource requests          *
 *                                                                    *
 *  GET    — list requests (+ student's own live resources)           *
 *  POST   — submit a new request (student) or direct-create (admin) *
 *  PATCH  — review a pending request  (admin only)                  *
 *  DELETE — remove request record(s)                                 *
 * ================================================================== */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import UserRequest from "@/models/UserRequest";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import Practical from "@/models/Practical";
import Subject from "@/models/Subject";
import User from "@/models/User";
import Notification from "@/models/Notification";
import ActivityLog from "@/models/ActivityLog";

/* ------------------------------------------------------------------ *
 *  Helpers                                                           *
 * ------------------------------------------------------------------ */

/** Validate the action field strictly — returns null if invalid */
function validateAction(
  raw: unknown
): "add" | "update" | "remove" | null {
  if (raw === "add" || raw === "update" || raw === "remove") return raw;
  return null;
}

/** Validate the resource type */
function validateResourceType(
  raw: unknown
): "note" | "assignment" | "practical" | null {
  if (raw === "note" || raw === "assignment" || raw === "practical") return raw;
  return null;
}

/** Pick the correct Mongoose model for a resource type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getResourceModel(type: "note" | "assignment" | "practical"): any {
  switch (type) {
    case "note":
      return Note;
    case "assignment":
      return Assignment;
    case "practical":
      return Practical;
  }
}

/** Convert a Google-Drive URL to its embeddable /preview form */
function toEmbedUrl(url: string): string {
  // Handle /file/d/{ID}/... patterns
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  // Handle id= query-string patterns
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch)
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return url;
}

import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";

/* ================================================================== *
 *  GET  — list requests  (+ student's own live resources)            *
 * ================================================================== */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl;
    const actionFilter = url.searchParams.get("action"); // add | update | remove
    const statusFilter = url.searchParams.get("status"); // pending | approved | denied
    const typeFilter = url.searchParams.get("resourceType"); // note | assignment | practical

    /* ---------- build query ---------- */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (authUser.role === "admin") {
      // Sub-admins see only their assigned sections; super-admins see everything
      if (!authUser.isSuperAdmin) {
        query.section = {
          $in: authUser.effectiveSectionIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }
    } else {
      // Students only see their own requests
      query.uploadedBy = authUser.userId;
    }

    if (actionFilter && validateAction(actionFilter)) {
      query.action = actionFilter;
    }
    if (
      statusFilter &&
      ["pending", "approved", "denied"].includes(statusFilter)
    ) {
      query.status = statusFilter;
    }
    if (typeFilter && validateResourceType(typeFilter)) {
      query.resourceType = typeFilter;
    }

    /* ---------- fetch requests ---------- */
    const requests = await UserRequest.find(query)
      .populate("uploadedBy", "name college_id")
      .populate("subject", "name semester")
      .populate("section", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    /* ---------- student's own live resources ---------- */
    let yourResources: Record<string, unknown>[] = [];

    if (authUser.role === "student") {
      const [notes, assignments, practicals] = await Promise.all([
        Note.find({ uploadedBy: authUser.userId })
          .populate("subject", "name semester")
          .lean(),
        Assignment.find({ uploadedBy: authUser.userId })
          .populate("subject", "name semester")
          .lean(),
        Practical.find({ uploadedBy: authUser.userId })
          .populate("subject", "name semester")
          .lean(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged: any[] = [
        ...notes.map((n) => {
          const doc = n as unknown as Record<string, unknown>;
          return { ...doc, resourceType: "note", createdAt: doc.uploadedAt ?? doc.createdAt };
        }),
        ...assignments.map((a) => {
          const doc = a as unknown as Record<string, unknown>;
          return { ...doc, resourceType: "assignment" };
        }),
        ...practicals.map((p) => {
          const doc = p as unknown as Record<string, unknown>;
          return { ...doc, resourceType: "practical" };
        }),
      ];
      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      yourResources = merged;
    }

    return NextResponse.json({ requests, yourResources });
  } catch (err) {
    console.error("[GET /api/user-requests]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ================================================================== *
 *  POST  — submit a new request  (or admin direct-create)            *
 * ================================================================== */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      action: actionRaw,
      resourceType: resourceTypeRaw,
      resourceId,
      title,
      description,
      file_url,
      subject,
      section: sectionRaw,
      deadline,
    } = body;

    /* ---------- validate action ---------- */
    const action = validateAction(actionRaw);
    if (!action) {
      return NextResponse.json(
        { error: 'Invalid action — must be "add", "update", or "remove"' },
        { status: 400 }
      );
    }

    /* ---------- validate resource type ---------- */
    const resourceType = validateResourceType(resourceTypeRaw);
    if (!resourceType) {
      return NextResponse.json(
        {
          error:
            'Invalid resource type — must be "note", "assignment", or "practical"',
        },
        { status: 400 }
      );
    }

    /* ---------- validate required fields ---------- */
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!file_url || typeof file_url !== "string" || !file_url.trim()) {
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

    /* ---------- for update/remove: resourceId is required ---------- */
    if ((action === "update" || action === "remove") && !resourceId) {
      return NextResponse.json(
        { error: "Resource ID is required for update/remove requests" },
        { status: 400 }
      );
    }

    /* ---------- determine section ---------- */
    let section: string | null = null;
    if (authUser.role === "admin") {
      if (authUser.isSuperAdmin) {
        section = sectionRaw || null;
      } else {
        if (sectionRaw) {
          if (!canAdminManageSection(authUser, sectionRaw)) {
            return NextResponse.json(
              { error: "Cannot create resource in an unassigned section" },
              { status: 403 }
            );
          }
          section = sectionRaw;
        } else {
          section = authUser.effectiveSectionIds[0] || null;
        }
      }
    } else {
      section = authUser.section || null;
    }

    /* ============================================================== *
     *  ADMIN  — direct-create (bypass the request queue)             *
     * ============================================================== */
    if (authUser.role === "admin") {
      const Model = getResourceModel(resourceType);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docData: Record<string, any> = {
        title: title.trim(),
        subject,
        section,
        uploadedBy: authUser.userId,
        file_url: file_url.trim(),
      };
      if (description) docData.description = description;
      if (resourceType === "assignment" && deadline) {
        docData.deadline = new Date(deadline);
      }

      const resource = await Model.create(docData);

      // Log activity
      const actionLabel = resourceType.toUpperCase() + "_ADDED";
      await ActivityLog.create({
        user: authUser.userId,
        action: actionLabel,
        details: `Admin added ${resourceType}: "${title.trim()}"`,
        section,
      });

      // Notify students
      const notifTypeMap: Record<string, string> = {
        note: "new_note",
        assignment: "new_assignment",
        practical: "new_practical",
      };
      let subjectName = "";
      if (subject) {
        const subDoc = await Subject.findById(subject).select("name").lean();
        if (subDoc?.name) subjectName = subDoc.name;
      }
      const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
      await Notification.create({
        type: notifTypeMap[resourceType],
        title: `${subjectPrefix}New ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Added`,
        message: `${subjectPrefix}"${title.trim()}" has been added to ${resourceType}s.`,
        targetRole: "student",
        link: `/user/dashboard/${resourceType === "note" ? "notes" : resourceType + "s"}`,
      });

      return NextResponse.json(
        { directCreate: true, resource },
        { status: 201 }
      );
    }

    /* ============================================================== *
     *  STUDENT  — create a request for admin review                  *
     * ============================================================== */

    // For update/remove: verify the target resource exists & student owns it
    if (action === "update" || action === "remove") {
      const Model = getResourceModel(resourceType);
      const targetResource = await Model.findById(resourceId).lean();

      if (!targetResource) {
        return NextResponse.json(
          { error: "Target resource not found" },
          { status: 404 }
        );
      }

      const ownerId = String(
        (targetResource as Record<string, unknown>).uploadedBy ?? ""
      );
      if (ownerId !== authUser.userId) {
        return NextResponse.json(
          { error: "You can only request changes to your own resources" },
          { status: 403 }
        );
      }

      // For update: at least one field must differ
      if (action === "update") {
        const t = targetResource as Record<string, unknown>;
        const sameTitle = String(t.title) === title.trim();
        const sameFile = String(t.file_url) === file_url.trim();
        const sameDesc =
          String(t.description ?? "") === (description ?? "").trim();
        if (sameTitle && sameFile && sameDesc) {
          return NextResponse.json(
            { error: "No changes detected — at least one field must differ" },
            { status: 400 }
          );
        }
      }

      // Duplicate-pending check
      const existingPending = await UserRequest.findOne({
        uploadedBy: authUser.userId,
        action,
        resourceId,
        status: "pending",
      });
      if (existingPending) {
        return NextResponse.json(
          {
            error: `You already have a pending ${action} request for this resource`,
          },
          { status: 409 }
        );
      }
    }

    // For add: duplicate-pending check (same title + subject)
    if (action === "add") {
      const existingPending = await UserRequest.findOne({
        uploadedBy: authUser.userId,
        action: "add",
        title: title.trim(),
        subject,
        status: "pending",
      });
      if (existingPending) {
        return NextResponse.json(
          { error: "You already have a pending add request with that title" },
          { status: 409 }
        );
      }
    }

    // Create the request
    const newRequest = await UserRequest.create({
      action,
      resourceType,
      resourceId: resourceId || null,
      title: title.trim(),
      description: (description ?? "").trim(),
      file_url: file_url.trim(),
      subject,
      section,
      uploadedBy: authUser.userId,
      deadline:
        resourceType === "assignment" && deadline
          ? new Date(deadline)
          : null,
    });

    // Notify relevant admins (section admins + super-admins)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminQuery: Record<string, any> = { role: "admin", status: "active" };
    if (section) {
      adminQuery.$or = [
        { isSuperAdmin: true },
        { section },
        { assignedSections: section },
      ];
    }
    const admins = await User.find(adminQuery).select("_id");
    const adminIds = admins.map((a) => a._id);

    if (adminIds.length > 0) {
      let subjectName = "";
      if (subject) {
        const subDoc = await Subject.findById(subject).select("name").lean();
        if (subDoc?.name) subjectName = subDoc.name;
      }
      const subjectPrefix = subjectName ? `[${subjectName}] ` : "";

      const actionLabels: Record<string, string> = {
        add: "Add",
        update: "Update",
        remove: "Remove",
      };
      await Notification.create({
        type: "admin_message",
        title: `${subjectPrefix}New ${actionLabels[action]} Request`,
        message: `${subjectPrefix}A student has submitted a ${action} request for ${resourceType}: "${title.trim()}"`,
        targetUsers: adminIds,
        link: "/admin/user-requests",
      });
    }

    return NextResponse.json(
      { success: true, request: newRequest },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/user-requests]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ================================================================== *
 *  PATCH  — review a pending request  (admin only)                   *
 * ================================================================== */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const authResult = await requireAdmin(req);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    const body = await req.json();
    const {
      requestId,
      decision,
      reviewNote,
    }: {
      requestId: string;
      decision: "approve" | "deny";
      reviewNote?: string;
    } = body;

    if (!requestId || !["approve", "deny"].includes(decision)) {
      return NextResponse.json(
        { error: "requestId and decision (approve | deny) are required" },
        { status: 400 }
      );
    }

    // Atomically lock the request to prevent double-approval duplicates
    const request = await UserRequest.findOneAndUpdate(
      { _id: requestId, status: "pending" },
      { status: "processing" },
      { new: true }
    );

    if (!request) {
      const existing = await UserRequest.findById(requestId);
      if (!existing) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "This request has already been reviewed or is currently being processed" },
        { status: 400 }
      );
    }
    
    // Sub-admins can only approve/deny requests belonging to their assigned section(s)
    if (!canAdminManageSection(authUser, request.section?.toString())) {
      // Rollback the processing lock
      await UserRequest.findByIdAndUpdate(requestId, { status: "pending" });
      return NextResponse.json(
        { error: "You can only review requests for your assigned section(s)" },
        { status: 403 }
      );
    }

    const { action, resourceType } = request;
    const Model = getResourceModel(resourceType);

    /* ---------- APPROVE ---------- */
    if (decision === "approve") {
      switch (action) {
        /* --- add: create the resource --- */
        case "add": {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const docData: Record<string, any> = {
            title: request.title,
            subject: request.subject,
            section: request.section,
            uploadedBy: request.uploadedBy,
            file_url: request.file_url,
          };
          if (request.description) docData.description = request.description;
          if (resourceType === "assignment" && request.deadline) {
            docData.deadline = request.deadline;
          }
          const created = await Model.create(docData);
          // Store the new resource's ID back on the request
          if (created?._id) {
            request.resourceId = created._id;
          }
          break;
        }

        /* --- update: patch the existing resource --- */
        case "update": {
          if (!request.resourceId) {
            return NextResponse.json(
              { error: "Cannot approve update — no linked resource" },
              { status: 400 }
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: Record<string, any> = {
            title: request.title,
            file_url: request.file_url,
          };
          if (request.description) updateData.description = request.description;
          if (request.subject) updateData.subject = request.subject;
          if (resourceType === "assignment" && request.deadline) {
            updateData.deadline = request.deadline;
          }
          const updated = await Model.findByIdAndUpdate(
            request.resourceId,
            updateData,
            { new: true }
          );
          if (!updated) {
            return NextResponse.json(
              { error: "Target resource no longer exists" },
              { status: 404 }
            );
          }
          break;
        }

        /* --- remove: delete the resource --- */
        case "remove": {
          if (!request.resourceId) {
            return NextResponse.json(
              { error: "Cannot approve remove — no linked resource" },
              { status: 400 }
            );
          }
          const deleted = await Model.findByIdAndDelete(request.resourceId);
          if (!deleted) {
            return NextResponse.json(
              { error: "Target resource no longer exists" },
              { status: 404 }
            );
          }
          break;
        }
      }

      // Mark as approved
      request.status = "approved";
      request.reviewNote = (reviewNote ?? "").trim();
      request.reviewedBy = new mongoose.Types.ObjectId(authUser.userId);
      await request.save();

      // Activity log
      await ActivityLog.create({
        user: authUser.userId,
        action: "USER_REQUEST_APPROVED",
        details: `Approved ${action} request for ${resourceType}: "${request.title}"`,
        section: request.section,
      });

      // Notify student
      let requestSubjectName = "";
      if (request.subject) {
        const subDoc = await Subject.findById(request.subject).select("name").lean();
        if (subDoc?.name) requestSubjectName = subDoc.name;
      }
      const requestSubjectPrefix = requestSubjectName ? `[${requestSubjectName}] ` : "";

      const actionLabels: Record<string, string> = {
        add: "add",
        update: "update",
        remove: "remove",
      };
      await Notification.create({
        type: "request_approved",
        title: `${requestSubjectPrefix}Request Approved`,
        message: `${requestSubjectPrefix}Your ${actionLabels[action]} request for ${resourceType} "${request.title}" has been approved.${
          reviewNote ? ` Note: ${reviewNote.trim()}` : ""
        }`,
        targetUsers: [request.uploadedBy],
        link: "/user/dashboard/requests",
      });

      return NextResponse.json({ success: true, status: "approved" });
    }

    /* ---------- DENY ---------- */
    request.status = "denied";
    request.reviewNote = (reviewNote ?? "").trim();
    request.reviewedBy = new mongoose.Types.ObjectId(authUser.userId);
    await request.save();

    await ActivityLog.create({
      user: authUser.userId,
      action: "USER_REQUEST_DENIED",
      details: `Denied ${action} request for ${resourceType}: "${request.title}"`,
      section: request.section,
    });

    let requestSubjectName = "";
    if (request.subject) {
      const subDoc = await Subject.findById(request.subject).select("name").lean();
      if (subDoc?.name) requestSubjectName = subDoc.name;
    }
    const requestSubjectPrefix = requestSubjectName ? `[${requestSubjectName}] ` : "";

    await Notification.create({
      type: "request_denied",
      title: `${requestSubjectPrefix}Request Denied`,
      message: `${requestSubjectPrefix}Your ${action} request for ${resourceType} "${request.title}" has been denied.${
        reviewNote ? ` Reason: ${reviewNote.trim()}` : ""
      }`,
      targetUsers: [request.uploadedBy],
      link: "/user/dashboard/requests",
    });

    return NextResponse.json({ success: true, status: "denied" });
  } catch (err) {
    console.error("[PATCH /api/user-requests]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ================================================================== *
 *  DELETE  — remove request record(s)                                *
 * ================================================================== */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl;
    const id = url.searchParams.get("id");
    const mode = url.searchParams.get("mode"); // "all" | "approved" | "denied"

    /* ---------- bulk clear (students only) ---------- */
    if (mode && !id) {
      if (authUser.role !== "student") {
        return NextResponse.json(
          { error: "Bulk clear is for students only" },
          { status: 403 }
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: Record<string, any> = { uploadedBy: authUser.userId };
      if (mode === "approved") filter.status = "approved";
      else if (mode === "denied") filter.status = "denied";
      // "all" = no extra status filter

      const result = await UserRequest.deleteMany(filter);
      return NextResponse.json({
        success: true,
        deleted: result.deletedCount,
      });
    }

    /* ---------- single delete ---------- */
    if (!id) {
      return NextResponse.json(
        { error: "Provide ?id= or ?mode= parameter" },
        { status: 400 }
      );
    }

    const request = await UserRequest.findById(id);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Students can only delete their own requests
    if (authUser.role === "student" && String(request.uploadedBy) !== authUser.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admins can only delete requests in their assigned sections
    if (authUser.role === "admin" && !canAdminManageSection(authUser, request.section?.toString())) {
      return NextResponse.json(
        { error: "You can only delete requests for your assigned section(s)" },
        { status: 403 }
      );
    }

    await UserRequest.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/user-requests]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
