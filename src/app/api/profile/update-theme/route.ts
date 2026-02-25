import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme, accentColor, mobileNavPosition, dashboardView } = body;

    const validThemes = ["light", "dark", "system"];
    const validAccents = ["default", "rose", "ocean", "emerald", "violet", "sunset", "amoled", "pastel", "contrast"];
    const validNavPositions = ["top", "bottom", "left"];
    const validViews = ["grid", "list", "detail"];

    const update: Record<string, string> = {};

    if (theme && validThemes.includes(theme)) {
      update.theme = theme;
    }
    if (accentColor && validAccents.includes(accentColor)) {
      update.accentColor = accentColor;
    }
    if (mobileNavPosition && validNavPositions.includes(mobileNavPosition)) {
      update.mobileNavPosition = mobileNavPosition;
    }
    if (dashboardView && validViews.includes(dashboardView)) {
      update.dashboardView = dashboardView;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await connectDB();

    await User.findByIdAndUpdate(userId, { $set: update });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update theme error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
