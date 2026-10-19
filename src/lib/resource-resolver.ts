/**
 * @module lib/resource-resolver
 * @description Centralized resource resolution, URL normalization, format categorization,
 * and viewer strategy selection for Acadex.
 */

export type ResourceCategory =
  | "pdf"
  | "image"
  | "file_download"
  | "office_drive"
  | "google_workspace"
  | "external_website"
  | "unknown";

export type ViewerKind =
  | "adobe_pdf"
  | "pdfjs"
  | "image"
  | "file_download"
  | "office_iframe"
  | "google_iframe"
  | "external_card"
  | "unsupported";

export interface ResolvedResource {
  category: ResourceCategory;
  rawUrl: string;
  cleanUrl: string;
  driveFileId?: string;
  previewUrl: string;
  downloadUrl: string;
  directOpenUrl: string;
  mimeType?: string;
  fileExtension?: string;
  canEmbed: boolean;
  viewerKind: ViewerKind;
  title: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"]);
const OTHER_FILE_EXTENSIONS = new Set([
  "docx",
  "doc",
  "pptx",
  "ppt",
  "xlsx",
  "xls",
  "csv",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "txt",
  "rtf",
  "json",
]);

/**
 * Extracts a file extension (without dot, lowercase) from a URL or title.
 */
export function extractExtension(urlOrTitle?: string | null): string {
  if (!urlOrTitle) return "";
  const clean = urlOrTitle.split(/[?#]/)[0];
  const lastSegment = clean.split("/").filter(Boolean).pop() || "";
  const parts = lastSegment.split(".");
  if (parts.length > 1) {
    const ext = parts.pop()!.toLowerCase().trim();
    // Validate that it looks like a realistic file extension (2-5 alphanumeric chars)
    if (/^[a-z0-9]{2,5}$/.test(ext)) {
      return ext;
    }
  }
  return "";
}

/**
 * Extracts a Google Drive File ID from any Google Drive or Google Docs URL.
 */
export function extractGoogleDriveId(url?: string | null): {
  id: string | null;
  kind?: "file" | "document" | "spreadsheets" | "presentation" | "forms";
} {
  if (!url) return { id: null };

  // 1. Native Google Workspace documents
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { id: docMatch[1], kind: "document" };

  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return { id: sheetMatch[1], kind: "spreadsheets" };

  const presMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presMatch) return { id: presMatch[1], kind: "presentation" };

  const formMatch = url.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (formMatch) return { id: formMatch[1], kind: "forms" };

  // 2. Drive file URLs (/file/d/{id})
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { id: fileMatch[1], kind: "file" };

  // 3. Query parameter variants: ?id=..., &id=..., /open?id=..., /uc?id=...
  const queryMatch = url.match(/(?:drive\.google\.com.*[?&]id=)([a-zA-Z0-9_-]+)/);
  if (queryMatch) return { id: queryMatch[1], kind: "file" };

  return { id: null };
}

/**
 * Resolves any resource record URL and title into a canonical ResolvedResource.
 */
export function resolveResource(
  rawUrl: string,
  title = "Document",
  knownMime?: string
): ResolvedResource {
  const trimmedUrl = (rawUrl || "").trim();
  const cleanTitle = (title || "Document").trim();

  if (!trimmedUrl) {
    return {
      category: "unknown",
      rawUrl: "",
      cleanUrl: "",
      previewUrl: "",
      downloadUrl: "",
      directOpenUrl: "",
      canEmbed: false,
      viewerKind: "unsupported",
      title: cleanTitle,
    };
  }

  // Check file extension from title first, then URL
  const ext = extractExtension(cleanTitle) || extractExtension(trimmedUrl);
  const { id: driveId, kind: workspaceKind } = extractGoogleDriveId(trimmedUrl);

  // 1. Native Google Workspace Documents (Docs, Sheets, Slides)
  if (workspaceKind && driveId && workspaceKind !== "file") {
    let previewUrl = `https://docs.google.com/${workspaceKind}/d/${driveId}/preview`;
    let directOpenUrl = `https://docs.google.com/${workspaceKind}/d/${driveId}/edit`;
    if (workspaceKind === "forms") {
      previewUrl = `https://docs.google.com/forms/d/${driveId}/viewform?embedded=true`;
      directOpenUrl = `https://docs.google.com/forms/d/${driveId}/viewform`;
    }

    return {
      category: "google_workspace",
      rawUrl: trimmedUrl,
      cleanUrl: previewUrl,
      driveFileId: driveId,
      previewUrl,
      downloadUrl: directOpenUrl,
      directOpenUrl,
      canEmbed: true,
      viewerKind: "google_iframe",
      fileExtension: ext || undefined,
      mimeType: knownMime,
      title: cleanTitle,
    };
  }

  // 2. Google Drive Stored Files
  if (driveId) {
    const directDownload = `https://drive.google.com/uc?export=download&confirm=t&id=${driveId}`;
    const directOpen = `https://drive.google.com/file/d/${driveId}/view`;

    // A. Image stored in Google Drive
    if (IMAGE_EXTENSIONS.has(ext) || (knownMime && knownMime.startsWith("image/"))) {
      const proxyPreview = `/api/pdf-proxy?url=${encodeURIComponent(trimmedUrl)}&filename=${encodeURIComponent(cleanTitle)}`;
      return {
        category: "image",
        rawUrl: trimmedUrl,
        cleanUrl: directOpen,
        driveFileId: driveId,
        previewUrl: proxyPreview,
        downloadUrl: directDownload,
        directOpenUrl: directOpen,
        canEmbed: true,
        viewerKind: "image",
        fileExtension: ext || "png",
        mimeType: knownMime || `image/${ext || "jpeg"}`,
        title: cleanTitle,
      };
    }

    // B. Other non-PDF files stored in Google Drive (DOCX, PPTX, XLSX, ZIP, etc.)
    // Requirement 4: Show the file name, basic details, and a Download File button instead of trying to preview them.
    if (
      OTHER_FILE_EXTENSIONS.has(ext) ||
      (knownMime &&
        (knownMime.includes("word") ||
          knownMime.includes("presentation") ||
          knownMime.includes("spreadsheet") ||
          knownMime.includes("zip") ||
          knownMime.includes("compressed")))
    ) {
      return {
        category: "file_download",
        rawUrl: trimmedUrl,
        cleanUrl: directOpen,
        driveFileId: driveId,
        previewUrl: directDownload,
        downloadUrl: directDownload,
        directOpenUrl: directOpen,
        canEmbed: false,
        viewerKind: "file_download",
        fileExtension: ext,
        mimeType: knownMime,
        title: cleanTitle,
      };
    }

    // C. PDF stored in Google Drive (or default Drive resource)
    // Requirement 1 & 2: Use Adobe PDF Embed API for all PDF resources.
    // Preserves authenticated streaming through /api/pdf-proxy.
    const proxyPreview = `/api/pdf-proxy?url=${encodeURIComponent(trimmedUrl)}&filename=${encodeURIComponent(cleanTitle)}`;
    return {
      category: "pdf",
      rawUrl: trimmedUrl,
      cleanUrl: directOpen,
      driveFileId: driveId,
      previewUrl: proxyPreview,
      downloadUrl: directDownload,
      directOpenUrl: directOpen,
      canEmbed: true,
      viewerKind: "adobe_pdf",
      fileExtension: ext || "pdf",
      mimeType: knownMime || "application/pdf",
      title: cleanTitle,
    };
  }

  // 3. External Non-Drive URLs
  const isHttp = /^https?:\/\//i.test(trimmedUrl);
  if (isHttp) {
    // A. Direct PDF link -> Use Adobe PDF Embed API
    if (ext === "pdf" || knownMime === "application/pdf") {
      return {
        category: "pdf",
        rawUrl: trimmedUrl,
        cleanUrl: trimmedUrl,
        previewUrl: trimmedUrl,
        downloadUrl: trimmedUrl,
        directOpenUrl: trimmedUrl,
        canEmbed: true,
        viewerKind: "adobe_pdf",
        fileExtension: "pdf",
        mimeType: "application/pdf",
        title: cleanTitle,
      };
    }

    // B. Direct Image link -> Keep existing Image Viewer
    if (IMAGE_EXTENSIONS.has(ext) || (knownMime && knownMime.startsWith("image/"))) {
      return {
        category: "image",
        rawUrl: trimmedUrl,
        cleanUrl: trimmedUrl,
        previewUrl: trimmedUrl,
        downloadUrl: trimmedUrl,
        directOpenUrl: trimmedUrl,
        canEmbed: true,
        viewerKind: "image",
        fileExtension: ext,
        mimeType: knownMime,
        title: cleanTitle,
      };
    }

    // C. Direct Other downloadable files (e.g. .docx, .xlsx, .zip)
    if (OTHER_FILE_EXTENSIONS.has(ext)) {
      return {
        category: "file_download",
        rawUrl: trimmedUrl,
        cleanUrl: trimmedUrl,
        previewUrl: trimmedUrl,
        downloadUrl: trimmedUrl,
        directOpenUrl: trimmedUrl,
        canEmbed: false,
        viewerKind: "file_download",
        fileExtension: ext,
        mimeType: knownMime,
        title: cleanTitle,
      };
    }

    // D. External Website / Article / Web link
    // Requirement 5: Show an Open Link button instead of treating them as downloadable files.
    return {
      category: "external_website",
      rawUrl: trimmedUrl,
      cleanUrl: trimmedUrl,
      previewUrl: trimmedUrl,
      downloadUrl: "",
      directOpenUrl: trimmedUrl,
      canEmbed: false,
      viewerKind: "external_card",
      fileExtension: ext || undefined,
      mimeType: knownMime,
      title: cleanTitle,
    };
  }

  // 4. Fallback unknown format
  return {
    category: "unknown",
    rawUrl: trimmedUrl,
    cleanUrl: trimmedUrl,
    previewUrl: trimmedUrl,
    downloadUrl: trimmedUrl,
    directOpenUrl: trimmedUrl,
    canEmbed: false,
    viewerKind: "unsupported",
    fileExtension: ext || undefined,
    mimeType: knownMime,
    title: cleanTitle,
  };
}
