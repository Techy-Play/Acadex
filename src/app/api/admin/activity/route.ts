/**
 * @module API/Admin/Activity
 * @description Admin audit and activity log API.
 * Supports search, multi-field filtering, sorting, server-side pagination,
 * section-scoped RBAC, and real-time session buffering.
 * Strictly avoids showing fake dummy mock logs on refresh or pagination.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { requireAdmin } from "@/lib/rbac";
import {
  queryBufferedAuditLogs,
  getGlobalAuditBuffer,
  pushToAuditBuffer,
  StoredAuditLog,
} from "@/lib/audit-logger";

// Pre-load Mongoose models so population never throws MissingSchemaError
void Section;
void Subject;
void User;
void ActivityLog;

// GET /api/admin/activity — Fetch filtered, sorted, paginated audit logs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Filter params
  const search = (searchParams.get("search") || "").trim();
  const action = (searchParams.get("action") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const role = (searchParams.get("role") || "").trim();
  const resourceType = (searchParams.get("resourceType") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const startDate = (searchParams.get("startDate") || "").trim();
  const endDate = (searchParams.get("endDate") || "").trim();

  // Sort param: newest (default) or oldest
  const sortOrder = searchParams.get("sort") === "oldest" ? 1 : -1;

  // Pagination params: safe bounds
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15));
  const skip = (page - 1) * limit;

  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    await connectDB();

    // Build Mongoose filter
    const filter: Record<string, unknown> = {};

    // 1. RBAC Section Scoping: Sub-admins only see logs within their assigned sections or global logs
    if (!authUser.isSuperAdmin && authUser.effectiveSectionIds.length > 0) {
      const validObjectIds = authUser.effectiveSectionIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      filter.$or = [
        { "target.section": { $in: [...validObjectIds, ...authUser.effectiveSectionIds] } },
        { "target.section": null },
        { "target.section": { $exists: false } },
      ];
    }

    // 2. Action Code Filter
    if (action && action !== "all") {
      filter.action = action;
    }

    // 3. Category Filter
    if (category && category !== "all") {
      filter.actionCategory = category;
    }

    // 4. Role Filter
    if (role && role !== "all") {
      filter["actor.role"] = role;
    }

    // 5. Resource / Target Type Filter
    if (resourceType && resourceType !== "all") {
      filter["target.type"] = resourceType;
    }

    // 6. Status Filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // 7. Date Range Filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          dateFilter.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    // 8. Search query: text search on indexed fields
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      const searchConditions = [
        { description: searchRegex },
        { "actor.name": searchRegex },
        { "actor.collegeId": searchRegex },
        { "target.name": searchRegex },
        { action: searchRegex },
        { logId: searchRegex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // Query AuditLog collection
    const total = await AuditLog.countDocuments(filter);

    if (total > 0) {
      // Execute query with lean()
      const query = AuditLog.find(filter)
        .sort({ createdAt: sortOrder, _id: sortOrder })
        .skip(skip)
        .limit(limit)
        .select(
          "logId actor action actionCategory description target route status statusCode diff metadata createdAt"
        )
        .lean();

      const logs = await query;

      // Sync into memory buffer so session cache stays fresh
      for (const item of logs) {
        const mappedItem: StoredAuditLog = {
          id: item.logId || item._id.toString(),
          _id: item._id.toString(),
          logId: item.logId || `audit_${item._id.toString()}`,
          user: null,
          actor: item.actor || { id: "unknown", name: "System", role: "system" },
          action: item.action,
          actionCategory: item.actionCategory || "admin",
          description: item.description,
          target: item.target,
          route: item.route,
          status: item.status || "success",
          statusCode: item.statusCode || 200,
          diff: item.diff,
          metadata: item.metadata,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
        };
        pushToAuditBuffer(mappedItem);
      }

      const mapped = logs.map((a) => ({
        id: a.logId || a._id.toString(),
        _id: a._id.toString(),
        logId: a.logId || `audit_${a._id.toString()}`,
        action: a.action,
        actionCategory: a.actionCategory || "admin",
        details: a.description,
        description: a.description,
        user: a.actor
          ? {
              name: a.actor.name,
              college_id: a.actor.collegeId || "",
              role: a.actor.role || "student",
            }
          : null,
        actor: a.actor,
        target: a.target,
        route: a.route,
        status: a.status || "success",
        diff: a.diff,
        metadata: a.metadata,
        createdAt: a.createdAt,
      }));

      return NextResponse.json({
        logs: mapped,
        activities: mapped,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }

    // If AuditLog collection is empty in MongoDB, check legacy ActivityLog collection
    const legacyCount = await ActivityLog.countDocuments();
    if (legacyCount > 0) {
      const legacyLogs = await ActivityLog.find()
        .populate("user", "name college_id role")
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean();

      const mappedLegacy = legacyLogs.map((l) => {
        const userObj = l.user as { name?: string; college_id?: string; role?: string; _id?: mongoose.Types.ObjectId } | null;
        return {
          id: l._id.toString(),
          _id: l._id.toString(),
          logId: `legacy_${l._id.toString()}`,
          action: l.action || "LEGACY_ACTIVITY",
          actionCategory: "admin" as const,
          details: l.details || l.action,
          description: l.details || l.action,
          user: userObj
            ? {
                name: userObj.name || "Administrator",
                college_id: userObj.college_id || "",
                role: (userObj.role as "admin" | "student") || "admin",
              }
            : null,
          actor: {
            id: userObj?._id?.toString() || "system",
            name: userObj?.name || "System Administrator",
            collegeId: userObj?.college_id || "",
            role: (userObj?.role as "admin" | "student") || "admin",
          },
          target: {
            type: "system" as const,
            name: l.action,
          },
          route: "/admin",
          status: "success" as const,
          createdAt: l.createdAt,
        };
      });

      return NextResponse.json({
        logs: mappedLegacy,
        activities: mappedLegacy,
        pagination: {
          total: legacyCount,
          page,
          limit,
          totalPages: Math.ceil(legacyCount / limit) || 1,
        },
      });
    }

    // Fall back to runtime in-memory session buffer if DB has no records
    const bufferedResult = queryBufferedAuditLogs({
      search,
      action,
      category,
      role,
      resourceType,
      status,
      sortOrder,
      page,
      limit,
    });

    const mappedBuffered = bufferedResult.logs.map((a) => ({
      ...a,
      details: a.description,
      user: {
        name: a.actor.name,
        college_id: a.actor.collegeId || "",
        role: a.actor.role || "student",
      },
    }));

    return NextResponse.json({
      logs: mappedBuffered,
      activities: mappedBuffered,
      pagination: {
        total: bufferedResult.total,
        page: bufferedResult.page,
        limit: bufferedResult.limit,
        totalPages: bufferedResult.totalPages,
      },
    });
  } catch (error) {
    console.error("[Get Activity API warning]: Database unavailable, serving session buffer:", (error as Error).message);

    // Serve session buffer on DB error — NEVER fake mock data
    const bufferedResult = queryBufferedAuditLogs({
      search,
      action,
      category,
      role,
      resourceType,
      status,
      sortOrder,
      page,
      limit,
    });

    const mappedBuffered = bufferedResult.logs.map((a) => ({
      ...a,
      details: a.description,
      user: {
        name: a.actor.name,
        college_id: a.actor.collegeId || "",
        role: a.actor.role || "student",
      },
    }));

    return NextResponse.json({
      logs: mappedBuffered,
      activities: mappedBuffered,
      pagination: {
        total: bufferedResult.total,
        page: bufferedResult.page,
        limit: bufferedResult.limit,
        totalPages: bufferedResult.totalPages,
      },
    });
  }
}
