"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

export default function PDFViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fileUrl = searchParams.get("url") || "";
  const title = searchParams.get("title") || "Document";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(1);

  // Viewer Transform State
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Touch & Drag State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const lastTapRef = useRef<number>(0);

  // Determine proxy stream endpoint
  const proxyUrl = useMemo(
    () => `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`,
    [fileUrl]
  );

  // 1. Fetch PDF stream into Blob URL in browser memory
  useEffect(() => {
    if (!fileUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Check if direct image link
    const isImg = /\.(png|jpe?g|webp|svg)(\?.*)?$/i.test(fileUrl);
    setIsImage(isImg);

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load document.`);
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);

        if (!isImg) {
          // Load PDF via PDF.js CDN worker
          void (async () => {
            try {
              const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
              pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

              const doc = await pdfjs.getDocument(objectUrl).promise;
              if (isMounted) {
                setPdfDoc(doc);
                setNumPages(doc.numPages);
                setLoading(false);
              }
            } catch (err) {
              console.error("PDF.js loading error:", err);
              if (isMounted) {
                setError("Failed to render PDF pages natively.");
                setLoading(false);
              }
            }
          })();
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Proxy fetch error:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load document stream."
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl, proxyUrl]);

  // 2. Render active page on Canvas
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (err) {
        console.error("Page render error:", err);
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc) {
      void renderPage(pageNum);
    }
  }, [pdfDoc, pageNum, renderPage]);

  // 3. Isolated Zoom Control (Ctrl + Wheel / Ctrl + + / Ctrl + -)
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setScale((prev) => Math.min(Math.max(0.5, prev + delta), 4.0));
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-")) {
        e.preventDefault();
        const delta = e.key === "-" ? -0.2 : 0.2;
        setScale((prev) => Math.min(Math.max(0.5, prev + delta), 4.0));
      }
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 4. Responsive Mobile Orientation Change Handling
  useEffect(() => {
    function handleResizeOrOrientation() {
      // Auto-re-center and adjust canvas layout on phone rotate
      setPosition({ x: 0, y: 0 });
    }

    window.addEventListener("resize", handleResizeOrOrientation);
    window.addEventListener("orientationchange", handleResizeOrOrientation);

    return () => {
      window.removeEventListener("resize", handleResizeOrOrientation);
      window.removeEventListener("orientationchange", handleResizeOrOrientation);
    };
  }, []);

  // 5. Touch Pinch-Zoom & Pan Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double-tap zoom toggle
        setScale((prev) => (prev > 1.2 ? 1.0 : 2.2));
        setPosition({ x: 0, y: 0 });
      }
      lastTapRef.current = now;

      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(0.6, touchStartScaleRef.current * ratio), 4.0);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1.0) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  // Mouse Drag Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1.0) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Rotate Manual
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && viewerContainerRef.current) {
        await viewerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      toast.error("Fullscreen mode unavailable on this device.");
    }
  };

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl">
          📄
        </div>
        <h2 className="text-lg font-semibold">No document specified</h2>
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          ← Go Back
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={viewerContainerRef}
      className="relative flex flex-col h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background border rounded-2xl shadow-sm"
    >
      {/* ─── Top Control Toolbar (Acadex UI Theme Tokens) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b bg-card text-card-foreground rounded-t-2xl z-20 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-lg text-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-0.5" />
            Back
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <h1 className="text-xs sm:text-sm font-semibold truncate max-w-[180px] sm:max-w-[320px]">
            {title}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Zoom In / Out */}
          <div className="flex items-center border rounded-lg bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono font-medium px-2 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setScale((s) => Math.min(4.0, s + 0.25))}
              title="Zoom In (Ctrl +)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Reset Zoom */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              setScale(1.0);
              setPosition({ x: 0, y: 0 });
            }}
            title="Reset Zoom & Position"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          {/* Rotate Canvas */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleRotate}
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          {/* Page Navigation (PDFs) */}
          {!isImage && numPages > 1 && (
            <div className="flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs bg-muted/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={pageNum <= 1}
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono text-[11px]">
                {pageNum}/{numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={pageNum >= numPages}
                onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Download Original File */}
          {blobUrl && (
            <a href={blobUrl} download={title || "document.pdf"}>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* ─── Canvas Viewport (Dark/Light Reading Backdrop) ─── */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden bg-neutral-900/90 dark:bg-card/90 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-white/80">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading native PDF canvas stream...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
            <FileText className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              Opening fallback stream...
            </p>
            {fileUrl && (
              <iframe
                src={fileUrl}
                className="w-full h-[400px] border-0 rounded-xl mt-2"
                title={title}
              />
            )}
          </div>
        ) : isImage && blobUrl ? (
          <div
            className="transition-transform duration-75 ease-out origin-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={title}
              className="max-h-[80dvh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          </div>
        ) : (
          <div
            className="transition-transform duration-75 ease-out origin-center shadow-2xl rounded-lg overflow-hidden bg-white"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <canvas ref={canvasRef} className="block max-h-[85dvh] max-w-full" />
          </div>
        )}

        {/* Floating Mobile Touch Hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium tracking-wide flex items-center gap-1.5 pointer-events-none opacity-80 sm:hidden">
          <span>Pinch / Double-tap to Zoom</span>
        </div>
      </div>
    </div>
  );
}
