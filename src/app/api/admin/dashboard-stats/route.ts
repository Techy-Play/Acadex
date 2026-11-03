/**
 * @module API/Admin/DashboardStats
 * @description Returns quick counts (pending access requests, unread
 * contact messages) for admin dashboard widgets.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import ContactMessage from "@/models/ContactMessage";
import { requireAdmin } from "@/lib/rbac";

// GET /api/admin/dashboard-stats — Quick counts for admin dashboard widgets
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    await connectDB();

    // Sub-admins only see pending requests for their assigned sections
    const pendingFilter: Record<string, unknown> = { status: "pending" };
    if (!authUser.isSuperAdmin && authUser.effectiveSectionIds.length > 0) {
      pendingFilter.section = {
        $in: authUser.effectiveSectionIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id)),
      };
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
