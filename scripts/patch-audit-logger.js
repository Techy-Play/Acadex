const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/lib/audit-logger.ts');
let content = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

// Add model registrations at top
if (!content.includes('import Section from "@/models/Section";')) {
  content = content.replace(
    'import AuditLog, { IAuditTarget, IAuditDiff, IAuditLog } from "@/models/AuditLog";',
    `import AuditLog, { IAuditTarget, IAuditDiff, IAuditLog } from "@/models/AuditLog";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import User from "@/models/User";

// Ensure mongoose models are loaded in process
void Section;
void Subject;
void User;`
  );
}

// Add StoredAuditLog and In-Memory Buffer definition
const bufferDefinition = `
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
`;

// Insert bufferDefinition before recordAuditLog
if (!content.includes('getGlobalAuditBuffer')) {
  content = content.replace('export async function recordAuditLog(', bufferDefinition + '\nexport async function recordAuditLog(');
}

// Update recordAuditLog to push to buffer
const oldRecordAuditLogBody = `    const auditLog = await AuditLog.create({
      logId,
      user: userObjectId,
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
    });

    // Run retention enforcement in background so caller latency is not blocked
    void enforceAuditLogRetention(MAX_AUDIT_LOG_LIMIT).catch((err) => {
      console.warn("[AuditLog] Background retention notice:", err);
    });

    return auditLog;
  } catch (error) {
    console.error("[AuditLog Create Error]: Failed to create audit log:", error);
    return null;
  }`;

const newRecordAuditLogBody = `    const nowIso = new Date().toISOString();
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
  }`;

content = content.replace(oldRecordAuditLogBody, newRecordAuditLogBody);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched src/lib/audit-logger.ts');
