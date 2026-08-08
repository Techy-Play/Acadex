import { google } from "googleapis";
import { Readable } from "stream";

function getDriveClient() {
  const jsonCredentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonCredentialsStr) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing."
    );
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
    scopes: ["https://www.googleapis.com/auth/drive.file"],
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
  });

  const fileId = fileUploadRes.data.id!;

  // 3. Make file publicly readable for Acadex inline PDF viewer & download
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Google Drive view URL compatible with Acadex inline viewer
  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return {
    fileId,
    fileUrl,
    webViewLink: fileUploadRes.data.webViewLink || fileUrl,
  };
}
