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

export interface NonPdfFileMetadata {
  extension: string;
  name: string;
  category: "office" | "archive" | "text" | "code" | "binary" | "installer";
  mimeType: string;
  buttonLabel: "Download" | "Install";
}

/**
 * Metadata table defining non-PDF files that cannot be opened via Adobe PDF Embed API.
 * Identifies formats that require direct download / install rather than inline PDF preview.
 */
export const NON_PDF_FILE_TABLE: Record<string, NonPdfFileMetadata> = {
  // Office - Word
  docx: { extension: "docx", name: "Microsoft Word Document", category: "office", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buttonLabel: "Download" },
  doc: { extension: "doc", name: "Microsoft Word Document (Legacy)", category: "office", mimeType: "application/msword", buttonLabel: "Download" },
  odt: { extension: "odt", name: "OpenDocument Text", category: "office", mimeType: "application/vnd.oasis.opendocument.text", buttonLabel: "Download" },
  rtf: { extension: "rtf", name: "Rich Text Format", category: "office", mimeType: "application/rtf", buttonLabel: "Download" },

  // Office - Spreadsheets
  xlsx: { extension: "xlsx", name: "Microsoft Excel Spreadsheet", category: "office", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buttonLabel: "Download" },
  xls: { extension: "xls", name: "Microsoft Excel Spreadsheet (Legacy)", category: "office", mimeType: "application/vnd.ms-excel", buttonLabel: "Download" },
  csv: { extension: "csv", name: "Comma-Separated Values", category: "office", mimeType: "text/csv", buttonLabel: "Download" },
  ods: { extension: "ods", name: "OpenDocument Spreadsheet", category: "office", mimeType: "application/vnd.oasis.opendocument.spreadsheet", buttonLabel: "Download" },

  // Office - Presentations
  pptx: { extension: "pptx", name: "Microsoft PowerPoint Presentation", category: "office", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buttonLabel: "Download" },
  ppt: { extension: "ppt", name: "Microsoft PowerPoint Presentation (Legacy)", category: "office", mimeType: "application/vnd.ms-powerpoint", buttonLabel: "Download" },
  odp: { extension: "odp", name: "OpenDocument Presentation", category: "office", mimeType: "application/vnd.oasis.opendocument.presentation", buttonLabel: "Download" },

  // Compressed Archives
  zip: { extension: "zip", name: "ZIP Compressed Archive", category: "archive", mimeType: "application/zip", buttonLabel: "Download" },
  rar: { extension: "rar", name: "RAR Compressed Archive", category: "archive", mimeType: "application/vnd.rar", buttonLabel: "Download" },
  "7z": { extension: "7z", name: "7-Zip Compressed Archive", category: "archive", mimeType: "application/x-7z-compressed", buttonLabel: "Download" },
  tar: { extension: "tar", name: "Tape Archive", category: "archive", mimeType: "application/x-tar", buttonLabel: "Download" },
  gz: { extension: "gz", name: "Gzip Compressed File", category: "archive", mimeType: "application/gzip", buttonLabel: "Download" },

  // Software Installers & Packages (only show install button)
  exe: { extension: "exe", name: "Windows Executable Program", category: "installer", mimeType: "application/x-msdownload", buttonLabel: "Install" },
  msi: { extension: "msi", name: "Windows Installer Package", category: "installer", mimeType: "application/x-msi", buttonLabel: "Install" },
  apk: { extension: "apk", name: "Android Application Package", category: "installer", mimeType: "application/vnd.android.package-archive", buttonLabel: "Install" },
  dmg: { extension: "dmg", name: "Apple Disk Image", category: "installer", mimeType: "application/x-apple-diskimage", buttonLabel: "Install" },
  pkg: { extension: "pkg", name: "macOS Installer Package", category: "installer", mimeType: "application/octet-stream", buttonLabel: "Install" },

  // Text, Code & Other
  txt: { extension: "txt", name: "Plain Text Document", category: "text", mimeType: "text/plain", buttonLabel: "Download" },
  json: { extension: "json", name: "JSON Data File", category: "code", mimeType: "application/json", buttonLabel: "Download" },
  xml: { extension: "xml", name: "XML Document", category: "code", mimeType: "application/xml", buttonLabel: "Download" },
  epub: { extension: "epub", name: "Electronic Publication", category: "text", mimeType: "application/epub+zip", buttonLabel: "Download" },
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"]);
const OTHER_FILE_EXTENSIONS = new Set(Object.keys(NON_PDF_FILE_TABLE));

/**
 * Extracts a file extension (without dot, lowercase) from a URL or title.
 */
export function extractExtension(urlOrTitle?: string | null): string {
  if (!urlOrTitle) return "";
  const clean = urlOrTitle.split(/[?#]/)[0];

  // 1. Match extension anywhere before non-alphanumeric char or end of string (e.g. "file.exe (Installer)")
  const regexMatches = clean.matchAll(/\.([a-z0-9]{2,5})(?=[^a-z0-9]|$)/gi);
  const allMatches = Array.from(regexMatches);
  if (allMatches.length > 0) {
    // Return the last valid extension found
    return allMatches[allMatches.length - 1][1].toLowerCase().trim();
  }

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

export type ResourceActionKind =
  | "open_pdf"
  | "open_image"
  | "download_file"
  | "open_link";

export interface ResourceActionInfo {
  actionKind: ResourceActionKind;
  buttonLabel: "Open" | "Download" | "Install" | "Open Link";
  iconType: "eye" | "download" | "external";
  isPdf: boolean;
  isImage: boolean;
  isExternalLink: boolean;
  isDownloadOnly: boolean;
  targetUrl: string;
  downloadUrl?: string;
  directUrl?: string;
  fileExtension?: string;
  formatName?: string;
}

/**
 * Computes the unified action to take when a user clicks Open/Download on a resource.
 * - PDF: opens in Adobe PDF Embed API viewer.
 * - Image: opens in Image Viewer.
 * - Non-PDF files: ONLY shows Install/Download button (never opens in PDF viewer).
 * - External link (e.g. Canva, Figma, Notion, external site): opens pasted link in browser.
 */
export function getResourceAction(
  url?: string | null,
  title?: string | null,
  knownMime?: string | null
): ResourceActionInfo {
  if (!url) {
    return {
      actionKind: "download_file",
      buttonLabel: "Download",
      iconType: "download",
      isPdf: false,
      isImage: false,
      isExternalLink: false,
      isDownloadOnly: true,
      targetUrl: "",
    };
  }

  const resolved = resolveResource(url, title || "Document", knownMime || undefined);
  const ext = (resolved.fileExtension || "").toLowerCase();
  const tableMetadata = NON_PDF_FILE_TABLE[ext];

  // 1. PDF Resource -> Open with Adobe PDF Embed API
  if (resolved.category === "pdf" || resolved.viewerKind === "adobe_pdf") {
    return {
      actionKind: "open_pdf",
      buttonLabel: "Open",
      iconType: "eye",
      isPdf: true,
      isImage: false,
      isExternalLink: false,
      isDownloadOnly: false,
      targetUrl: url,
      downloadUrl: resolved.downloadUrl,
      directUrl: resolved.directOpenUrl,
      fileExtension: "pdf",
      formatName: "PDF Document",
    };
  }

  // 2. Image Resource -> Open in Image Viewer
  if (resolved.category === "image" || resolved.viewerKind === "image") {
    return {
      actionKind: "open_image",
      buttonLabel: "Open",
      iconType: "eye",
      isPdf: false,
      isImage: true,
      isExternalLink: false,
      isDownloadOnly: false,
      targetUrl: url,
      downloadUrl: resolved.downloadUrl,
      directUrl: resolved.directOpenUrl,
      fileExtension: ext || "image",
      formatName: "Image",
    };
  }

  // 3. External Web Link (Canva, Figma, Notion, external site not stored on Google Drive)
  const isGoogleDriveStored = Boolean(resolved.driveFileId);
  const isExternalLink =
    resolved.category === "external_website" ||
    (!isGoogleDriveStored && /^https?:\/\//i.test(url) && !resolved.fileExtension && !tableMetadata);

  if (isExternalLink) {
    return {
      actionKind: "open_link",
      buttonLabel: "Open Link",
      iconType: "external",
      isPdf: false,
      isImage: false,
      isExternalLink: true,
      isDownloadOnly: false,
      targetUrl: url,
      directUrl: url,
      formatName: "Web Link",
    };
  }

  // 4. Non-PDF File (cannot open as PDF with Adobe API)
  // "dont show open buttoin, only show install button"
  const buttonLabel: "Download" | "Install" = tableMetadata?.buttonLabel || "Download";
  return {
    actionKind: "download_file",
    buttonLabel,
    iconType: "download",
    isPdf: false,
    isImage: false,
    isExternalLink: false,
    isDownloadOnly: true,
    targetUrl: resolved.downloadUrl || url,
    downloadUrl: resolved.downloadUrl || url,
    directUrl: resolved.directOpenUrl || url,
    fileExtension: ext,
    formatName: tableMetadata?.name || (ext ? ext.toUpperCase() + " File" : "Document File"),
  };
}
