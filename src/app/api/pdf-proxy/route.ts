/**
 * @module API/PDFProxy
 * @description Secure proxy endpoint that streams binary PDF/image bytes from Google Drive
 * to the browser client. Solves browser CORS restrictions, prevents SSRF, and enables
 * HTTP Range requests for progressive PDF.js streaming.
 */
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthUser } from "@/lib/rbac";
import { extractGoogleDriveId } from "@/lib/resource-resolver";

import net from "node:net";

/**
 * Validates that a target URL is an authorized HTTPS Google Drive endpoint
 * and blocks SSRF, private IPs, loopback, cloud metadata, userinfo, and non-standard ports.
 */
function isSafeUpstreamUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    // Strict HTTPS
    if (url.protocol !== "https:") return false;

    // Reject userinfo (e.g. https://attacker@drive.google.com)
    if (url.username || url.password) return false;

    // Reject custom ports (only default HTTPS allowed)
    if (url.port && url.port !== "443") return false;

    const hostname = url.hostname.toLowerCase();

    // Reject all IP literals (IPv4, IPv6, octal, hex, brackets)
    if (net.isIP(hostname) !== 0 || hostname.startsWith("[") || /^[0-9.]+$/.test(hostname)) {
      return false;
    }

    // Explicit Google Drive & Docs Content Allowlist
    const exactAllowed = new Set([
      "drive.google.com",
      "docs.google.com",
      "drive.usercontent.google.com",
    ]);
    if (exactAllowed.has(hostname)) return true;

    // Allowed CDN subdomains (e.g. lh3.googleusercontent.com, doc-0k-6s-docs.googleusercontent.com)
    if (/^lh[3-6]\.googleusercontent\.com$/.test(hostname)) return true;
    if (/^doc-[a-z0-9]+-[a-z0-9]+-(?:docs|drive)\.googleusercontent\.com$/.test(hostname)) return true;
    if (/^[a-z0-9-]+\.docs\.google\.com$/.test(hostname)) return true;

    return false;
  } catch {
    return false;
  }
}

/** Build an authenticated Google Drive client using OAuth2 or Service Account. */
function getDriveClient() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (refreshToken && clientId && clientSecret) {
    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      return google.drive({ version: "v3", auth: oauth2Client });
    } catch {
      // fall through to service account
    }
  }

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
    // 1. Authoritative authentication check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing required 'url' parameter." },
        { status: 400 }
      );
    }

    // 2. SSRF Protection: Validate target URL
    if (!isSafeUpstreamUrl(fileUrl)) {
      return NextResponse.json(
        { error: "URL not allowed. Only verified Google Drive URLs are supported." },
        { status: 403 }
      );
    }

    const filenameParam = searchParams.get("filename") || "document";
    const encodedFilename = encodeURIComponent(filenameParam);
    const rawRangeHeader = request.headers.get("range");
    let safeRangeHeader: string | null = null;
    if (rawRangeHeader && /^bytes=\d*-\d*$/.test(rawRangeHeader.trim())) {
      safeRangeHeader = rawRangeHeader.trim();
    }

    // 3. Extract Google Drive file ID
    const { id: fileId } = extractGoogleDriveId(fileUrl);

    // 4. Try Google Drive API streaming
    if (fileId) {
      const drive = getDriveClient();
      if (drive) {
        try {
          const driveHeaders: Record<string, string> = {};
          if (safeRangeHeader) {
            driveHeaders["Range"] = safeRangeHeader;
          }

          const driveRes = await drive.files.get(
            { fileId, alt: "media" },
            {
              responseType: "stream",
              headers: driveHeaders,
            }
          );

          const contentType =
            (driveRes.headers && (driveRes.headers["content-type"] as string)) ||
            "application/pdf";
          const contentLength =
            driveRes.headers && (driveRes.headers["content-length"] as string);
          const contentRange =
            driveRes.headers && (driveRes.headers["content-range"] as string);
          const status = contentRange || driveRes.status === 206 ? 206 : 200;

          const responseHeaders = new Headers();
          responseHeaders.set("Content-Type", contentType);
          responseHeaders.set("Content-Disposition", `inline; filename="${encodedFilename}"`);
          responseHeaders.set("Cache-Control", "private, max-age=3600");
          responseHeaders.set("Accept-Ranges", "bytes");

          if (contentLength) responseHeaders.set("Content-Length", contentLength);
          if (contentRange) responseHeaders.set("Content-Range", contentRange);

          return new Response(driveRes.data as unknown as ReadableStream, {
            status,
            headers: responseHeaders,
          });
        } catch (driveErr) {
          console.warn("Drive API media fetch failed, falling back to direct fetch:", driveErr);
        }
      }
    }

    // 5. Fallback: Authenticated direct fetch with safe redirect handling
    let currentFetchUrl = fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
      : fileUrl;

    const fetchHeaders: HeadersInit = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (safeRangeHeader) {
      fetchHeaders["Range"] = safeRangeHeader;
    }

    let upstreamRes: globalThis.Response | null = null;
    let redirectCount = 0;
    const maxRedirects = 3;

    while (redirectCount <= maxRedirects) {
      upstreamRes = await fetch(currentFetchUrl, {
        headers: fetchHeaders,
        redirect: "manual",
      });

      if ([301, 302, 303, 307, 308].includes(upstreamRes.status)) {
        const redirectLocation = upstreamRes.headers.get("location");
        if (!redirectLocation) {
          throw new Error("Redirect without location header");
        }

        const resolvedRedirect = new URL(redirectLocation, currentFetchUrl).toString();
        if (!isSafeUpstreamUrl(resolvedRedirect)) {
          return NextResponse.json(
            { error: "Redirect destination not allowed." },
            { status: 403 }
          );
        }

        currentFetchUrl = resolvedRedirect;
        redirectCount++;
        continue;
      }

      break;
    }

    if (!upstreamRes || !upstreamRes.ok) {
      throw new Error(`Upstream fetch failed: HTTP ${upstreamRes?.status || "unknown"}`);
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/pdf";
    const contentLength = upstreamRes.headers.get("content-length");
    const contentRange = upstreamRes.headers.get("content-range");
    const status = upstreamRes.status === 206 || contentRange ? 206 : 200;

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Content-Disposition", `inline; filename="${encodedFilename}"`);
    responseHeaders.set("Cache-Control", "private, max-age=3600");
    responseHeaders.set("Accept-Ranges", "bytes");

    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstreamRes.body, {
      status,
      headers: responseHeaders,
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
