import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";

// GET /api/admin/activity — Fetch recent activity log entries
export async function GET(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const adminSection = request.headers.get("x-user-section");

    await connectDB();

    // Sub-admins only see activity from their own section
    const filter: Record<string, unknown> = {};
    if (!isSuperAdmin && adminSection) {
      filter.section = adminSection;
    }

    const activities = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name college_id role")
      .lean();

    const mapped = activities.map((a) => ({
      id: a._id,
      action: a.action,
      details: a.details,
      user: a.user
        ? {
            name: (a.user as { name?: string }).name || "Unknown",
            college_id: (a.user as { college_id?: string }).college_id || "",
          }
        : null,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ activities: mapped });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
