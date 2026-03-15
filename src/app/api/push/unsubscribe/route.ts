import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: string;
      clearAll?: boolean;
    };

    await connectDB();

    if (body.clearAll) {
      await PushSubscription.updateMany(
        { userId },
        { $set: { isActive: false } }
      );
      return NextResponse.json({ success: true });
    }

    if (body.endpoint) {
      await PushSubscription.updateOne(
        { endpoint: body.endpoint, userId },
        { $set: { isActive: false } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Provide endpoint or clearAll" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
