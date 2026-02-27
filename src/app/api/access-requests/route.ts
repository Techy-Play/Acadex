import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";
import Notification from "@/models/Notification";
import {
  STUDENT_COLLEGE_ID_REGEX,
  ALLOWED_EMAIL_DOMAINS,
  isAllowedEmailDomain,
} from "@/lib/validations";

// Ensure models are registered for populate
void Stream;
void Section;

// GET /api/access-requests — public: fetch streams & sections for the apply form
// POST /api/access-requests — public: submit a new access request
export async function GET() {
  try {
    await connectDB();
    const [streams, sections] = await Promise.all([
      Stream.find().select("_id name").sort({ name: 1 }).lean(),
      Section.find().select("_id name").sort({ name: 1 }).lean(),
    ]);
    return NextResponse.json({ streams, sections });
  } catch (error) {
    console.error("Fetch streams/sections for access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, college_id, email, stream, section, reason } = body;

    // Basic validation
    if (!name || !college_id || !email || !section) {
      return NextResponse.json(
        { error: "Name, College ID, Email, and Section are required" },
        { status: 400 }
      );
    }

    if (name.length > 100 || college_id.length > 50 || email.length > 255) {
      return NextResponse.json(
        { error: "One or more fields exceed maximum length" },
        { status: 400 }
      );
    }

    // College ID format validation
    if (!STUDENT_COLLEGE_ID_REGEX.test(college_id.trim())) {
      return NextResponse.json(
        { error: "Invalid College ID format. Must start with 241, 257, 258, or 259 followed by 3-4 digits" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Email domain validation
    if (!isAllowedEmailDomain(email.trim())) {
      return NextResponse.json(
        { error: `Email must be from one of: ${ALLOWED_EMAIL_DOMAINS.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if there's already a pending request with same college_id
    const existing = await AccessRequest.findOne({
      college_id: college_id.trim(),
      status: "pending",
    });

    if (existing) {
      return NextResponse.json(
        { error: "An access request with this College ID is already pending" },
        { status: 409 }
      );
    }

    // Check if a user with this college_id already exists (already approved)
    const existingUser = await User.findOne({
      college_id: college_id.trim(),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this College ID already exists. Try logging in instead." },
        { status: 409 }
      );
    }

    // Check if email is already used by an existing user
    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in instead." },
        { status: 409 }
      );
    }

    // Check if email is already in a pending access request
    const existingEmailRequest = await AccessRequest.findOne({
      email: email.trim().toLowerCase(),
      status: "pending",
    });

    if (existingEmailRequest) {
      return NextResponse.json(
        { error: "An access request with this email is already pending" },
        { status: 409 }
      );
    }

    const accessRequest = await AccessRequest.create({
      name: name.trim(),
      college_id: college_id.trim(),
      email: email.trim().toLowerCase(),
      stream: stream || null,
      section: section,
      reason: (reason || "").trim().slice(0, 500),
    });

    // Notify only the admin(s) of that section + super admins
    const sectionAdmins = await User.find({
      role: "admin",
      section: section,
      isSuperAdmin: { $ne: true },
    })
      .select("_id")
      .lean();

    const superAdmins = await User.find({ isSuperAdmin: true })
      .select("_id")
      .lean();

    const targetAdminIds = [
      ...sectionAdmins.map((a) => a._id),
      ...superAdmins.map((a) => a._id),
    ];

    if (targetAdminIds.length > 0) {
      await Notification.create({
        type: "new_access_request",
        title: "New Access Request",
        message: `${name.trim()} (${college_id.trim()}) requested access`,
        link: "/admin/access-requests",
        targetUsers: targetAdminIds,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Access request submitted successfully! You will be notified via email once reviewed.",
        request: {
          id: accessRequest._id,
          name: accessRequest.name,
          status: accessRequest.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
