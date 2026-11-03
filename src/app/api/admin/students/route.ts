/**
 * @module API/Admin/Students
 * @description Admin student management.
 * - GET  → lists students (scoped to assigned sections for sub-admins).
 * - POST → creates a new student/admin account (validated with `addStudentSchema`).
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { addStudentSchema } from "@/lib/validations";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import ActivityLog from "@/models/ActivityLog";
import AdminRequest from "@/models/AdminRequest";
import Notification from "@/models/Notification";
import { sendMail, approvalEmailHTML } from "@/lib/mail";
import { getAuthUser, requireAdmin, canAdminManageSection } from "@/lib/rbac";

// GET /api/admin/students - List all students
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    await connectDB();

    // Sub-admins can only see users from their assigned sections
    const filter: Record<string, unknown> = {};
    if (!authUser.isSuperAdmin) {
      filter.section = { $in: authUser.effectiveSectionIds };
    }

    // Fetch users first, then manually attach stream/section data
    const users = await User.find(filter)
      .select("-password_hash")
      .sort({ createdAt: -1 })
      .lean();

    // Collect unique stream IDs
    const streamIds = [
      ...new Set(
        users
          .map((u) => u.stream?.toString())
          .filter((id): id is string => !!id)
      ),
    ];

    // Collect unique section IDs
    const sectionIds = [
      ...new Set([
        ...users
          .map((u) => u.section?.toString())
          .filter((id): id is string => !!id),
        ...users.flatMap((u) =>
          Array.isArray(u.assignedSections)
            ? u.assignedSections.map((s: unknown) =>
                typeof s === "object" && s !== null && "_id" in s
                  ? String((s as { _id: unknown })._id)
                  : String(s)
              )
            : []
        ),
      ]),
    ];

    // Fetch streams in one query if any exist
    const streamMap: Record<string, { _id: string; name: string }> = {};
    if (streamIds.length > 0) {
      const streams = await Stream.find({ _id: { $in: streamIds } })
        .select("_id name")
        .lean();
      for (const s of streams) {
        streamMap[s._id.toString()] = { _id: s._id.toString(), name: s.name };
      }
    }

    // Fetch sections in one query if any exist
    const sectionMap: Record<string, { _id: string; name: string }> = {};
    if (sectionIds.length > 0) {
      const sections = await Section.find({ _id: { $in: sectionIds } })
        .select("_id name")
        .lean();
      for (const s of sections) {
        sectionMap[s._id.toString()] = { _id: s._id.toString(), name: s.name };
      }
    }

    // Attach stream and section objects to each user
    const students = users.map((u) => {
      const assignedSecObjs = Array.isArray(u.assignedSections)
        ? u.assignedSections
            .map((id: unknown) => {
              const strId =
                typeof id === "object" && id !== null && "_id" in id
                  ? String((id as { _id: unknown })._id)
                  : String(id);
              return sectionMap[strId] || null;
            })
            .filter((item): item is { _id: string; name: string } => item !== null)
        : [];

      return {
        ...u,
        _id: u._id.toString(),
        stream: u.stream ? streamMap[u.stream.toString()] || null : null,
        section: u.section ? sectionMap[u.section.toString()] || null : null,
        assignedSections: assignedSecObjs,
      };
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("List students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/students - Add a new student / admin
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { authUser } = authResult;
    const body = await request.json();

    const parsed = addStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, college_id, email, password, role, semester } = parsed.data;

    await connectDB();

    // Check college_id uniqueness
    const existing = await User.findOne({
      college_id: { $regex: new RegExp(`^${college_id.trim()}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this College ID already exists" },
        { status: 409 }
      );
    }

    // Check email uniqueness if email provided
    const normalizedEmail = email?.trim().toLowerCase() || null;
    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Resolve stream and section from body
    const stream = body.stream || null;
    const section = body.section || null;

    // Validate stream exists if supplied
    if (stream) {
      const streamExists = await Stream.findById(stream);
      if (!streamExists) {
        return NextResponse.json(
          { error: "Selected stream does not exist" },
          { status: 400 }
        );
      }
    }

    // Validate section exists if supplied
    if (section) {
      const sectionExists = await Section.findById(section);
      if (!sectionExists) {
        return NextResponse.json(
          { error: "Selected section does not exist" },
          { status: 400 }
        );
      }
    }

    // Sub-admins can only create students in their own assigned sections
    if (!authUser.isSuperAdmin) {
      if (!canAdminManageSection(authUser, section)) {
        return NextResponse.json(
          { error: "You can only add students to your assigned sections" },
          { status: 403 }
        );
      }
    }

    // Validate assigned sections if provided
    let validAssignedSectionIds: mongoose.Types.ObjectId[] = [];
    if (parsed.data.assignedSections && parsed.data.assignedSections.length > 0) {
      const rawIds = Array.from(
        new Set(
          parsed.data.assignedSections
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      const invalid = rawIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Invalid section ID in assignedSections" },
          { status: 400 }
        );
      }
      const existingSecs = await Section.find({ _id: { $in: rawIds } })
        .select("_id")
        .lean();
      if (existingSecs.length !== rawIds.length) {
        return NextResponse.json(
          { error: "One or more assigned sections do not exist" },
          { status: 400 }
        );
      }
      validAssignedSectionIds = rawIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    // If sub-admin is attempting to create an admin, create an AdminRequest for approval
    if (role === "admin" && !authUser.isSuperAdmin) {
      const passwordHash = await bcrypt.hash(password, 10);

      await AdminRequest.create({
        type: "create_admin",
        requestedBy: authUser.userId,
        data: {
          name,
          college_id,
          email: normalizedEmail,
          password_hash: passwordHash,
          stream,
          section,
          semester: semester || null,
          ...(parsed.data.isStudent !== undefined && { isStudent: parsed.data.isStudent }),
          ...(validAssignedSectionIds.length > 0 && { assignedSections: validAssignedSectionIds.map(String) }),
        },
      });

      // Notify super admins
      const superAdmins = await User.find({ isSuperAdmin: true }).select("_id").lean();
      if (superAdmins.length > 0) {
        await Notification.create({
          type: "new_access_request",
          title: "Admin Creation Request",
          message: `${authUser.name} requested to create admin: ${name} (${college_id})`,
          link: "/admin/admin-requests",
          targetUsers: superAdmins.map((sa) => sa._id),
        });
      }

      await ActivityLog.create({
        user: authUser.userId,
        action: "ADMIN_REQUEST_CREATED",
        details: `Requested admin creation: ${name} (${college_id})`,
        section: section || null,
      });

      return NextResponse.json(
        {
          success: true,
          pending: true,
          message: "Admin creation request sent to super admin for approval.",
        },
        { status: 201 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user directly (super admin or creating student)
    const user = await User.create({
      name,
      college_id,
      email: normalizedEmail,
      password_hash: passwordHash,
      role,
      stream,
      section,
      semester: semester || null,
      must_change_password: true,
      ...(parsed.data.isStudent !== undefined && { isStudent: parsed.data.isStudent }),
      ...(role === "admin" && validAssignedSectionIds.length > 0 && {
        assignedSections: validAssignedSectionIds,
      }),
    });

    // Log activity
    await ActivityLog.create({
      user: authUser.userId,
      action: "STUDENT_ADDED",
      details: `Added ${role}: ${name} (${college_id})`,
      section: section || null,
    });

    let emailSent = false;
    if (normalizedEmail) {
      try {
        await sendMail({
          to: normalizedEmail,
          subject: "Your Acadex Account Is Ready",
          html: approvalEmailHTML(name, college_id, password),
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("Failed to send welcome email:", mailErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          college_id: user.college_id,
          email: user.email,
          role: user.role,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
