/**
 * @module API/Notifications
 * @description User notification management.
 * - GET   → fetches notifications for the current user (also triggers
 *            throttled deadline-alert generation).
 * - PUT   → marks all notifications as read.
 * - DELETE → dismisses all notifications for the user.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import Assignment from "@/models/Assignment";
import User from "@/models/User";

// ── Throttled deadline alert generation ──
// Run at most once every 15 minutes across all requests (in-memory per instance)
let lastDeadlineCheck = 0;
const DEADLINE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const ENABLE_INLINE_DEADLINE_ALERTS =
  process.env.ENABLE_INLINE_DEADLINE_ALERTS === "true";

async function generateDeadlineAlerts() {
  const now = Date.now();
  if (now - lastDeadlineCheck < DEADLINE_CHECK_INTERVAL) return;
  lastDeadlineCheck = now;

  try {
    const currentDate = new Date();
    const in24h = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

    const upcomingAssignments = await Assignment.find({
      deadline: { $gte: currentDate, $lte: in24h },
    })
      .populate("subject", "name")
      .select("_id title deadline subject")
      .lean();

    if (upcomingAssignments.length === 0) return;

    // Fetch existing recent deadline alerts once and derive assignment IDs from message suffix: [<assignmentId>]
    const existingAlerts = await Notification.find({
      type: "deadline_alert",
      link: "/user/dashboard/assignments",
      createdAt: { $gte: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000) },
    })
      .select("message")
      .lean();

    const existingAssignmentIds = new Set<string>();
    for (const alert of existingAlerts) {
      const match = /\[([a-fA-F0-9]{24})\]$/.exec(alert.message || "");
      if (match?.[1]) {
        existingAssignmentIds.add(match[1]);
      }
    }

    const toCreate: Array<{
      type: "deadline_alert";
      title: string;
      message: string;
      link: string;
      targetRole: "student";
    }> = [];

    for (const a of upcomingAssignments) {
      const assignmentId = a._id.toString();
      if (existingAssignmentIds.has(assignmentId)) continue;

      const subjectName =
        (a.subject as { name?: string } | null)?.name || "Unknown";
      const deadlineStr = new Date(a.deadline!).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      toCreate.push({
        type: "deadline_alert",
        title: "Assignment Deadline Approaching",
        message: `"${a.title}" (${subjectName}) is due ${deadlineStr} [${assignmentId}]`,
        link: "/user/dashboard/assignments",
        targetRole: "student",
      });
    }

    if (toCreate.length > 0) {
      await Notification.insertMany(toCreate, { ordered: false });
    }
  } catch {
    // Don't fail — silently skip deadline check
  }
}

// GET /api/notifications — Fetch notifications for current user
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Optional legacy mode: generate deadline alerts inline on read requests.
    if (ENABLE_INLINE_DEADLINE_ALERTS) {
      await generateDeadlineAlerts();
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Build list of muted notification types from user preferences
    const mutedTypes: string[] = [];
    if (userRole === "student") {
      const currentUser = await User.findById(userId).select("notificationPreferences").lean();
      const prefs = currentUser?.notificationPreferences;
      if (prefs) {
        const prefMap: Record<string, boolean | undefined> = {
          new_note: prefs.new_note,
          new_assignment: prefs.new_assignment,
          new_practical: prefs.new_practical,
          deadline_alert: prefs.deadline_alert,
          admin_message: prefs.admin_message,
          request_approved: prefs.request_approved,
          request_denied: prefs.request_denied,
        };
        for (const [type, enabled] of Object.entries(prefMap)) {
          if (enabled === false) mutedTypes.push(type);
        }
      }
    }

    // Fetch notifications for this role OR targeted to this specific user
    // Exclude dismissed ones and muted types
    const query: Record<string, unknown> = {
      createdAt: { $gte: thirtyDaysAgo },
      dismissedBy: { $ne: userObjId },
      $or: [
        { targetRole: userRole },
        { targetUsers: userObjId },
      ],
      type: { $nin: ["comment_reply"] },
    };
    if (mutedTypes.length > 0) {
      query.type = { $nin: [...mutedTypes, "comment_reply"] };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: (n.readBy || []).some(
        (id: mongoose.Types.ObjectId) => id.toString() === userId
      ),
      createdAt: n.createdAt,
    }));

    const unreadCount = mapped.filter((n) => !n.read).length;

    return NextResponse.json({ notifications: mapped, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/notifications — Mark all notifications as read
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Mark all role-targeted + user-targeted notifications as read
    await Notification.updateMany(
      {
        $or: [{ targetRole: userRole }, { targetUsers: userObjId }],
        readBy: { $ne: userObjId },
      },
      {
        $addToSet: { readBy: userObjId },
      }
    );

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications — Clear all notifications for this user (dismiss)
export async function DELETE(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Add userId to dismissedBy for all notifications visible to this user
    await Notification.updateMany(
      {
        $or: [{ targetRole: userRole }, { targetUsers: userObjId }],
        dismissedBy: { $ne: userObjId },
      },
      {
        $addToSet: { dismissedBy: userObjId, readBy: userObjId },
      }
    );

    return NextResponse.json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
