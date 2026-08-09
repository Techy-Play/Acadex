/**
 * @module lib/direct-upload
 * @description Robust chunked file uploader for Google Drive.
 * Streams files in 2 MB chunks directly into the destination Google Drive subject directory.
 */

interface DirectUploadOptions {
  file: File;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
  overwrite?: boolean;
  onProgress?: (percent: number) => void;
}

export async function uploadFileDirectToDestination({
  file,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
  overwrite = false,
  onProgress,
}: DirectUploadOptions): Promise<{ fileId: string; fileUrl: string }> {
  // 1. Initialize Google Drive resumable upload session directly in the destination folder
  const initRes = await fetch("/api/upload/init-resumable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
      streamName,
      semester: String(semester),
      subjectName,
      resourceType,
      overwrite,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initData.error || "Failed to initialize Google Drive upload.");
  }

  const { uploadUrl } = initData;
  if (!uploadUrl) {
    throw new Error("No upload URL returned from server.");
  }

  // 2. Upload file in 2 MB chunks (2,097,152 bytes = 8 * 256 KB)
  const CHUNK_SIZE = 2 * 1024 * 1024;
  let start = 0;
  let fileId = "";
  let finalFileUrl = "";

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

    const chunkRes = await fetch("/api/upload/chunk", {
      method: "POST",
      headers: {
        "x-upload-url": uploadUrl,
        "content-range": contentRange,
        "content-type": file.type || "application/pdf",
      },
      body: chunk,
    });

    let chunkData: any = {};
    try {
      chunkData = await chunkRes.json();
    } catch {
      throw new Error(`Chunk upload failed with server status ${chunkRes.status}`);
    }

    if (!chunkRes.ok) {
      throw new Error(chunkData.error || "Failed to upload file chunk.");
    }

    if (onProgress) {
      const percent = Math.round((end / file.size) * 100);
      onProgress(percent);
    }

    if (chunkData.done && chunkData.fileId) {
      fileId = chunkData.fileId;
      finalFileUrl = chunkData.fileUrl || `https://drive.google.com/file/d/${fileId}/view`;
      break;
    }

    start = end;
  }

  if (!fileId) {
    throw new Error("Upload finished but Google Drive file ID was not received.");
  }

  return { fileId, fileUrl: finalFileUrl };
}
