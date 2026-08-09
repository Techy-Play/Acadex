/**
 * @module lib/direct-upload
 * @description Direct browser-to-Google-Drive uploader using Google's Resumable Upload API.
 * Uploads large files (up to 500+ MB) directly from the user's browser to the Google Drive "Temp" folder,
 * completely bypassing Vercel's 4.5 MB request body limit!
 */

interface DirectUploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
}

export async function uploadFileDirectToTempDrive({
  file,
  onProgress,
}: DirectUploadOptions): Promise<{ fileId: string }> {
  // 1. Request resumable upload URL from server
  const initRes = await fetch("/api/upload/init-resumable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initData.error || "Failed to initialize Google Drive upload.");
  }

  const { uploadUrl } = initData;

  // 2. Stream binary file directly from browser to Google Drive using XMLHttpRequest for progress tracking
  return new Promise<{ fileId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const responseJson = JSON.parse(xhr.responseText);
          if (responseJson.id) {
            resolve({ fileId: responseJson.id });
          } else {
            reject(new Error("Google Drive response missing file ID."));
          }
        } catch {
          reject(new Error("Could not parse Google Drive upload response."));
        }
      } else {
        reject(
          new Error(
            `Direct Google Drive upload failed with HTTP status ${xhr.status}.`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Network error while streaming file directly to Google Drive. Please check your internet connection."
        )
      );
    };

    xhr.send(file);
  });
}
