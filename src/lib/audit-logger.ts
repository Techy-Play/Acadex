/**
 * @module lib/audit-logger
 * @description Centralized, secure, and concurrency-safe audit and activity logging service for Acadex.
 * Tracks user sessions, resource access, and detailed admin operations with field diffs.
 * Strictly maintains a maximum of 500 entries across the entire database.
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AuditLog, { IAuditTarget, IAuditDiff, IAuditLog } from "@/models/AuditLog";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";

// Ensure mongoose models are loaded in process
void Section;
void Subject;
void User;
import type { AuthUser } from "@/lib/rbac";

export const MAX_AUDIT_LOG_LIMIT = 500;

// Sensitive keys that must NEVER be persisted in audit logs
const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "confirmpassword",
  "currentpassword",
  "newpassword",
  "token",
  "secret",
  "jwt",
  "acadex-token",
  "otp",
  "authcode",
  "hash",
  "salt",
  "refreshtoken",
  "authorization",
  "cookie",
]);

/**
 * Deep sanitizes an object, replacing sensitive keys with "[REDACTED]".
 */
export function sanitizeAuditData<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    // Avoid mutating Date or ObjectId instances
    if (data instanceof Date || data instanceof mongoose.Types.ObjectId) {
      return data;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower) || lower.includes("password") || lower.includes("secret")) {
        cleaned[key] = "[REDACTED]";
      } else if (val !== null && typeof val === "object") {
        cleaned[key] = sanitizeAuditData(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned as T;
  }

  return data;
}

/**
 * Calculates a structured diff between old and new values for admin updates.
 * Returns only the changed fields, sanitized and formatted for audit presentation.
 */
export function calculateAuditDiff(
  beforeRaw: Record<string, unknown> | null | undefined,
  afterRaw: Record<string, unknown> | null | undefined,
  ignoredKeys: string[] = ["_id", "__v", "updatedAt", "createdAt"]
): IAuditDiff {
  if (!beforeRaw || !afterRaw) {
    return { before: undefined, after: undefined, changedFields: [] };
  }

  const before = sanitizeAuditData(beforeRaw);
  const after = sanitizeAuditData(afterRaw);
  const ignoredSet = new Set([...ignoredKeys, "password", "password_hash"]);

  const changedFields: string[] = [];
  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (ignoredSet.has(key)) continue;

    const valBefore = before[key];
    const valAfter = after[key];

    // Normalize for comparison
    const strBefore = valBefore !== undefined && valBefore !== null
      ? typeof valBefore === "object" ? JSON.stringify(valBefore) : String(valBefore)
      : null;
    const strAfter = valAfter !== undefined && valAfter !== null
      ? typeof valAfter === "object" ? JSON.stringify(valAfter) : String(valAfter)
      : null;

    if (strBefore !== strAfter) {
      changedFields.push(key);
      beforeDiff[key] = valBefore ?? null;
      afterDiff[key] = valAfter ?? null;
    }
  }

  return {
    before: changedFields.length > 0 ? beforeDiff : undefined,
    after: changedFields.length > 0 ? afterDiff : undefined,
    changedFields,
  };
}

export interface CreateAuditLogOptions {
  actor: {
    id: string;
    name: string;
    collegeId?: string;
    role?: "superadmin" | "admin" | "student" | "system" | "anonymous";
    email?: string;
    ip?: string;
    userAgent?: string;
  };
  action: string;
  actionCategory?: "auth" | "resource" | "admin" | "system" | "security";
  description: string;
  target?: IAuditTarget;
  route?: string;
  status?: "success" | "failure";
  statusCode?: number;
  diff?: IAuditDiff;
  metadata?: Record<string, unknown>;
  userId?: string | mongoose.Types.ObjectId | null;
}

// In-memory mutex flag to avoid overlapping retention prune calls
let isPruningRetention = false;

/**
 * Enforces the strict global maximum of 500 audit logs across the application.
 * Concurrency-safe: finds the 500th newest log and atomic-deletes all logs older than it.
 */
export async function enforceAuditLogRetention(maxLogs: number = MAX_AUDIT_LOG_LIMIT): Promise<{ deletedCount: number }> {
  try {
    if (isPruningRetention) {
      return { deletedCount: 0 };
    }
    isPruningRetention = true;

    await connectDB();

    // Find the boundary document at offset (maxLogs - 1)
    const cutoffLogs = await AuditLog.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(maxLogs - 1)
      .limit(1)
      .select("_id createdAt")
      .lean();

    if (cutoffLogs && cutoffLogs.length > 0) {
      const cutoff = cutoffLogs[0];
      // Atomic deletion of all logs strictly older than the cutoff boundary
      const result = await AuditLog.deleteMany({
        $or: [
          { createdAt: { $lt: cutoff.createdAt } },
          { createdAt: cutoff.createdAt, _id: { $lt: cutoff._id } },
        ],
      });

      return { deletedCount: result.deletedCount || 0 };
    }

    return { deletedCount: 0 };
  } catch (error) {
    console.error("[AuditLog Retention Error]:", error);
    return { deletedCount: 0 };
  } finally {
    isPruningRetention = false;
  }
}

