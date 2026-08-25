/**
 * @module API/Upload
 * @description Direct file upload route for 5 TB Google Drive
 * with dynamic subfolder hierarchy (Stream -> Semester -> Subject -> Resource Type).
 */
import { NextResponse } from "next/server";
import { uploadToGoogleDriveHierarchy } from "@/lib/gdrive";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to upload files." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const streamName = (formData.get("streamName") as string) || "General";
    const semester = (formData.get("semester") as string) || "General";
    const subjectName = (formData.get("subjectName") as string) || "General";
    const resourceType = (formData.get("resourceType") as string) || "Notes";
    const overwrite = formData.get("overwrite") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadToGoogleDriveHierarchy({
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      streamName,
      semester,
      subjectName,
      resourceType,
      overwrite,
    });

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
    });
  } catch (error: any) {
    console.error("Google Drive API upload error:", error);
    let errorMsg = error instanceof Error ? error.message : "Failed to upload file to Google Drive.";
    if (errorMsg.includes("invalid_grant") || error.response?.data?.error === "invalid_grant") {
      errorMsg = "Google Drive Error: 'invalid_grant'. Your GOOGLE_REFRESH_TOKEN has expired or is invalid. If your Google Cloud app is in 'Testing' mode, tokens expire every 7 days. Please generate a new refresh token.";
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
