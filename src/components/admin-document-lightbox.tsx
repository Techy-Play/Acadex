"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X, ExternalLink, Download, FileText, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalDocumentViewer } from "@/components/universal-document-viewer";
import { resolveResource } from "@/lib/resource-resolver";

export interface AdminDocumentLightboxProps {
  url: string;
  title?: string;
  mimeType?: string;
  onClose: () => void;
}

export function AdminDocumentLightbox({
  url,
  title = "Document",
  mimeType,
  onClose,
}: AdminDocumentLightboxProps) {
  // Resolve resource metadata for canonical title and download URLs
  const resolved = resolveResource(url, title, mimeType);

  // Single toggle theme state: defaults to light or saved preference in localStorage
  const [pdfTheme, setPdfTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = localStorage.getItem("acadex-pdf-reader-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // ignore
    }
    return "light";
  });

  const handleToggleTheme = () => {
    const next = pdfTheme === "dark" ? "light" : "dark";
    setPdfTheme(next);
    try {
      localStorage.setItem("acadex-pdf-reader-theme", next);
    } catch {
      // ignore
    }
  };

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling while lightbox is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${resolved.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-7xl h-[92vh] max-h-[96vh] bg-card text-card-foreground rounded-2xl border border-border/80 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lightbox Header */}
        <header className="h-13 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />

            <h2
              className="text-xs sm:text-sm font-semibold truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[340px] md:max-w-lg lg:max-w-xl text-foreground"
              title={resolved.title}
            >
              {resolved.title}
            </h2>

            <Badge
              variant="outline"
              className="text-[10px] font-mono shrink-0 hidden md:inline-flex uppercase"
            >
              {resolved.category === "pdf"
                ? "PDF"
                : resolved.fileExtension || resolved.category}
            </Badge>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Single Toggle Theme Button (Moon and Sun) for PDF */}
            {(resolved.category === "pdf" || resolved.viewerKind === "adobe_pdf") && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleToggleTheme}
                title={pdfTheme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
                aria-label="Toggle PDF Theme"
              >
                {pdfTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                )}
              </Button>
            )}

            {resolved.directOpenUrl && (
              <a
                href={resolved.directOpenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                title="Open original file in new browser tab"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </Button>
              </a>
            )}

            {resolved.downloadUrl && (
              <a
                href={resolved.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                title="Download original document"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:px-2.5 text-xs font-medium gap-1.5 rounded-lg shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </a>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted ml-1"
              onClick={onClose}
              title="Close Lightbox (Esc)"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Lightbox Content Viewer Body */}
        <div className="relative flex-1 w-full min-h-0 bg-muted/20 overflow-hidden">
          <UniversalDocumentViewer
            key={url}
            src={url}
            fileName={resolved.title}
            mimeType={mimeType}
            embedMode="FULL_WINDOW"
            showAnnotationTools={false}
            themeMode={pdfTheme}
            hideFloatingThemeToggle={true}
            onThemeModeChange={(m) => setPdfTheme(m)}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDocumentLightbox;
