import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  const jsonCredentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonCredentialsStr) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing.");
  }

  let credentials;
  try {
    credentials = JSON.parse(jsonCredentialsStr);
  } catch (err) {
    throw new Error(
      `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
    ],
    clientOptions: process.env.GOOGLE_DRIVE_IMPERSONATE_USER
      ? { subject: process.env.GOOGLE_DRIVE_IMPERSONATE_USER }
      : undefined,
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Searches for a subfolder by name under a given parent folder.
 * Creates it on-the-fly if it does not exist.
 */
async function getOrCreateSubfolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const safeName = folderName.replace(/'/g, "\\'");
  const q = `'${parentFolderId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchRes = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!;
  }

  // Subfolder doesn't exist, create it
  const createdFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return createdFolder.data.id!;
}

interface UploadToHierarchyOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string; // "Notes", "Assignments", "Practicals", "Library", etc.
}

export async function uploadToGoogleDriveHierarchy({
  buffer,
  fileName,
  mimeType,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
}: UploadToHierarchyOptions) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error(
      "GOOGLE_DRIVE_FOLDER_ID environment variable is missing."
    );
  }

  const drive = getDriveClient();

  // 1. Build dynamic subfolder path: Stream -> Semester N -> Subject -> Resource Type
  const formattedSemester = typeof semester === "number" ? `Semester ${semester}` : semester;

  const streamFolderId = await getOrCreateSubfolder(drive, rootFolderId, streamName);
  const semFolderId = await getOrCreateSubfolder(drive, streamFolderId, formattedSemester);
  const subjectFolderId = await getOrCreateSubfolder(drive, semFolderId, subjectName);
  const targetFolderId = await getOrCreateSubfolder(drive, subjectFolderId, resourceType);

  // 2. Upload file to target subfolder
  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  const fileUploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: readableStream,
    },
    fields: "id, name, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const fileId = fileUploadRes.data.id!;

  // 3. Make file publicly readable for Acadex inline PDF viewer & download
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  // Google Drive view URL compatible with Acadex inline viewer
  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return {
    fileId,
    fileUrl,
    webViewLink: fileUploadRes.data.webViewLink || fileUrl,
  };
}

/**
 * Initializes a Google Drive resumable upload in the "Temp" staging folder.
 * Returns the resumable upload location URL which the client browser can PUT to directly,
 * bypassing Vercel's 4.5 MB server payload limit completely.
 */
export async function initResumableDriveUpload({
  fileName,
  mimeType,
  fileSize,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  const drive = getDriveClient();
  const tempFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Temp");

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let accessToken = "";
  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const tokenRes = await oauth2Client.getAccessToken();
    accessToken = tokenRes.token || "";
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [tempFolderId],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to initialize Drive upload: ${errText}`);
  }

  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive did not return a resumable upload location.");
  }

  return { uploadUrl, tempFolderId };
}

/**
 * Finalizes a staged temp file by moving it from "Temp" to its destination folder hierarchy
 * (Stream -> Semester -> Subject -> ResourceType) and setting public reader permissions.
 */
export async function finalizeDriveFile({
  fileId,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
}: {
  fileId: string;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  const drive = getDriveClient();
  const formattedSemester =
    typeof semester === "number" ? `Semester ${semester}` : semester;

  const tempFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Temp");
  const streamFolderId = await getOrCreateSubfolder(drive, rootFolderId, streamName);
  const semFolderId = await getOrCreateSubfolder(drive, streamFolderId, formattedSemester);
  const subjectFolderId = await getOrCreateSubfolder(drive, semFolderId, subjectName);
  const targetFolderId = await getOrCreateSubfolder(drive, subjectFolderId, resourceType);

  // Move file from Temp to targetFolderId
  await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: tempFolderId,
    supportsAllDrives: true,
  });

  // Set public reader permission
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, fileUrl };
}

/**
 * Cleans up unsubmitted temporary files in the "Temp" staging folder older than 10 minutes.
 */
export async function cleanupExpiredTempFiles() {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) return { deletedCount: 0 };

  const drive = getDriveClient();
  const tempFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Temp");

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const searchRes = await drive.files.list({
    q: `'${tempFolderId}' in parents and createdTime < '${tenMinutesAgo}' and trashed = false`,
    fields: "files(id, name, createdTime)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = searchRes.data.files || [];
  let count = 0;
  for (const f of files) {
    try {
      await drive.files.delete({ fileId: f.id!, supportsAllDrives: true });
      count++;
    } catch (err) {
      console.error(`[Temp Cleanup] Error deleting file ${f.id}:`, err);
    }
  }

  return { deletedCount: count };
}

export { formatProfileImageUrl } from "@/lib/utils";
