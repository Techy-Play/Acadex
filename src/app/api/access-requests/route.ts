import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AccessRequest from "@/models/AccessRequest";
import Stream from "@/models/Stream";
import Notification from "@/models/Notification";

// Ensure Stream model is registered for populate
void Stream;

// GET /api/access-requests — public: fetch streams list for the apply form
// POST /api/access-requests — public: submit a new access request
export async function GET() {
  try {
    await connectDB();
    const streams = await Stream.find().select("_id name").sort({ name: 1 }).lean();
    return NextResponse.json({ streams });
  } catch (error) {
    console.error("Fetch streams for access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, college_id, email, stream, reason } = body;

    // Basic validation
    if (!name || !college_id || !email) {
      return NextResponse.json(
        { error: "Name, College ID, and Email are required" },
        { status: 400 }
      );
    }

    if (name.length > 100 || college_id.length > 50 || email.length > 255) {
      return NextResponse.json(
        { error: "One or more fields exceed maximum length" },
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

    const accessRequest = await AccessRequest.create({
      name: name.trim(),
      college_id: college_id.trim(),
      email: email.trim().toLowerCase(),
      stream: stream || null,
      reason: (reason || "").trim().slice(0, 500),
    });

    // Notify admins
    await Notification.create({
      type: "new_access_request",
      title: "New Access Request",
      message: `${name.trim()} (${college_id.trim()}) requested access`,
      link: "/admin/access-requests",
      targetRole: "admin",
    });

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
