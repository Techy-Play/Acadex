/**
 * @module API/Auth/Me
 * @description Authenticated. Returns the current user's profile (minus password).
 * Auto-refreshes the JWT cookie if section or semester changed in the DB.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
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
        "name adminAlias college_id email role isSuperAdmin stream section semester must_change_password theme accentColor mobileNavPosition dashboardView savedFilters notificationPreferences status isAdminSubject isAdminStream isAdminSection createdAt"
      )
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Detect if section or semester in JWT differs from DB — refresh token if so
    const jwtSection = request.headers.get("x-user-section") || null;
    const dbSection = user.section ? user.section.toString() : null;
    const jwtSemester = request.headers.get("x-user-semester");
    const dbSemester = user.semester || null;
    if (jwtSection !== dbSection || (jwtSemester ? Number(jwtSemester) : null) !== dbSemester) {
      const token = signToken({
        userId: user._id.toString(),
        collegeId: user.college_id,
        role: user.role,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin || false,
        section: dbSection,
        semester: dbSemester,
      });
      await setAuthCookie(token);
    }

    // Fetch stream and section in parallel when available.
    void Subject; // Ensure Subject model is registered for populate
    const [stream, section] = await Promise.all([
      user.stream
        ? Stream.findById(user.stream)
            .select("name subjects")
            .populate("subjects", "_id name type semester")
            .lean()
        : Promise.resolve(null),
      user.section
        ? Section.findById(user.section).select("name").lean()
        : Promise.resolve(null),
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
          stream: streamData,
          section: sectionData,
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
    console.error("Get me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
