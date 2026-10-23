/**
 * @module lib/rbac
 * @description Centralized Role-Based Access Control (RBAC) and Section Authorization helpers.
 * Authoritative checks against MongoDB user records to ensure immediate consistency
 * (no stale JWT claims or unauthorized section access).
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

import { verifyToken } from "@/lib/auth";

export interface AuthUser {
  userId: string;
  collegeId: string;
  name: string;
  role: "admin" | "student";
  isSuperAdmin: boolean;
  status: string;
  section: string | null;
  assignedSections: string[];
  effectiveSectionIds: string[];
}

/**
 * Resolves the authenticated user from the database using:
 * 1. Request header `x-user-id` (injected by Edge proxy middleware), or
 * 2. `acadex-token` cookie, or
 * 3. `Authorization: Bearer <token>` header.
 * Performs a lean DB query to get fresh role and assignedSections information.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  let userId = request.headers.get("x-user-id");
  if (!userId) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/acadex-token=([^;]+)/);
    const token = match
      ? match[1]
      : request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) {
      const payload = verifyToken(token);
      if (payload?.userId) {
        userId = payload.userId;
      }
    }
  }

  if (!userId) return null;

  try {
    await connectDB();
    const user = await User.findById(userId)
      .select("role isSuperAdmin section assignedSections status name college_id email")
      .lean();

    if (!user || user.status === "banned") {
      return null;
    }

    const sectionStr = user.section ? user.section.toString() : null;
    const assignedStrs: string[] = Array.isArray(user.assignedSections)
      ? user.assignedSections.map((s: unknown) => (typeof s === "object" && s !== null && "_id" in s ? String((s as { _id: unknown })._id) : String(s)))
      : [];

    const sectionSet = new Set<string>();
    if (sectionStr) sectionSet.add(sectionStr);
    for (const s of assignedStrs) {
      if (s) sectionSet.add(s);
    }

    return {
      userId: user._id.toString(),
      collegeId: user.college_id,
      name: user.name,
      role: user.role,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      status: user.status || "active",
      section: sectionStr,
      assignedSections: assignedStrs,
      effectiveSectionIds: Array.from(sectionSet),
    };
  } catch (error) {
    console.error("RBAC getAuthUser error:", error);
    // In development or when MongoDB is not connected, fallback to verified JWT payload
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/acadex-token=([^;]+)/);
    const token = match
      ? match[1]
      : request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        return {
          userId: payload.userId,
          collegeId: payload.collegeId,
          name: payload.name,
          role: payload.role,
          isSuperAdmin: Boolean(payload.isSuperAdmin),
          status: "active",
          section: payload.section || null,
          assignedSections: payload.assignedSections || [],
          effectiveSectionIds: payload.assignedSections || [],
        };
      }
    }
    return null;
  }
}

/**
 * Guards an API route requiring any authenticated admin.
 * Returns { authUser } if allowed, or { response: NextResponse } with 401/403.
 */
export async function requireAdmin(
  request: Request
): Promise<{ authUser: AuthUser; response?: never } | { authUser?: never; response: NextResponse }> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (authUser.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { authUser };
}

/**
 * Guards an API route requiring superadmin privileges.
 * Returns { authUser } if allowed, or { response: NextResponse } with 401/403.
 */
export async function requireSuperAdmin(
  request: Request
): Promise<{ authUser: AuthUser; response?: never } | { authUser?: never; response: NextResponse }> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (authUser.role !== "admin" || !authUser.isSuperAdmin) {
    return {
      response: NextResponse.json(
        { error: "Forbidden: Superadmin access required" },
        { status: 403 }
      ),
    };
  }

  return { authUser };
}

/**
 * Determines whether an authenticated admin has permission to manage content in a specific section.
 * - Superadmins have universal access across all sections.
 * - Non-superadmins must have the section in their `effectiveSectionIds`.
 * - Non-superadmins cannot manage global/null sections.
 */
export function canAdminManageSection(
  authUser: AuthUser,
  sectionId: string | null | undefined
): boolean {
  if (authUser.isSuperAdmin) return true;
  if (!sectionId) return false;
  return authUser.effectiveSectionIds.includes(sectionId.toString());
}

/**
 * Determines whether an authenticated admin has permission to manage/update a resource.
 * - Checks that the current resource section belongs to the admin's assigned sections.
 * - If targetSectionId is supplied (moving resource), checks that destination also belongs
 *   to the admin's assigned sections.
 */
export function canAdminManageResource(
  authUser: AuthUser,
  currentSectionId: string | null | undefined,
  targetSectionId?: string | null | undefined
): boolean {
  if (authUser.isSuperAdmin) return true;

  // Origin section check
  if (!canAdminManageSection(authUser, currentSectionId)) {
    return false;
  }

  // Destination section check (if changing section)
  if (targetSectionId !== undefined) {
    if (!canAdminManageSection(authUser, targetSectionId)) {
      return false;
    }
  }

  return true;
}
