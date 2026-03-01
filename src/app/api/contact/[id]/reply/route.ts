/**
 * @module API/Contact/[id]/Reply
 * @description Admin-only. Sends an email reply to a contact message
 * and marks it as replied in the database.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";
import { sendMail, contactReplyEmailHTML } from "@/lib/mail";

// POST - reply to a contact message via email
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { reply, email, name, subject } = await request.json();

    if (!reply || !email) {
      return NextResponse.json(
        { error: "Reply text and email are required" },
        { status: 400 }
      );
    }

    // Send the reply email
    await sendMail({
      to: email,
      subject: `Re: ${subject || "Your message"} — Acadex`,
      html: contactReplyEmailHTML(name, subject, reply),
    });

    // Update the message in DB
    await connectDB();
    await ContactMessage.findByIdAndUpdate(id, {
      read: true,
      replied: true,
      adminReply: reply,
      repliedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Reply sent!" });
  } catch (error) {
    console.error("Failed to send reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply email" },
      { status: 500 }
    );
  }
}
