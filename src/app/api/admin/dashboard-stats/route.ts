/**
 * @module API/Admin/DashboardStats
 * @description Highly optimized dashboard summary endpoint.
 * Returns aggregated counts, pending approval queues, recent uploads,
 * and system health in a single concurrent query batch.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import AdminRequest from "@/models/AdminRequest";
import UserRequest from "@/models/UserRequest";
import ContactMessage from "@/models/ContactMessage";
import Note from "@/models/Note";
import Assignment from "@/models/Assignment";
import Practical from "@/models/Practical";
import LibraryResource from "@/models/LibraryResource";
import User from "@/models/User";
import Subject from "@/models/Subject";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import { requireAdmin } from "@/lib/rbac";

// GET /api/admin/dashboard-stats — Comprehensive stats for admin dashboard
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) return authResult.response;
    const { authUser } = authResult;

    await connectDB();

    // Ensure models are registered for populating
    void Subject;
    void Section;
    void User;

    // Sub-admins only see records related to their assigned sections
    const hasSectionScope = !authUser.isSuperAdmin && authUser.effectiveSectionIds.length > 0;
    const validSectionObjectIds = authUser.effectiveSectionIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Section filters for resources
    const resourceSectionFilter = hasSectionScope
      ? {
          $or: [
            { section: { $in: validSectionObjectIds } },
            { sections: { $in: validSectionObjectIds } },
          ],
        }
      : {};

    const studentSectionFilter = hasSectionScope
      ? { role: "student", section: { $in: validSectionObjectIds } }
      : { role: "student" };

    const accessRequestFilter = hasSectionScope
      ? { status: "pending", section: { $in: validSectionObjectIds } }
      : { status: "pending" };

    const userRequestFilter = hasSectionScope
      ? { status: "pending", section: { $in: validSectionObjectIds } }
      : { status: "pending" };

    // Execute counts concurrently in a single round-trip
    const [
      totalStudents,
      totalNotes,
      totalAssignments,
      totalPracticals,
      totalLibrary,
      totalSubjects,
      totalStreams,
      totalSections,
      pendingAccessRequests,
      pendingAdminRequests,
      pendingUserRequests,
      unreadMessages,
      recentNotes,
      recentAssignments,
      recentPracticals,
      recentLibrary,
    ] = await Promise.all([
      User.countDocuments(studentSectionFilter),
      Note.countDocuments(resourceSectionFilter),
      Assignment.countDocuments(resourceSectionFilter),
      Practical.countDocuments(resourceSectionFilter),
      LibraryResource.countDocuments({}),
      authUser.isSuperAdmin ? Subject.countDocuments({}) : Promise.resolve(0),
      authUser.isSuperAdmin ? Stream.countDocuments({}) : Promise.resolve(0),
      authUser.isSuperAdmin ? Section.countDocuments({}) : Promise.resolve(0),
      AccessRequest.countDocuments(accessRequestFilter),
      authUser.isSuperAdmin
        ? AdminRequest.countDocuments({ status: "pending" })
        : Promise.resolve(0),
      UserRequest.countDocuments(userRequestFilter),
      ContactMessage.countDocuments({ read: false }),
      // Recent uploads sampling
      Note.find(resourceSectionFilter)
        .sort({ uploadedAt: -1 })
        .limit(3)
        .populate("subject", "name")
        .populate("section", "name")
        .populate("uploadedBy", "name")
        .lean(),
      Assignment.find(resourceSectionFilter)
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("subject", "name")
        .populate("section", "name")
        .populate("uploadedBy", "name")
        .lean(),
      Practical.find(resourceSectionFilter)
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("subject", "name")
        .populate("section", "name")
        .populate("uploadedBy", "name")
        .lean(),
      LibraryResource.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("subject", "name")
        .populate("uploadedBy", "name")
        .lean(),
    ]);

    // Aggregate and sort the most recent uploads
    interface PopulatedField {
      name?: string;
    }

    const formattedUploads = [
      ...recentNotes.map((n) => ({
        id: n._id.toString(),
        type: "note" as const,
        title: n.title,
        fileUrl: n.file_url || "",
        subjectName: (n.subject as PopulatedField)?.name || "General Subject",
        sectionName: (n.section as PopulatedField)?.name || null,
        uploadedBy: (n.uploadedBy as PopulatedField)?.name || "Admin",
        createdAt: n.uploadedAt ? n.uploadedAt.toISOString() : new Date().toISOString(),
      })),
      ...recentAssignments.map((a) => ({
        id: a._id.toString(),
        type: "assignment" as const,
        title: a.title,
        fileUrl: a.file_url || "",
        subjectName: (a.subject as PopulatedField)?.name || "General Subject",
        sectionName: (a.section as PopulatedField)?.name || null,
        uploadedBy: (a.uploadedBy as PopulatedField)?.name || "Admin",
        deadline: a.deadline,
        createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
      })),
      ...recentPracticals.map((p) => ({
        id: p._id.toString(),
        type: "practical" as const,
        title: p.title,
        fileUrl: p.file_url || "",
        subjectName: (p.subject as PopulatedField)?.name || "General Subject",
        sectionName: (p.section as PopulatedField)?.name || null,
        uploadedBy: (p.uploadedBy as PopulatedField)?.name || "Admin",
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      })),
      ...recentLibrary.map((l) => ({
        id: l._id.toString(),
        type: "library" as const,
        title: l.title,
        fileUrl: l.fileUrl || "",
        subjectName: (l.subject as PopulatedField)?.name || "Library Resource",
        sectionName: null,
        uploadedBy: (l.uploadedBy as PopulatedField)?.name || "Librarian",
        createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const totalPending =
      pendingAccessRequests +
      pendingAdminRequests +
      pendingUserRequests +
      unreadMessages;

    return NextResponse.json({
      // Backwards-compatible legacy props
      pendingRequests: pendingAccessRequests,
      unreadMessages,

      // Rich new aggregated data
      counts: {
        students: totalStudents,
        notes: totalNotes,
        assignments: totalAssignments,
        practicals: totalPracticals,
        library: totalLibrary,
        subjects: totalSubjects,
        streams: totalStreams,
        sections: totalSections,
      },
      pending: {
        accessRequests: pendingAccessRequests,
        adminRequests: pendingAdminRequests,
        userRequests: pendingUserRequests,
        unreadMessages,
        total: totalPending,
      },
      recentUploads: formattedUploads,
      systemStatus: {
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
