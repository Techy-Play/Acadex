import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
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

    // Fetch section info if assigned
    let sectionData = null;
    if (user.section) {
      const section = await Section.findById(user.section);
      if (section) {
        sectionData = {
          id: section._id,
          name: section.name,
        };
      }
    }

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
          must_change_password: user.must_change_password,
          theme: user.theme || "system",
          accentColor: user.accentColor || "default",
          mobileNavPosition: user.mobileNavPosition || "bottom",
          dashboardView: user.dashboardView || "list",
          status: user.status || "active",
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
