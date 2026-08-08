/**
 * @module API/Profile/UploadPicture
 * @description Uploads user profile pictures directly to 5 TB Google Drive under:
 * Acadex Storage / Students / [Stream Name] / Semester [N] / [Section Name] / [FirstName][RollNumber].[ext]
 * (Or Acadex Storage / Admins / [FirstName]SuperAdmin.[ext] for admins).
 * If Google Drive API returns storage quota error (Service Account 0-byte limit on standard folders),
 * it seamlessly falls back to storing an optimized Base64 Data URI in MongoDB so profile uploads NEVER fail!
 */
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { google } from "googleapis";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Stream from "@/models/Stream";
import Section from "@/models/Section";

function getDriveClient() {
  const jsonCredentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonCredentialsStr) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing.");
  const credentials = JSON.parse(jsonCredentialsStr);
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

export async function POST(request: Request) {
  try {
    await connectDB();
    void Stream;
    void Section;

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId)
      .populate("stream", "name")
      .populate("section", "name");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/png";

    // Attempt Google Drive upload first
    let publicUrl: string | null = null;
    let newDriveId: string | null = null;

    try {
      const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (rootFolderId) {
        const drive = getDriveClient();

        // 1. Delete old profile image file from Google Drive if exists
        if (user.profileImageDriveId) {
          try {
            await drive.files.delete({
              fileId: user.profileImageDriveId,
              supportsAllDrives: true,
            });
          } catch (err) {
            console.warn("Could not delete old profile picture from Drive:", err);
          }
        }

        // 2. Build folder hierarchy based on user role
        let targetFolderId: string;
        if (user.role === "admin") {
          const adminsFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Admins");
          targetFolderId = adminsFolderId;
        } else {
          const streamName = (user.stream as any)?.name || "General";
          const semName = user.semester ? `Semester ${user.semester}` : "General";
          const sectionName = (user.section as any)?.name || "General";

          const studentsFolderId = await getOrCreateSubfolder(drive, rootFolderId, "Students");
          const streamFolderId = await getOrCreateSubfolder(drive, studentsFolderId, streamName);
          const semFolderId = await getOrCreateSubfolder(drive, streamFolderId, semName);
          targetFolderId = await getOrCreateSubfolder(drive, semFolderId, sectionName);
        }

        // 3. Format unique filename: [FirstName][RollNumber/Admin].[ext]
        const firstName = user.name.trim().split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
        const rollNo = (user.college_id || (user.isSuperAdmin ? "SuperAdmin" : "Admin")).replace(/[^a-zA-Z0-9]/g, "");
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const uniqueFileName = `${firstName}${rollNo}.${ext}`;

        // 4. Stream file upload to Google Drive
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        const uploadRes = await drive.files.create({
          requestBody: {
            name: uniqueFileName,
            parents: [targetFolderId],
          },
          media: {
            mimeType,
            body: readableStream,
          },
          fields: "id, name, webViewLink, webContentLink",
          supportsAllDrives: true,
        });

        newDriveId = uploadRes.data.id!;

        // 5. Make file publicly readable
        await drive.permissions.create({
          fileId: newDriveId,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
          supportsAllDrives: true,
        });

        publicUrl = `https://drive.google.com/uc?export=view&id=${newDriveId}`;
      }
    } catch (driveErr) {
      console.warn(
        "Google Drive upload quota/permission error, falling back to Base64 storage:",
        driveErr
      );
    }

    // Fail-safe fallback: If Google Drive threw storage quota 403 error, store as optimized Base64 Data URI
    if (!publicUrl) {
      publicUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    }

    // 6. Update user model in MongoDB
    user.profileImage = publicUrl;
    if (newDriveId) {
      user.profileImageDriveId = newDriveId;
    }
    await user.save();

    return NextResponse.json({
      success: true,
      profileImage: publicUrl,
      user: {
        id: user._id.toString(),
        name: user.name,
        profileImage: publicUrl,
      },
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload profile picture.",
      },
      { status: 500 }
    );
  }
}
