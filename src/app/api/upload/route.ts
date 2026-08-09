/**
 * @module API/Upload
 * @description Direct file upload & staging finalizer route for 5 TB Google Drive
 * with dynamic subfolder hierarchy (Stream -> Semester -> Subject -> Resource Type).
 */
import { NextResponse } from "next/server";
import { uploadToGoogleDriveHierarchy, finalizeDriveFile } from "@/lib/gdrive";

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

    const contentType = request.headers.get("content-type") || "";

    // Case A: Staged Resumable Upload Finalization (JSON body with fileId)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { fileId, streamName, semester, subjectName, resourceType } = body;

      if (!fileId) {
        return NextResponse.json(
          { error: "Missing fileId for finalization." },
          { status: 400 }
        );
      }

      const result = await finalizeDriveFile({
        fileId,
        streamName: streamName || "General",
        semester: semester || "General",
        subjectName: subjectName || "General",
        resourceType: resourceType || "Notes",
      });

      return NextResponse.json({
        success: true,
        fileUrl: result.fileUrl,
        fileId: result.fileId,
      });
    }

    // Case B: Direct Multipart FormData Upload (< 4.5 MB)
    const formData = await request.formData();
    const fileId = formData.get("fileId") as string | null;
    const streamName = (formData.get("streamName") as string) || "General";
    const semester = (formData.get("semester") as string) || "General";
    const subjectName = (formData.get("subjectName") as string) || "General";
    const resourceType = (formData.get("resourceType") as string) || "Notes";

    // If fileId was passed in FormData (finalizing temp staged file)
    if (fileId) {
      const result = await finalizeDriveFile({
        fileId,
        streamName,
        semester,
        subjectName,
        resourceType,
      });

      return NextResponse.json({
        success: true,
        fileUrl: result.fileUrl,
        fileId: result.fileId,
      });
    }

    const file = formData.get("file") as File | null;
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
