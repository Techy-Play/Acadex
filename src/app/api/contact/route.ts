/**
 * @module API/Contact
 * @description Contact messages.
 * - POST → public: submits a new contact message.
 * - GET  → admin only: lists all contact messages.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { sendPushToUsers } from "@/lib/push/send";
import { buildPushPayload } from "@/lib/push/payloads";

// POST - public endpoint (no auth required) for submitting contact messages
export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Rate limit: max message length
    if (message.length > 2000 || subject.length > 200 || name.length > 100) {
      return NextResponse.json(
        { error: "Input too long" },
        { status: 400 }
      );
    }

    await connectDB();

    await ContactMessage.create({ name, email, subject, message });

    // Notify super admin about new contact message
    try {
      const superAdmin = await User.findOne({ isSuperAdmin: true }).lean();
      if (superAdmin) {
        await Notification.create({
          type: "contact_message",
          title: "New Contact Message",
          message: `${name}: "${subject.slice(0, 80)}"`,
          link: "/admin/messages",
          targetUsers: [superAdmin._id],
        });

        // Send push notification to the super admin
        await sendPushToUsers({
          userIds: [superAdmin._id.toString()],
          payload: buildPushPayload(
            "New Contact Message",
            `${name}: "${subject.slice(0, 80)}"`,
            "/admin/messages"
          ),
        }).catch((err) => console.error("Push error:", err));
      }
    } catch {
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully!" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// GET - admin only, fetch all contact messages
export async function GET(request: Request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      messages: messages.map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        read: m.read,
        replied: m.replied || false,
        adminReply: m.adminReply || "",
        repliedAt: m.repliedAt || null,
        createdAt: m.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
