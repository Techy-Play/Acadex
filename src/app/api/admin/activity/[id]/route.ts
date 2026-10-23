/**
 * @module API/Admin/Activity/[id]
 * @description Fetch single audit log entry by ID or logId with full before/after diff and context.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing log ID" }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { logId: id }] }
      : { logId: id };

    const log = await AuditLog.findOne(query)
      .populate("target.section", "name")
      .populate("target.subject", "name")
      .lean();

    if (!log) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    // Sub-admin section check if log is targeted at a specific section
    if (!authUser.isSuperAdmin && log.target?.section) {
      const sectionId =
        typeof log.target.section === "object" && "_id" in log.target.section
          ? String((log.target.section as { _id: unknown })._id)
          : String(log.target.section);

      if (!authUser.effectiveSectionIds.includes(sectionId)) {
        return NextResponse.json({ error: "Forbidden: Section access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error("Get audit log detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
