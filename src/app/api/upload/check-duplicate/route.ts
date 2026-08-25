/**
 * @module API/Upload/CheckDuplicate
 * @description API route to check if a file with the given name already exists in the target Google Drive subject directory.
 */
import { NextResponse } from "next/server";
import { checkDuplicateFileInTarget } from "@/lib/gdrive";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, streamName, semester, subjectName, resourceType } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName parameter is required." },
        { status: 400 }
      );
    }

    const result = await checkDuplicateFileInTarget({
      fileName,
      streamName,
      semester,
      subjectName,
      resourceType,
    });

    return NextResponse.json({
      success: true,
      exists: result.exists,
      existingFileId: result.existingFileId,
      existingFileName: result.existingFileName,
    });
  } catch (error: any) {
    console.error("Check duplicate upload error:", error);
    let errorMsg = error instanceof Error ? error.message : "Failed to check for duplicate file.";
    if (errorMsg.includes("invalid_grant") || error.response?.data?.error === "invalid_grant") {
      errorMsg = "Google Drive Error: 'invalid_grant'. Your GOOGLE_REFRESH_TOKEN has expired or is invalid. If your Google Cloud app is in 'Testing' mode, tokens expire every 7 days. Please generate a new refresh token.";
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
