/**
 * @module API/PDFProxy
 * @description Proxy endpoint that streams binary PDF bytes from Google Drive or external URLs
 * to the browser memory (Blob URL). Solves browser CORS restrictions and keeps the student
 * 100% on au-acadex.com (/user/dashboard/viewer?url=...).
 */
import { NextResponse } from "next/server";
import { google } from "googleapis";

function getDriveClient() {
  const jsonCredentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonCredentialsStr) return null;

  try {
    const credentials = JSON.parse(jsonCredentialsStr);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing required 'url' parameter." },
        { status: 400 }
      );
    }

    // 1. Try to extract Google Drive File ID
    const driveMatch = fileUrl.match(
      /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/
    );
    const fileId = driveMatch ? driveMatch[1] : null;

    if (fileId) {
      const drive = getDriveClient();
      if (drive) {
        try {
          const driveRes = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
          );

          const buffer = Buffer.from(driveRes.data as ArrayBuffer);
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (driveErr) {
          console.warn("Drive API media fetch failed, falling back to direct fetch:", driveErr);
        }
      }
    }

    // 2. Direct fetch fallback for direct URLs
    const directFetchUrl = fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : fileUrl;

    const response = await fetch(directFetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file stream: HTTP ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "application/pdf";
    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("PDF Proxy Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to proxy document stream.",
      },
      { status: 500 }
    );
  }
}
