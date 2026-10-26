/**
 * @module API/Admin/DashboardStats
 * @description Returns quick counts and priority alert details for admin dashboard widgets.
 * Delivers pending access requests, unread contact messages with snippets,
 * super admin elevated requests, and security alert events.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import ContactMessage from "@/models/ContactMessage";
import AdminRequest from "@/models/AdminRequest";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { requireAdmin } from "@/lib/rbac";

// Ensure models are registered for populate
void User;

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    await connectDB();

    // Sub-admins only see pending access requests for their assigned sections
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

    let pendingAdminRequests = 0;
    let latestAdminRequest = null;
    let latestMessage = null;
    let securityAlertCount = 0;
    let latestSecurityAlert = null;

    if (authUser.isSuperAdmin) {
      // 1. Pending Admin Requests (e.g. sub-admin asking to create admin or change section)
      try {
        pendingAdminRequests = await AdminRequest.countDocuments({ status: "pending" });
        if (pendingAdminRequests > 0) {
          const rawReq = await AdminRequest.findOne({ status: "pending" })
            .populate("requestedBy", "name college_id")
            .populate("targetUser", "name college_id")
            .sort({ createdAt: -1 })
            .lean();

          if (rawReq) {
            const reqUser = rawReq.requestedBy as { name?: string; college_id?: string } | null;
            const tgtUser = rawReq.targetUser as { name?: string; college_id?: string } | null;
            latestAdminRequest = {
              id: rawReq._id.toString(),
              type: rawReq.type,
              requestedByName: reqUser?.name || "Sub-Admin",
              targetUserName: tgtUser?.name || null,
              adminNote: rawReq.admin_note || "",
              createdAt: rawReq.createdAt,
            };
          }
        }
      } catch (adminReqErr) {
        console.warn("[Dashboard Stats] AdminRequest query warning:", (adminReqErr as Error).message);
      }

      // 2. Latest Unread Contact Message Snippet
      if (unreadMessages > 0) {
        try {
          const rawMsg = await ContactMessage.findOne({ read: false })
            .sort({ createdAt: -1 })
            .lean();

          if (rawMsg) {
            latestMessage = {
              id: rawMsg._id.toString(),
              name: rawMsg.name,
              email: rawMsg.email,
              subject: rawMsg.subject || "General Inquiry",
              snippet: rawMsg.message?.slice(0, 140) || "",
              createdAt: rawMsg.createdAt,
            };
          }
        } catch (msgErr) {
          console.warn("[Dashboard Stats] ContactMessage snippet warning:", (msgErr as Error).message);
        }
      }

      // 3. Failed Security & Authorization Alerts in AuditLog
      try {
        securityAlertCount = await AuditLog.countDocuments({
          $or: [{ status: "failure" }, { actionCategory: "security" }],
        });

        if (securityAlertCount > 0) {
          const failedLog = await AuditLog.findOne({
            $or: [{ status: "failure" }, { actionCategory: "security" }],
          })
            .sort({ createdAt: -1 })
            .lean();

          if (failedLog) {
            latestSecurityAlert = {
              id: failedLog.logId || failedLog._id.toString(),
              action: failedLog.action,
              description: failedLog.description,
              actorName: failedLog.actor?.name || "Unknown Actor",
              createdAt: failedLog.createdAt,
            };
          }
        }
      } catch (auditErr) {
        console.warn("[Dashboard Stats] AuditLog security alert warning:", (auditErr as Error).message);
      }
    }

    return NextResponse.json({
      pendingRequests,
      unreadMessages,
      pendingAdminRequests,
      latestAdminRequest,
      latestMessage,
      securityAlertCount,
      latestSecurityAlert,
    });
  } catch (error) {
    console.error("Dashboard stats error (serving safe defaults):", (error as Error).message);
    return NextResponse.json({
      pendingRequests: 0,
      unreadMessages: 0,
      pendingAdminRequests: 0,
      latestAdminRequest: null,
      latestMessage: null,
      securityAlertCount: 0,
      latestSecurityAlert: null,
    });
  }
}
