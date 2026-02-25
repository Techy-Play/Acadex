import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Subject from "@/models/Subject";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(userId).select("-password_hash");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch stream info if assigned
    let streamData = null;
    if (user.stream) {
      void Subject; // Ensure Subject model is registered for populate
      const stream = await Stream.findById(user.stream).populate("subjects");
      if (stream) {
        streamData = {
          id: stream._id,
          name: stream.name,
          subjects: stream.subjects,
        };
      }
    }

    return NextResponse.json(
      {
        user: {
          id: user._id,
          name: user.name,
          college_id: user.college_id,
          email: user.email || null,
          role: user.role,
          stream: streamData,
          must_change_password: user.must_change_password,
          theme: user.theme || "system",
          accentColor: user.accentColor || "default",
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
