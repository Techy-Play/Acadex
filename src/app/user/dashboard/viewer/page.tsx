"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Download,
  FileText,
  ExternalLink,
  FileWarning,
} from "lucide-react";
import { UniversalDocumentViewer } from "@/components/universal-document-viewer";
import { resolveResource } from "@/lib/resource-resolver";

export default function DocumentViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Document";

  const [viewerError, setViewerError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState(fileUrl);

  if (fileUrl !== lastUrl) {
    setLastUrl(fileUrl);
    setViewerError(null);
  }

  // Resolve resource category, URLs, and viewer strategy
  const resolved = useMemo(() => {
    return resolveResource(fileUrl, title);
  }, [fileUrl, title]);

  // Derive human-readable format badge
  const formatBadge = useMemo(() => {
    switch (resolved.category) {
      case "pdf":
        return "PDF";
      case "image":
        return (resolved.fileExtension || "IMAGE").toUpperCase();
      case "file_download":
      case "office_drive":
        if (resolved.fileExtension === "pptx" || resolved.fileExtension === "ppt") return "PowerPoint";
        if (resolved.fileExtension === "xlsx" || resolved.fileExtension === "xls" || resolved.fileExtension === "csv") return "Excel";
        if (resolved.fileExtension === "docx" || resolved.fileExtension === "doc") return "Word";
        if (resolved.fileExtension === "zip" || resolved.fileExtension === "rar" || resolved.fileExtension === "7z") return "Archive";
        return resolved.fileExtension ? resolved.fileExtension.toUpperCase() : "File";
      case "google_workspace":
        return "Google Docs";
      case "external_website":
        return "Web Link";
      default:
        return resolved.fileExtension ? resolved.fileExtension.toUpperCase() : "Document";
    }
  }, [resolved]);

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center">
        <div className="p-3 rounded-full bg-destructive/10 text-destructive mb-3">
          <FileWarning className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold">No Document Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No document URL was provided. Please navigate back to your course materials and select a resource.
        </p>
        <Button size="sm" variant="outline" className="mt-4 gap-1.5 rounded-xl" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background select-none overflow-hidden">
      {/* Top Application Header Bar */}
      <header className="h-12 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 z-20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg shrink-0"
            onClick={() => router.back()}
            title="Go Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0 hidden sm:block" />
            <h1
              className="text-sm font-semibold truncate max-w-[150px] xs:max-w-[220px] sm:max-w-[320px] md:max-w-md lg:max-w-xl"
              title={resolved.title}
            >
              {resolved.title}
            </h1>
            <Badge variant="secondary" className="text-[10px] font-mono shrink-0 hidden sm:inline-flex">
              {formatBadge}
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {resolved.category === "external_website" ? (
            <a
              href={resolved.directOpenUrl || fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium rounded-lg gap-1.5 shadow-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Link</span>
              </Button>
            </a>
          ) : (
            <>
              {resolved.directOpenUrl && (
                <a
                  href={resolved.directOpenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg shrink-0"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}

              {resolved.downloadUrl && (
                <a
                  href={resolved.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium rounded-lg gap-1.5 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </a>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Document Content Canvas */}
      <main className="relative flex-1 w-full h-full min-h-0 bg-muted/30 overflow-hidden flex items-center justify-center">
        {viewerError ? (
          <div className="flex flex-col items-center gap-3 p-6 max-w-md text-center bg-card rounded-2xl border border-border shadow-md m-4">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <FileWarning className="h-6 w-6" />
            </div>
            <h2 className="font-semibold text-base">Unable to Display Document</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{viewerError}</p>
            {resolved.downloadUrl && (
              <a href={resolved.downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-xl mt-2 gap-1.5">
                  <Download className="h-4 w-4" /> Download Original File
                </Button>
              </a>
            )}
          </div>
        ) : (
          <UniversalDocumentViewer
            key={fileUrl}
            src={fileUrl}
            fileName={resolved.title}
            embedMode="FULL_WINDOW"
            showAnnotationTools={false}
            onError={(err) => setViewerError(err.message || "Failed to render document.")}
            className="w-full h-full"
          />
        )}
      </main>
    </div>
  );
}
