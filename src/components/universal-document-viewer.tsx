"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { resolveResource } from "@/lib/resource-resolver";
import { ImageViewer } from "@/components/image-viewer";
import { FileDownloadCard } from "@/components/file-download-card";
import { ExternalResourceCard } from "@/components/external-resource-card";
import { AlertCircle, RefreshCw } from "lucide-react";

// Dynamically load AdobePdfViewer on client side with matching skeleton
const AdobePdfViewer = dynamic(
  () => import("@/components/adobe-pdf-viewer").then((mod) => mod.AdobePdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full bg-background">
        <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shadow-xs mb-3">
          <RefreshCw className="h-7 w-7 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">Loading Adobe Acrobat Reader...</p>
      </div>
    ),
  }
);

export interface UniversalDocumentViewerProps {
  /**
   * Document source: URL string, File object, Blob, or Uint8Array.
   */
  src: string | File | Blob | Uint8Array | ArrayBuffer;
  /**
   * Display filename or document title.
   */
  fileName?: string;
  /**
   * Optional MIME type hint (e.g. application/pdf, image/png).
   */
  mimeType?: string;
  /**
   * Callback fired on error.
   */
  onError?: (error: Error) => void;
  /**
   * Additional container CSS classes.
   */
  className?: string;
}

export function UniversalDocumentViewer({
  src,
  fileName = "Document",
  mimeType,
  onError,
  className = "",
}: UniversalDocumentViewerProps) {
  // Convert src to a URL string if needed for resolver
  const sourceUrl = useMemo(() => {
    if (typeof src === "string") return src;
    if (typeof window !== "undefined") {
      if (src instanceof File || src instanceof Blob) {
        return URL.createObjectURL(src);
      }
      if (src instanceof Uint8Array) {
        const blob = new Blob([src as unknown as BlobPart], { type: mimeType || "application/pdf" });
        return URL.createObjectURL(blob);
      }
    }
    return "";
  }, [src, mimeType]);

  // Clean up object URLs on unmount if generated
  React.useEffect(() => {
    return () => {
      if (typeof src !== "string" && sourceUrl && sourceUrl.startsWith("blob:")) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [src, sourceUrl]);

  // Resolve canonical resource metadata and viewer strategy
  const resolved = useMemo(() => {
    return resolveResource(sourceUrl, fileName, mimeType);
  }, [sourceUrl, fileName, mimeType]);

  if (!sourceUrl && !(src instanceof ArrayBuffer)) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center bg-muted/20 ${className}`}>
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">No document source provided.</p>
      </div>
    );
  }

  // 1. Adobe PDF Embed API Viewer (All PDF Resources)
  // Requirement 1 & 2: Use Adobe PDF Embed API for all PDF resources across the application.
  if (resolved.viewerKind === "adobe_pdf" || resolved.viewerKind === "pdfjs") {
    // If original src was a File, Blob, or ArrayBuffer, pass it directly; otherwise pass resolved previewUrl
    const effectivePdfSource = typeof src === "string" ? resolved.previewUrl : src;
    return (
      <AdobePdfViewer
        src={effectivePdfSource}
        title={resolved.title}
        downloadUrl={resolved.downloadUrl}
        onError={onError}
        className={className}
      />
    );
  }

  // 2. Responsive Image Viewer (Requirement 3: Keep existing image viewer unchanged)
  if (resolved.viewerKind === "image") {
    return (
      <ImageViewer
        url={resolved.previewUrl}
        title={resolved.title}
        downloadUrl={resolved.downloadUrl}
        className={className}
      />
    );
  }

  // 3. Download File Card for Other Formats (Requirement 4: DOCX, XLSX, PPTX, ZIP, etc.)
  if (
    resolved.viewerKind === "file_download" ||
    resolved.viewerKind === "office_iframe"
  ) {
    return (
      <FileDownloadCard
        title={resolved.title}
        downloadUrl={resolved.downloadUrl}
        directOpenUrl={resolved.directOpenUrl}
        fileExtension={resolved.fileExtension}
        mimeType={resolved.mimeType}
        className={className}
      />
    );
  }

  // 4. Native Google Docs / Workspace Documents
  if (resolved.viewerKind === "google_iframe") {
    return (
      <div className={`relative w-full h-full flex flex-col bg-background overflow-hidden ${className}`}>
        <iframe
          src={resolved.previewUrl}
          title={resolved.title}
          className="w-full h-full border-0"
          allow="autoplay"
        />
      </div>
    );
  }

  // 5. External Website Card (Requirement 5: Show Open Link button)
  if (resolved.viewerKind === "external_card") {
    return (
      <ExternalResourceCard
        url={resolved.rawUrl}
        title={resolved.title}
        className={className}
      />
    );
  }

  // 6. Unsupported / Fallback Card
  return (
    <FileDownloadCard
      title={resolved.title}
      downloadUrl={resolved.downloadUrl}
      directOpenUrl={resolved.directOpenUrl}
      fileExtension={resolved.fileExtension}
      mimeType={resolved.mimeType}
      className={className}
    />
  );
}

export default UniversalDocumentViewer;
