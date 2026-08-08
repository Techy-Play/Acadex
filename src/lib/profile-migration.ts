import { google } from "googleapis";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";

function getDriveClient() {
  const jsonCredentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonCredentialsStr) return null;
  try {
    const credentials = JSON.parse(jsonCredentialsStr);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    return google.drive({ version: "v3", auth });
  } catch {
    return null;
  }
}

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

/**
 * Moves user's profile picture in Google Drive to their updated
 * Stream -> Semester -> Section subfolder and cleans up old location.
 */
export async function migrateUserProfilePicture(userId: string) {
  try {
    void Stream;
    void Section;

    const user = await User.findById(userId)
      .populate("stream", "name")
      .populate("section", "name");

    if (!user || !user.profileImageDriveId) return;

    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootFolderId) return;

    const drive = getDriveClient();
    if (!drive) return;

    const streamName = (user.stream as any)?.name || "General";
    const semName = user.semester ? `Semester ${user.semester}` : "General";
    const sectionName = (user.section as any)?.name || "General";

    // 1. Resolve new target subfolder
    const studentsFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Students");
    const streamFolderId = await getOrCreateSubfolder(drive, studentsFolderId, streamName);
    const semFolderId = await getOrCreateSubfolder(drive, streamFolderId, semName);
    const newTargetFolderId = await getOrCreateSubfolder(drive, semFolderId, sectionName);

    // 2. Fetch existing file parents
    const existingFile = await drive.files.get({
      fileId: user.profileImageDriveId,
      fields: "id, parents, name",
    });

    const currentParents = existingFile.data.parents || [];
    if (currentParents.includes(newTargetFolderId)) {
      // Already in correct folder
      return;
    }

    // 3. Move file in Google Drive to new parent folder
    const previousParentsStr = currentParents.join(",");
    await drive.files.update({
      fileId: user.profileImageDriveId,
      addParents: newTargetFolderId,
      removeParents: previousParentsStr,
      fields: "id, parents",
    });
  } catch (err) {
    console.warn("Profile picture migration error:", err);
  }
}
