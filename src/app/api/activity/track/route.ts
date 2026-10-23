/**
 * @module API/Activity/Track
 * @description Secure endpoint for tracking user-initiated client events (e.g. APP_OPEN, RESOURCE_DOWNLOAD).
 * Uses the server-verified session as the identity source — never trusts client-supplied actor info.
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/rbac";
import { logUserActivity } from "@/lib/audit-logger";

const ALLOWED_TRACK_ACTIONS = new Set([
  "APP_OPEN",
  "RESOURCE_VIEW",
  "RESOURCE_DOWNLOAD",
  "SEARCH_QUERY",
]);

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (!ALLOWED_TRACK_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const description = typeof body.description === "string" ? body.description.slice(0, 300) : `${action} by ${authUser.name}`;
    const target = body.target && typeof body.target === "object" ? body.target : undefined;
    const route = typeof body.route === "string" ? body.route.slice(0, 300) : undefined;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

    await logUserActivity({
      user: {
        userId: authUser.userId,
        name: authUser.name,
        collegeId: authUser.collegeId,
        role: authUser.isSuperAdmin ? "superadmin" : authUser.role,
      },
      action,
      actionCategory: action === "APP_OPEN" ? "auth" : "resource",
      description,
      target,
      route,
      metadata,
      req: request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
