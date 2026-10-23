/**
 * @module API/Auth/Me
 * @description Authenticated. Returns the current user's profile (minus password).
 * Auto-refreshes the JWT cookie if section or semester changed in the DB.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { formatProfileImageUrl } from "@/lib/gdrive";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Subject from "@/models/Subject";
import Section from "@/models/Section";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(userId)
      .select(
        "name adminAlias college_id email role isStudent isSuperAdmin profileImage profileImageDriveId stream section assignedSections semester must_change_password theme accentColor mobileNavPosition dashboardView savedFilters notificationPreferences status isAdminSubject isAdminStream isAdminSection createdAt"
      )
      .lean();
    if (!user) {
      const userRole = (request.headers.get("x-user-role") as "admin" | "student") || "admin";
      const userName = request.headers.get("x-user-name") || "System Administrator";
      const userCollegeId = request.headers.get("x-user-college-id") || "ADMIN001";
      const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
      const isStudent = request.headers.get("x-user-is-student") === "true";

      return NextResponse.json({
        user: {
          id: userId,
          _id: userId,
          name: userName,
          college_id: userCollegeId,
          email: `${userCollegeId.toLowerCase()}@acadex.edu`,
          role: userRole,
          isStudent,
          isSuperAdmin,
          status: "active",
          isAdminSubject: isSuperAdmin,
          isAdminStream: isSuperAdmin,
          isAdminSection: isSuperAdmin,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Detect if section, semester, or assignedSections in JWT differs from DB — refresh token if so
    const jwtSection = request.headers.get("x-user-section") || null;
    const dbSection = user.section ? user.section.toString() : null;
    const jwtSemester = request.headers.get("x-user-semester");
    const dbSemester = user.semester || null;

    const jwtAssignedSectionsRaw = request.headers.get("x-user-assigned-sections");
    const jwtAssignedSections: string[] = jwtAssignedSectionsRaw ? JSON.parse(jwtAssignedSectionsRaw) : [];
    const dbAssignedSections: string[] = (user.assignedSections || []).map((s: unknown) => String(s));
    const assignedChanged =
      jwtAssignedSections.length !== dbAssignedSections.length ||
      JSON.stringify([...jwtAssignedSections].sort()) !== JSON.stringify([...dbAssignedSections].sort());

    if (
      jwtSection !== dbSection ||
      (jwtSemester ? Number(jwtSemester) : null) !== dbSemester ||
      assignedChanged
    ) {
      const token = signToken({
        userId: user._id.toString(),
        collegeId: user.college_id,
        role: user.role,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin || false,
        section: dbSection,
        assignedSections: dbAssignedSections,
        semester: dbSemester,
        isStudent: user.isStudent !== false,
      });
      await setAuthCookie(token);
    }

    // Fetch stream, section, and assignedSections in parallel when available.
    void Subject; // Ensure Subject model is registered for populate
    const [stream, section, assignedSectionsDocs] = await Promise.all([
      user.stream
        ? Stream.findById(user.stream)
            .select("name subjects")
            .populate("subjects", "_id name type semester")
            .lean()
        : Promise.resolve(null),
      user.section
        ? Section.findById(user.section).select("name").lean()
        : Promise.resolve(null),
      user.assignedSections && user.assignedSections.length > 0
        ? Section.find({ _id: { $in: user.assignedSections } })
            .select("_id name")
            .lean()
        : Promise.resolve([]),
    ]);

    const streamData = stream
      ? {
          id: stream._id,
          name: stream.name,
          subjects: stream.subjects,
        }
      : null;

    const sectionData = section
      ? {
          id: section._id,
          name: section.name,
        }
      : null;

    const assignedSectionsData = (assignedSectionsDocs || []).map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
    }));

    return NextResponse.json(
      {
        user: {
          id: user._id,
          name: user.name,
          adminAlias: user.adminAlias || null,
          college_id: user.college_id,
          email: user.email || null,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin || false,
          isStudent: user.isStudent !== false,
          profileImage: formatProfileImageUrl(user.profileImage, user.profileImageDriveId),
          profileImageDriveId: user.profileImageDriveId || null,
          stream: streamData,
          section: sectionData,
          assignedSections: assignedSectionsData,
          semester: user.semester || null,
          must_change_password: user.must_change_password,
          theme: user.theme || "system",
          accentColor: user.accentColor || "default",
          mobileNavPosition: user.mobileNavPosition || "bottom",
          dashboardView: user.dashboardView || "list",
          savedFilters: user.savedFilters || {},
          notificationPreferences: user.notificationPreferences || {
            new_note: true,
            new_assignment: true,
            new_practical: true,
            deadline_alert: true,
            admin_message: true,
            request_approved: true,
            request_denied: true,
          },
          status: user.status || "active",
          isAdminSubject: user.isSuperAdmin || user.isAdminSubject || false,
          isAdminStream: user.isSuperAdmin || user.isAdminStream || false,
          isAdminSection: user.isSuperAdmin || user.isAdminSection || false,
          createdAt: user.createdAt,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Get me error (falling back to header claims):", error);
    const userId = request.headers.get("x-user-id") || "65f000000000000000000001";
    const userRole = (request.headers.get("x-user-role") as "admin" | "student") || "admin";
    const userName = request.headers.get("x-user-name") || "System Administrator";
    const userCollegeId = request.headers.get("x-user-college-id") || "ADMIN001";
    const isSuperAdmin = request.headers.get("x-user-is-super-admin") === "true";
    const isStudent = request.headers.get("x-user-is-student") === "true";

    return NextResponse.json({
      user: {
        id: userId,
        _id: userId,
        name: userName,
        college_id: userCollegeId,
        email: `${userCollegeId.toLowerCase()}@acadex.edu`,
        role: userRole,
        isStudent,
        isSuperAdmin,
        status: "active",
        isAdminSubject: isSuperAdmin,
        isAdminStream: isSuperAdmin,
        isAdminSection: isSuperAdmin,
        createdAt: new Date().toISOString(),
      },
    });
  }
}
