import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ContactMessage from "@/models/ContactMessage";

// DELETE - remove a contact message
export async function DELETE(
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
    await ContactMessage.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