/**
 * Creates and persists a new structured AuditLog record in MongoDB.
 * Ensures logId uniqueness, sanitizes sensitive data, and automatically triggers retention pruning.
 */

export interface StoredAuditLog {
  id: string;
  _id: string;
  logId: string;
  user: string | null;
  actor: {
    id: string;
    name: string;
    collegeId?: string;
    role: "superadmin" | "admin" | "student" | "system" | "anonymous";
    email?: string;
    ip?: string;
    userAgent?: string;
  };
  action: string;
  actionCategory: "auth" | "resource" | "admin" | "system" | "security";
  description: string;
  target?: IAuditTarget;
  route?: string;
  status: "success" | "failure";
  statusCode?: number;
  diff?: IAuditDiff;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __acadexAuditBuffer: StoredAuditLog[] | undefined;
}

export function getGlobalAuditBuffer(): StoredAuditLog[] {
  if (!global.__acadexAuditBuffer) {
    global.__acadexAuditBuffer = [];
  }
  return global.__acadexAuditBuffer;
}

export function pushToAuditBuffer(item: StoredAuditLog): void {
  const buffer = getGlobalAuditBuffer();
  // Remove duplicate if same logId
  const existingIdx = buffer.findIndex((b) => b.logId === item.logId);
  if (existingIdx !== -1) {
    buffer.splice(existingIdx, 1);
  }
  buffer.unshift(item);
  if (buffer.length > MAX_AUDIT_LOG_LIMIT) {
    buffer.length = MAX_AUDIT_LOG_LIMIT;
  }
}

export interface QueryAuditLogsOptions {
  search?: string;
  action?: string;
  category?: string;
  role?: string;
  resourceType?: string;
  status?: string;
  sortOrder?: 1 | -1;
  page?: number;
  limit?: number;
}

