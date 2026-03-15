"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function toEmbedUrl(url: string): string {
  try {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview?rm=minimal`;
    }

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
  const viewerRef = useRef<HTMLDivElement | null>(null);

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Document";
  const [isFullscreen, setIsFullscreen] = useState(false);

  const embedUrl = useMemo(() => toEmbedUrl(fileUrl), [fileUrl]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && viewerRef.current) {
        await viewerRef.current.requestFullscreen();
        setIsFullscreen(true);
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      toast.error("Fullscreen is not supported on this device");
    }
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl">📄</div>
        <h2 className="text-lg font-semibold">No document to display</h2>
        <p className="text-sm text-muted-foreground">Please open a document from your dashboard.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          ← Go Back
        </Button>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className="relative flex flex-col h-[calc(100dvh-4rem)] gap-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-lg flex-shrink-0">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <h1 className="text-sm font-semibold truncate">{title}</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="rounded-lg"
          title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isFullscreen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15H5v4m0 0h4m-4 0l5-5m5-5h4V5m0 0v4m0-4l-5 5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4m12-4v4h-4" />
            )}
          </svg>
          <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Full"}</span>
        </Button>
      </div>

      <div className="flex-1 min-h-0 rounded-b-2xl overflow-hidden border border-t-0 bg-muted/20">
        <div className="relative bg-muted/30 h-full min-h-0">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
