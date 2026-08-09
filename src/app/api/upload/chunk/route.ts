/**
 * @module API/Upload/Chunk
 * @description Proxy route for uploading 2 MB chunks into Google Drive Resumable Upload sessions.
 * Bypasses browser CORS restrictions and keeps payload sizes strictly below Vercel's 4.5 MB limit.
 */
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const uploadUrl = request.headers.get("x-upload-url");
    const contentRange = request.headers.get("content-range");
    const contentType = request.headers.get("content-type") || "application/pdf";

    if (!uploadUrl || !contentRange) {
      return NextResponse.json(
        { error: "Missing x-upload-url or content-range headers." },
        { status: 400 }
      );
    }

    const chunkArrayBuffer = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);

    // Forward 2 MB chunk to Google Drive Resumable Upload session
    const driveRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunkBuffer.length),
        "Content-Range": contentRange,
        "Content-Type": contentType,
      },
      body: chunkBuffer,
    });

    // 200 OK or 201 Created means upload complete
    if (driveRes.status === 200 || driveRes.status === 201) {
      const data = await driveRes.json();
      return NextResponse.json({
        success: true,
        done: true,
        fileId: data.id,
      });
    }

    // 308 Resume Incomplete means chunk uploaded successfully, waiting for next chunk
    if (driveRes.status === 308) {
      return NextResponse.json({
        success: true,
        done: false,
        range: driveRes.headers.get("range"),
      });
    }

    const errText = await driveRes.text();
    return NextResponse.json(
      { error: `Google Drive returned status ${driveRes.status}: ${errText}` },
      { status: driveRes.status || 500 }
    );
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload chunk.",
      },
      { status: 500 }
    );
  }
}