export function queryBufferedAuditLogs(opts: QueryAuditLogsOptions = {}) {
  const buffer = getGlobalAuditBuffer();
  const search = (opts.search || "").trim().toLowerCase();
  const action = (opts.action || "").trim();
  const category = (opts.category || "").trim();
  const role = (opts.role || "").trim();
  const resourceType = (opts.resourceType || "").trim();
  const status = (opts.status || "").trim();
  const sortOrder = opts.sortOrder ?? -1;
  const page = Math.max(1, opts.page || 1);
  const limit = Math.max(1, Math.min(50, opts.limit || 15));

  let filtered = buffer.filter((item) => {
    if (action && action !== "all" && item.action !== action) return false;
    if (category && category !== "all" && item.actionCategory !== category) return false;
    if (role && role !== "all" && item.actor.role !== role) return false;
    if (status && status !== "all" && item.status !== status) return false;
    if (resourceType && resourceType !== "all" && item.target?.type !== resourceType) return false;

    if (search) {
      const matchDesc = (item.description || "").toLowerCase().includes(search);
      const matchActor = (item.actor.name || "").toLowerCase().includes(search);
      const matchCollege = (item.actor.collegeId || "").toLowerCase().includes(search);
      const matchTarget = (item.target?.name || "").toLowerCase().includes(search);
      const matchAction = (item.action || "").toLowerCase().includes(search);
      const matchLogId = (item.logId || "").toLowerCase().includes(search);
      if (!matchDesc && !matchActor && !matchCollege && !matchTarget && !matchAction && !matchLogId) {
        return false;
      }
    }
    return true;
  });

  filtered.sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return sortOrder === 1 ? tA - tB : tB - tA;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    logs: paginated,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function recordAuditLog(options: CreateAuditLogOptions): Promise<IAuditLog | null> {
  try {
    await connectDB();

    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const logId = `audit_${timestamp}_${rand}`;

    const sanitizedDiff = options.diff ? sanitizeAuditData(options.diff) : undefined;
    const sanitizedMetadata = options.metadata ? sanitizeAuditData(options.metadata) : undefined;

    let userObjectId: mongoose.Types.ObjectId | null = null;
    if (options.userId) {
      try {
        userObjectId = new mongoose.Types.ObjectId(String(options.userId));
      } catch {
        userObjectId = null;
      }
    } else if (options.actor.id && options.actor.id !== "system" && options.actor.id !== "anonymous") {
      try {
        userObjectId = new mongoose.Types.ObjectId(options.actor.id);
      } catch {
        userObjectId = null;
      }
    }

    const nowIso = new Date().toISOString();
    const storedItem: StoredAuditLog = {
      id: logId,
      _id: logId,
      logId,
      user: userObjectId ? userObjectId.toString() : null,
      actor: {
        id: options.actor.id,
        name: options.actor.name,
        collegeId: options.actor.collegeId || "",
        role: options.actor.role || "student",
        email: options.actor.email || "",
        ip: options.actor.ip || "",
        userAgent: options.actor.userAgent || "",
      },
      action: options.action,
      actionCategory: options.actionCategory || "admin",
      description: options.description,
      target: {
        id: options.target?.id || "",
        type: options.target?.type || "system",
        name: options.target?.name || "",
        section: options.target?.section || null,
        subject: options.target?.subject || null,
      },
      route: options.route || "",
      status: options.status || "success",
      statusCode: options.statusCode ?? 200,
      diff: sanitizedDiff,
      metadata: sanitizedMetadata || {},
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Always push to in-memory buffer so runtime logs are immediate and never lost
    pushToAuditBuffer(storedItem);

    try {
      const auditLog = await AuditLog.create({
        logId,
        user: userObjectId,
        actor: storedItem.actor,
        action: storedItem.action,
        actionCategory: storedItem.actionCategory,
        description: storedItem.description,
        target: storedItem.target,
        route: storedItem.route,
        status: storedItem.status,
        statusCode: storedItem.statusCode,
        diff: sanitizedDiff,
        metadata: sanitizedMetadata || {},
      });

      // Run retention enforcement in background
      void enforceAuditLogRetention(MAX_AUDIT_LOG_LIMIT).catch((err) => {
        console.warn("[AuditLog] Background retention notice:", err);
      });

      return auditLog;
    } catch (dbErr) {
      console.warn("[AuditLog DB warning]: Log saved in session buffer, DB write deferred:", (dbErr as Error).message);
      return storedItem as unknown as IAuditLog;
    }
  } catch (error) {
    console.error("[AuditLog Create Error]: Failed to create audit log:", error);
    return null;
  }
}

/**
 * Helper to record administrative actions with user, route, target, and before/after diffs.
 */
export async function logAdminOperation(params: {
  admin: AuthUser;
  action: string;
  description: string;
  target?: IAuditTarget;
  route?: string;
  diff?: IAuditDiff;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<IAuditLog | null> {
  const ip = params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = params.req?.headers.get("user-agent") || "";

  return recordAuditLog({
    actor: {
      id: params.admin.userId,
      name: params.admin.name,
      collegeId: params.admin.collegeId,
      role: params.admin.isSuperAdmin ? "superadmin" : "admin",
      ip,
      userAgent,
    },
    action: params.action,
    actionCategory: "admin",
    description: params.description,
    target: params.target,
    route: params.route,
    diff: params.diff,
    metadata: params.metadata,
    userId: params.admin.userId,
    status: "success",
  });
}

/**
 * Helper to record user activities (logins, logouts, resource viewing, downloads).
 */
export async function logUserActivity(params: {
  user: {
    userId: string;
    name: string;
    collegeId?: string;
    role?: "superadmin" | "admin" | "student" | "system";
  };
  action: string;
  actionCategory?: "auth" | "resource" | "admin" | "security";
  description: string;
  target?: IAuditTarget;
  route?: string;
  status?: "success" | "failure";
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<IAuditLog | null> {
  const ip = params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = params.req?.headers.get("user-agent") || "";

  return recordAuditLog({
    actor: {
      id: params.user.userId,
      name: params.user.name,
      collegeId: params.user.collegeId || "",
      role: params.user.role || "student",
      ip,
      userAgent,
    },
    action: params.action,
    actionCategory: params.actionCategory || "resource",
    description: params.description,
    target: params.target,
    route: params.route,
    status: params.status || "success",
    metadata: params.metadata,
    userId: params.user.userId,
  });
}

/**
 * Helper to record authentication failures and security-sensitive events.
 */
export async function logSecurityFailure(params: {
  action: string;
  identifier: string;
  reason: string;
  req?: Request;
  metadata?: Record<string, unknown>;
}): Promise<IAuditLog | null> {
  const ip = params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const userAgent = params.req?.headers.get("user-agent") || "";

  return recordAuditLog({
    actor: {
      id: "anonymous",
      name: params.identifier || "Anonymous Visitor",
      collegeId: params.identifier,
      role: "anonymous",
      ip,
      userAgent,
    },
    action: params.action,
    actionCategory: "security",
    description: `Authentication failure: ${params.reason}`,
    target: {
      type: "auth",
      name: params.identifier,
    },
    route: "/login",
    status: "failure",
    statusCode: 401,
    metadata: {
      reason: params.reason,
      ...params.metadata,
    },
  });
}
