/**
 * @module API/Auth/Logout
 * @description Clears the `acadex-token` cookie, logging the user out, and records an audit log.
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/rbac";
import { logUserActivity } from "@/lib/audit-logger";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (authUser) {
      try {
        await logUserActivity({
          user: {
            userId: authUser.userId,
            name: authUser.name,
            collegeId: authUser.collegeId,
            role: authUser.isSuperAdmin ? "superadmin" : authUser.role === "admin" ? "admin" : "student",
          },
          action: "USER_LOGOUT",
          actionCategory: "auth",
          description: `User ${authUser.name} (${authUser.collegeId}) logged out`,
          target: {
            id: authUser.userId,
            type: "user",
            name: authUser.name,
          },
          route: "/login",
          req: request,
        });
      } catch (logErr) {
        console.warn("Failed to log logout event:", logErr);
      }
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("acadex-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
