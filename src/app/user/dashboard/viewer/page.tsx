/**
 * @page Viewer (/user/dashboard/viewer)
 * @description Google Drive file viewer/embed page.
 * Converts Drive share links to embeddable preview URLs.
 */
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Convert various Google Drive link formats to an embeddable preview URL.
 *
 * Supported input patterns:
 *   https://drive.google.com/file/d/{FILE_ID}/view?usp=…
 *   https://drive.google.com/open?id={FILE_ID}
 *   https://drive.google.com/uc?id={FILE_ID}&…
 *
 * Output:
 *   https://drive.google.com/file/d/{FILE_ID}/preview
 *
 * Non-Drive URLs are returned as-is.
 */
function toEmbedUrl(url: string): string {
  try {
    // Pattern 1: /file/d/{id}/...
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }

    // Pattern 2: ?id={id}
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (parsed.hostname === "drive.google.com" && idParam) {
      return `https://drive.google.com/file/d/${idParam}/preview`;
    }
  } catch {
    // not a valid URL
  }
  return url;
}

/**
 * Convert a Google Drive URL to a direct download link.
 */
function toDownloadUrl(url: string): string {
  try {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
    }
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (parsed.hostname === "drive.google.com" && idParam) {
      return `https://drive.google.com/uc?export=download&id=${idParam}`;
    }
  } catch {
    // not a valid URL
  }
  return url;
}

export default function PDFViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Document";
  const [showExternalActions, setShowExternalActions] = useState(false);

  const embedUrl = useMemo(() => toEmbedUrl(fileUrl), [fileUrl]);
  const downloadUrl = useMemo(() => toDownloadUrl(fileUrl), [fileUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadViewerActionsAccess = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setShowExternalActions(false);
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setShowExternalActions(data?.user?.role === "admin");
        }
      } catch {
        if (!cancelled) setShowExternalActions(false);
      }
    };

    void loadViewerActionsAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl">
          📄
        </div>
        <h2 className="text-lg font-semibold">No document to display</h2>
        <p className="text-sm text-muted-foreground">Please open a document from your dashboard.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          ← Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-lg flex-shrink-0"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <h1 className="text-sm font-semibold truncate">{title}</h1>
        </div>
        {showExternalActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg gap-1.5 text-xs"
              asChild
            >
              <a href={embedUrl.replace("/preview", "/view")} target="_blank" rel="noopener noreferrer">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="hidden sm:inline">Open in Drive</span>
              </a>
            </Button>
            <Button
              size="sm"
              className="rounded-lg gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* PDF iframe */}
      <div className="flex-1 relative bg-muted/30 rounded-b-2xl overflow-hidden">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={title}
        />
      </div>
    </div>
  );
}
