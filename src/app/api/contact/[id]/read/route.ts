import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";

// PATCH - mark message as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    await ContactMessage.findByIdAndUpdate(id, { read: true });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
