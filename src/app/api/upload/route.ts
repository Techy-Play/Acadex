/**
 * @module API/Upload
 * @description Direct file upload route that streams PDFs/documents directly to 5 TB Google Drive
 * with dynamic subfolder hierarchy (Stream -> Semester -> Subject -> Resource Type).
 */
import { NextResponse } from "next/server";
import { uploadToGoogleDriveHierarchy } from "@/lib/gdrive";

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

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in request." },
        { status: 400 }
      );
    }

    const streamName = (formData.get("streamName") as string) || "General";
    const semester = (formData.get("semester") as string) || "General";
    const subjectName = (formData.get("subjectName") as string) || "General";
    const resourceType = (formData.get("resourceType") as string) || "Notes";

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
    });

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
    });
  } catch (error) {
    console.error("Google Drive API upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload file to Google Drive.",
      },
      { status: 500 }
    );
  }
}
