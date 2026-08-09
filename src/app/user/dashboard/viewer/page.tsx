"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RotateCcw as ResetIcon,
  Sparkles,
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
  const [numPages, setNumPages] = useState(0);
  const [activePage, setActivePage] = useState(1);

  // Transform State
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Panning State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<Map<number, any>>(new Map());

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const lastTapRef = useRef<number>(0);

  const proxyUrl = useMemo(
    () => `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`,
    [fileUrl]
  );

  // Clamps panning so PDF can never be dragged out of visible screen bounds
  const clampPosition = useCallback((x: number, y: number, currentScale: number) => {
    if (currentScale <= 1.0) return { x: 0, y: 0 };
    const container = pagesContainerRef.current;
    const maxPanX = container ? Math.max(0, (container.clientWidth * (currentScale - 1)) / 2) : 200;
    const maxPanY = container ? Math.max(0, (container.clientHeight * (currentScale - 1)) / 2) : 400;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  // 1. Fetch PDF binary stream into Blob URL
  useEffect(() => {
    if (!fileUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

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
              console.error("PDF loading error:", err);
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
            err instanceof Error ? err.message : "Unable to load document stream."
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

  // 2. High-DPI Crisp Multi-Page Canvas Rendering
  const renderAllPages = useCallback(async () => {
    if (!pdfDoc || isImage) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const canvas = pageRefs.current[pageNum - 1];
      if (!canvas) continue;

      try {
        // Cancel existing render task for this page if running
        if (renderTasksRef.current.has(pageNum)) {
          renderTasksRef.current.get(pageNum).cancel();
          renderTasksRef.current.delete(pageNum);
        }

        const page = await pdfDoc.getPage(pageNum);
        const containerWidth = pagesContainerRef.current?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        // Calculate fit scale so PDF page comfortably fills mobile width without horizontal compression
        const fitScale = Math.min(1.5, Math.max(0.8, (containerWidth - 32) / unscaledViewport.width));
        const viewport = page.getViewport({ scale: fitScale, rotation });

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Set backing store dimensions to High-DPI ratio
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // Display dimensions in CSS pixels with responsive maximum bounds
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;
        canvas.style.height = "auto";

        ctx.save();
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    }
  }, [pdfDoc, isImage, rotation]);

  useEffect(() => {
    if (pdfDoc && !loading) {
      void renderAllPages();
    }
  }, [pdfDoc, loading, rotation, renderAllPages]);

  // 3. Track active page on vertical scroll
  const handleScroll = useCallback(() => {
    if (!pagesContainerRef.current || numPages === 0) return;
    const container = pagesContainerRef.current;
    const scrollTop = container.scrollTop;

    for (let i = 0; i < numPages; i++) {
      const canvas = pageRefs.current[i];
      if (canvas) {
        const top = canvas.offsetTop;
        const height = canvas.offsetHeight;
        if (scrollTop >= top - 200 && scrollTop < top + height) {
          setActivePage(i + 1);
          break;
        }
      }
    }
  }, [numPages]);

  // 4. Scroll to specific page number
  const scrollToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(numPages, targetPage));
    const targetCanvas = pageRefs.current[safePage - 1];
    if (targetCanvas && pagesContainerRef.current) {
      targetCanvas.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(safePage);
    }
  };

  // 5. Isolated Zooming & Keyboard controls (Ctrl++, Ctrl--, Ctrl+Wheel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setScale((s) => Math.min(3.0, s + 0.25));
        } else if (e.key === "-") {
          e.preventDefault();
          setScale((s) => Math.max(0.5, s - 0.25));
        } else if (e.key === "0") {
          e.preventDefault();
          resetView();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setScale((s) => {
          const next = Math.max(0.5, Math.min(3.0, s + delta));
          setPosition((p) => clampPosition(p.x, p.y, next));
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [clampPosition]);

  // 6. Reset View Handler
  const resetView = () => {
    setScale(1.0);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    if (pagesContainerRef.current) {
      pagesContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 7. Mouse Drag Panning (Bounded)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    setPosition(clampPosition(nextX, nextY, scale));
  };

  const handleMouseUp = () => setIsDragging(false);

  // 8. Touch Pinch-Zoom & Bounded Pan
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
        setScale((s) => (s > 1.2 ? 1.0 : 2.0));
        setPosition({ x: 0, y: 0 });
      }
      lastTapRef.current = now;

      if (scale > 1.0) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const nextScale = Math.max(0.5, Math.min(3.0, touchStartScaleRef.current * ratio));
      setScale(nextScale);
      setPosition((p) => clampPosition(p.x, p.y, nextScale));
    } else if (e.touches.length === 1 && isDragging) {
      const nextX = e.touches[0].clientX - dragStart.x;
      const nextY = e.touches[0].clientY - dragStart.y;
      setPosition(clampPosition(nextX, nextY, scale));
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden select-none"
    >
      {/* Top Header Controls Bar */}
      <div className="h-14 border-b border-border bg-card/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20 shadow-sm gap-2">
        {/* Left Title & Back */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 px-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <h1 className="text-sm font-semibold truncate max-w-[180px] sm:max-w-[300px] md:max-w-md">
            {title}
          </h1>
        </div>

        {/* Center Toolbar: Zoom, Dual Rotation, Reset View */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Out */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              const next = Math.max(0.5, scale - 0.25);
              setScale(next);
              setPosition((p) => clampPosition(p.x, p.y, next));
            }}
            disabled={scale <= 0.5}
            title="Zoom Out (Ctrl + -)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          {/* Scale Badge */}
          <span className="text-xs font-mono font-medium px-2 py-1 bg-muted rounded-md min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom In */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              const next = Math.min(3.0, scale + 0.25);
              setScale(next);
              setPosition((p) => clampPosition(p.x, p.y, next));
            }}
            disabled={scale >= 3.0}
            title="Zoom In (Ctrl + +)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Rotate Anti-Clockwise (-90°) */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            title="Rotate Anti-Clockwise (-90°)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          {/* Rotate Clockwise (+90°) */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate Clockwise (+90°)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          {/* Reset View Button */}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs font-medium gap-1.5"
            onClick={resetView}
            title="Reset Zoom & Centering"
          >
            <ResetIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset View</span>
          </Button>
        </div>

        {/* Right Actions: Download & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {blobUrl && (
            <a
              href={blobUrl}
              download={`${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`}
              className="inline-flex"
            >
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                title="Download Original File"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Viewport Workspace */}
      <div className="relative flex-1 bg-muted/40 overflow-hidden flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <FileText className="h-5 w-5 text-primary absolute" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Preparing document...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-6 max-w-md text-center bg-card rounded-2xl border border-border shadow-md">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">Unable to Display Document</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
            {blobUrl && (
              <a href={blobUrl} download target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-xl mt-2">
                  <Download className="mr-2 h-4 w-4" /> Download Document
                </Button>
              </a>
            )}
          </div>
        ) : isImage && blobUrl ? (
          /* Direct Image Viewer with HD Scaling & Bounded Pan */
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-none p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-xl transition-transform duration-75"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        ) : (
          /* Continuous Vertical Scroll PDF Canvas Area */
          <div
            ref={pagesContainerRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col items-center gap-6 touch-pan-y"
          >
            <div
              className="flex flex-col items-center gap-6 transition-transform duration-75 origin-top"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
            >
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  className="relative rounded-xl overflow-hidden shadow-xl border border-border/60 bg-card"
                >
                  <canvas
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    className="block max-w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Bottom Page Indicator Bar for PDF */}
        {!loading && !error && !isImage && numPages > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md border border-border rounded-full px-4 py-1.5 shadow-lg flex items-center gap-3 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => scrollToPage(activePage - 1)}
              disabled={activePage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs font-medium font-mono">
              Page {activePage} of {numPages}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => scrollToPage(activePage + 1)}
              disabled={activePage >= numPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
