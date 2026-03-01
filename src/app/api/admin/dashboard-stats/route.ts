/**
 * @module API/Admin/DashboardStats
 * @description Returns quick counts (pending access requests, unread
 * contact messages) for admin dashboard widgets.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import ContactMessage from "@/models/ContactMessage";

// GET /api/admin/dashboard-stats — Quick counts for admin dashboard widgets
export async function GET(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const userSection = request.headers.get("x-user-section");

    await connectDB();

    // Sub-admins only see pending requests for their own section
    const pendingFilter: Record<string, unknown> = { status: "pending" };
    if (!isSuperAdmin && userSection) {
      pendingFilter.section = userSection;
    }

    const [pendingRequests, unreadMessages] = await Promise.all([
      AccessRequest.countDocuments(pendingFilter),
      ContactMessage.countDocuments({ read: false }),
    ]);

    return NextResponse.json({ pendingRequests, unreadMessages });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
