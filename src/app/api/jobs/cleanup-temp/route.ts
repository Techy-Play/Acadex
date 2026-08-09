/**
 * @module API/Jobs/CleanupTemp
 * @description Background cleanup job route that automatically purges unsubmitted temporary files
 * in the Google Drive "Temp" folder older than 10 minutes.
 * Can be triggered via Cron job, Vercel Cron, or on-demand by authorized admins.
 */
import { NextResponse } from "next/server";
import { cleanupExpiredTempFiles } from "@/lib/gdrive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const userRole = request.headers.get("x-user-role");
      if (userRole !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await cleanupExpiredTempFiles();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired temp files.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Cleanup temp files error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cleanup temp files.",
      },
      { status: 500 }
    );
  }
}
