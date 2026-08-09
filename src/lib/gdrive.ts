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

/**
 * Resolves the destination subfolder ID: Stream -> Semester N -> Subject -> ResourceType
 */
async function getTargetFolderId({
  drive,
  rootFolderId,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
}: {
  drive: ReturnType<typeof google.drive>;
  rootFolderId: string;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
}) {
  const formattedSemester =
    typeof semester === "number" ? `Semester ${semester}` : semester;

  const streamFolderId = await getOrCreateSubfolder(drive, rootFolderId, streamName);
  const semFolderId = await getOrCreateSubfolder(drive, streamFolderId, formattedSemester);
  const subjectFolderId = await getOrCreateSubfolder(drive, semFolderId, subjectName);
  return await getOrCreateSubfolder(drive, subjectFolderId, resourceType);
}

/**
 * Checks if a file with the given name already exists in the target subject subfolder.
 */
export async function checkDuplicateFileInTarget({
  fileName,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
}: {
  fileName: string;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) return { exists: false };

  const drive = getDriveClient();
  const targetFolderId = await getTargetFolderId({
    drive,
    rootFolderId,
    streamName,
    semester,
    subjectName,
    resourceType,
  });

  const safeName = fileName.replace(/'/g, "\\'");
  const q = `'${targetFolderId}' in parents and name = '${safeName}' and trashed = false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return {
      exists: true,
      existingFileId: res.data.files[0].id!,
      existingFileName: res.data.files[0].name!,
    };
  }

  return { exists: false };
}

interface UploadToHierarchyOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
  overwrite?: boolean;
}

export async function uploadToGoogleDriveHierarchy({
  buffer,
  fileName,
  mimeType,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
  overwrite = false,
}: UploadToHierarchyOptions) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  const drive = getDriveClient();
  const targetFolderId = await getTargetFolderId({
    drive,
    rootFolderId,
    streamName,
    semester,
    subjectName,
    resourceType,
  });

  if (overwrite) {
    const safeName = fileName.replace(/'/g, "\\'");
    const searchRes = await drive.files.list({
      q: `'${targetFolderId}' in parents and name = '${safeName}' and trashed = false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files) {
      for (const f of searchRes.data.files) {
        if (f.id) {
          try {
            await drive.files.delete({ fileId: f.id, supportsAllDrives: true });
          } catch (e) {
            console.error("Failed to delete existing duplicate file:", e);
          }
        }
      }
    }
  }

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

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return {
    fileId,
    fileUrl,
    webViewLink: fileUploadRes.data.webViewLink || fileUrl,
  };
}

/**
 * Initializes a Google Drive resumable upload directly inside the destination folder.
 */
export async function initResumableDriveUpload({
  fileName,
  mimeType,
  fileSize,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Files",
  overwrite = false,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string;
  overwrite?: boolean;
}) {
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  const drive = getDriveClient();
  const targetFolderId = await getTargetFolderId({
    drive,
    rootFolderId,
    streamName,
    semester,
    subjectName,
    resourceType,
  });

  if (overwrite) {
    const safeName = fileName.replace(/'/g, "\\'");
    const searchRes = await drive.files.list({
      q: `'${targetFolderId}' in parents and name = '${safeName}' and trashed = false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files) {
      for (const f of searchRes.data.files) {
        if (f.id) {
          try {
            await drive.files.delete({ fileId: f.id, supportsAllDrives: true });
          } catch (e) {
            console.error("Failed to delete existing duplicate file:", e);
          }
        }
      }
    }
  }

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
        parents: [targetFolderId],
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

  return { uploadUrl, targetFolderId };
}

/**
 * Sets public reader permissions on a file uploaded via chunking.
 */
export async function makeDriveFilePublic(fileId: string) {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Cleanup job compatibility function.
 * Since files are now streamed directly into target destination folders,
 * no temporary orphan files are created.
 */
export async function cleanupExpiredTempFiles(): Promise<{ deletedCount: number }> {
  return { deletedCount: 0 };
}

export { formatProfileImageUrl } from "@/lib/utils";
