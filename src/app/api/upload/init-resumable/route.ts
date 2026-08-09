/**
 * @module API/Upload/InitResumable
 * @description Initializes a Google Drive resumable upload session directly in the destination folder.
 * Returns an upload location URL allowing the browser client to stream chunks to Google Drive.
 */
import { NextResponse } from "next/server";
import { initResumableDriveUpload } from "@/lib/gdrive";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to upload files." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fileName,
      mimeType,
      fileSize,
      streamName,
      semester,
      subjectName,
      resourceType,
      overwrite,
    } = body;

    if (!fileName || !fileSize) {
      return NextResponse.json(
        { error: "Missing required file metadata." },
        { status: 400 }
      );
    }

    const { uploadUrl } = await initResumableDriveUpload({
      fileName,
      mimeType: mimeType || "application/pdf",
      fileSize: Number(fileSize),
      streamName,
      semester,
      subjectName,
      resourceType,
      overwrite: Boolean(overwrite),
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
    });
  } catch (error) {
    console.error("Init resumable upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize resumable upload.",
      },
      { status: 500 }
    );
  }
}
