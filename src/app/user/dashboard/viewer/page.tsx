/**
 * @page Viewer (/user/dashboard/viewer)
 * @description Google Drive file viewer/embed page.
 * Converts Drive share links to embeddable preview URLs.
 */
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
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
 *   https://drive.google.com/file/d/{FILE_ID}/preview?rm=minimal
 *
 * Non-Drive URLs are returned as-is.
 */
function toEmbedUrl(url: string): string {
  try {
    // Pattern 1: /file/d/{id}/...
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview?rm=minimal`;
    }

    // Pattern 2: ?id={id}
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (parsed.hostname === "drive.google.com" && idParam) {
      return `https://drive.google.com/file/d/${idParam}/preview?rm=minimal`;
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

  const embedUrl = useMemo(() => toEmbedUrl(fileUrl), [fileUrl]);

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
      </div>

      {/* PDF iframe */}
      <div className="flex-1 relative bg-muted/30 rounded-b-2xl overflow-hidden">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title={title}
        />
      </div>
    </div>
  );
}
