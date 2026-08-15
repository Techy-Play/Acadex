"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // Transform State (Scale 0.5 to 3.0)
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState<"custom" | "width" | "page">("width");

  // Panning State for Image Viewer
  const [imgPosition, setImgPosition] = useState({ x: 0, y: 0 });
  const [isImgDragging, setIsImgDragging] = useState(false);
  const [imgDragStart, setImgDragStart] = useState({ x: 0, y: 0 });

  // DOM Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const debounceRenderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageBaseDimensionsRef = useRef<{ width: number; height: number }[]>([]);

  // Touch gesture tracking
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const touchFocalPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const proxyUrl = useMemo(
    () => `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`,
    [fileUrl]
  );

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

              const doc = await pdfjs.getDocument({
                url: objectUrl,
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
              }).promise;

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

  // 2. High-DPI Crisp Multi-Page Canvas Rendering at Exact Zoom Level
  const renderAllPages = useCallback(async () => {
    if (!pdfDoc || isImage || !scrollViewportRef.current) return;

    const dpr = typeof window !== "undefined" ? Math.max(1.5, window.devicePixelRatio || 1) : 1.5;
    const viewportWidth = scrollViewportRef.current.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
    const availableWidth = Math.max(300, viewportWidth - 48);

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const canvas = pageCanvasRefs.current[pageNum - 1];
      const pageContainer = pageContainerRefs.current[pageNum - 1];
      if (!canvas || !pageContainer) continue;

      try {
        // Cancel existing render task for this page if currently executing
        if (renderTasksRef.current.has(pageNum)) {
          try {
            renderTasksRef.current.get(pageNum).cancel();
          } catch {
            // Ignore cancel errors
          }
          renderTasksRef.current.delete(pageNum);
        }

        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        // Calculate base fit-width scale
        const baseFitWidthScale = availableWidth / unscaledViewport.width;
        // Calculate base fit-page scale
        const viewportHeight = scrollViewportRef.current.clientHeight || 700;
        const availableHeight = Math.max(400, viewportHeight - 80);
        const baseFitPageScale = Math.min(baseFitWidthScale, availableHeight / unscaledViewport.height);

        let targetBaseScale = baseFitWidthScale;
        if (fitMode === "page") {
          targetBaseScale = baseFitPageScale;
        }

        // The effective scale combines base layout fit with user scale multiplier
        const effectiveScale = targetBaseScale * scale;
        const viewport = page.getViewport({ scale: effectiveScale, rotation });

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) continue;

        // Set high-DPI internal buffer dimensions (prevents blurriness)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // Store base dimensions for instant CSS scaling during zoom
        const baseW = viewport.width / scale;
        const baseH = viewport.height / scale;
        pageBaseDimensionsRef.current[pageNum - 1] = { width: baseW, height: baseH };

        // Ensure container is sized correctly if this is the first render
        pageContainer.style.width = `${Math.floor(viewport.width)}px`;
        pageContainer.style.height = `${Math.floor(viewport.height)}px`;

        ctx.save();
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          intent: "display",
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        // Notice: We intentionally do NOT show a spinner overlay here anymore.
        // This eliminates the flickering effect while the background re-renders.
        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    }
  }, [pdfDoc, isImage, scale, rotation, fitMode]);

  // Debounce canvas re-renders when zoom changes to maintain smooth UI responsiveness
  useEffect(() => {
    if (pdfDoc && !loading) {
      if (debounceRenderTimeoutRef.current) {
        clearTimeout(debounceRenderTimeoutRef.current);
      }
      debounceRenderTimeoutRef.current = setTimeout(() => {
        void renderAllPages();
      }, 150);
    }
    return () => {
      if (debounceRenderTimeoutRef.current) {
        clearTimeout(debounceRenderTimeoutRef.current);
      }
    };
  }, [pdfDoc, loading, scale, rotation, fitMode, renderAllPages]);

  // 3. Accurate Page Tracking using IntersectionObserver (immune to scale / pan bugs)
  useEffect(() => {
    if (!scrollViewportRef.current || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisiblePage = activePage;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pageNum = Number(entry.target.getAttribute("data-page-number"));
            if (pageNum) {
              mostVisiblePage = pageNum;
            }
          }
        }

        if (maxRatio > 0.15) {
          setActivePage(mostVisiblePage);
        }
      },
      {
        root: scrollViewportRef.current,
        threshold: [0.15, 0.5, 0.8],
      }
    );

    pageContainerRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages, loading, activePage]);

  // 4. Scroll to specific page number
  const scrollToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(numPages, targetPage));
    const targetElement = pageContainerRefs.current[safePage - 1];
    if (targetElement && scrollViewportRef.current) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(safePage);
    }
  };

  // 5. Focal-Point Zoom Change Helper
  const applyZoom = useCallback(
    (newScale: number, focalPoint?: { x: number; y: number }) => {
      const clampedScale = Math.max(0.5, Math.min(3.0, Number(newScale.toFixed(2))));
      if (clampedScale === scale) return;

      const viewport = scrollViewportRef.current;
      if (!viewport || !focalPoint) {
        setScale(clampedScale);
        setFitMode("custom");
        
        // Instant hardware-accelerated stretch for buttons
        pageContainerRefs.current.forEach((container, i) => {
          const base = pageBaseDimensionsRef.current[i];
          if (container && base) {
            container.style.width = `${Math.floor(base.width * clampedScale)}px`;
            container.style.height = `${Math.floor(base.height * clampedScale)}px`;
          }
        });
        return;
      }

      // Preserve point under cursor/finger during zoom
      const prevScrollX = viewport.scrollLeft;
      const prevScrollY = viewport.scrollTop;
      const scaleRatio = clampedScale / scale;

      const focalX = focalPoint.x + prevScrollX;
      const focalY = focalPoint.y + prevScrollY;

      const newScrollX = focalX * scaleRatio - focalPoint.x;
      const newScrollY = focalY * scaleRatio - focalPoint.y;

      setScale(clampedScale);
      setFitMode("custom");

      // Instant hardware-accelerated stretch for pinch/wheel (zero lag)
      pageContainerRefs.current.forEach((container, i) => {
        const base = pageBaseDimensionsRef.current[i];
        if (container && base) {
          container.style.width = `${Math.floor(base.width * clampedScale)}px`;
          container.style.height = `${Math.floor(base.height * clampedScale)}px`;
        }
      });

      requestAnimationFrame(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollLeft = Math.max(0, newScrollX);
          scrollViewportRef.current.scrollTop = Math.max(0, newScrollY);
        }
      });
    },
    [scale]
  );

  // Store applyZoom in a ref for the native touch listeners to access latest version
  const applyZoomRef = useRef(applyZoom);
  useEffect(() => {
    applyZoomRef.current = applyZoom;
  }, [applyZoom]);

  const stateRef = useRef({ scale, isImage, isImgDragging, imgPosition, imgDragStart });
  useEffect(() => {
    stateRef.current = { scale, isImage, isImgDragging, imgPosition, imgDragStart };
  }, [scale, isImage, isImgDragging, imgPosition, imgDragStart]);

  // 6. Keyboard & Mouse Wheel Zoom Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          applyZoomRef.current(stateRef.current.scale + 0.25);
        } else if (e.key === "-") {
          e.preventDefault();
          applyZoomRef.current(stateRef.current.scale - 0.25);
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
        const rect = scrollViewportRef.current?.getBoundingClientRect();
        const focal = rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : undefined;
        applyZoomRef.current(stateRef.current.scale + delta, focal);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (viewport) {
        viewport.removeEventListener("wheel", handleWheel);
      }
    };
  }, []); // Run once, relies on refs

  // 7. Reset View Handler
  const resetView = () => {
    setScale(1.0);
    setRotation(0);
    setFitMode("width");
    setImgPosition({ x: 0, y: 0 });
    
    // Reset widths
    pageContainerRefs.current.forEach((container, i) => {
      const base = pageBaseDimensionsRef.current[i];
      if (container && base) {
        container.style.width = `${Math.floor(base.width)}px`;
        container.style.height = `${Math.floor(base.height)}px`;
      }
    });

    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  // 8. STRICT Native Touch Handlers (Fixes Mobile Whole-Page Zoom!)
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartDistRef.current = dist;
        touchStartScaleRef.current = stateRef.current.scale;

        const rect = scrollViewportRef.current?.getBoundingClientRect();
        if (rect) {
          touchFocalPointRef.current = {
            x: (t1.clientX + t2.clientX) / 2 - rect.left,
            y: (t1.clientY + t2.clientY) / 2 - rect.top,
          };
        }
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const touch = e.touches[0];

        // Double-Tap to Zoom to Point
        if (now - lastTapRef.current < 300) {
          e.preventDefault(); // Stop native double-tap zoom
          const rect = scrollViewportRef.current?.getBoundingClientRect();
          const focal = rect
            ? { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
            : undefined;

          if (stateRef.current.scale > 1.2) {
            applyZoomRef.current(1.0, focal);
          } else {
            applyZoomRef.current(2.0, focal);
          }
        }
        lastTapRef.current = now;

        // Image dragging initialization
        const state = stateRef.current;
        if (state.isImage && state.scale > 1.0) {
          setIsImgDragging(true);
          setImgDragStart({
            x: touch.clientX - state.imgPosition.x,
            y: touch.clientY - state.imgPosition.y,
          });
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDistRef.current !== null) {
        // CRITICAL: Prevent default to stop browser from zooming the entire page natively!
        e.preventDefault(); 
        
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const ratio = dist / touchStartDistRef.current;
        const targetScale = touchStartScaleRef.current * ratio;

        applyZoomRef.current(targetScale, touchFocalPointRef.current || undefined);
      } else if (e.touches.length === 1 && stateRef.current.isImgDragging && stateRef.current.isImage) {
        e.preventDefault(); // Stop page scrolling when dragging image
        const touch = e.touches[0];
        setImgPosition({
          x: touch.clientX - stateRef.current.imgDragStart.x,
          y: touch.clientY - stateRef.current.imgDragStart.y,
        });
      }
    };

    const onTouchEnd = () => {
      touchStartDistRef.current = null;
      touchFocalPointRef.current = null;
      setIsImgDragging(false);
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd);

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // Run once, relies on refs

  // 9. Image Viewer Mouse Dragging
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1.0 || !isImage) return;
    setIsImgDragging(true);
    setImgDragStart({
      x: e.clientX - imgPosition.x,
      y: e.clientY - imgPosition.y,
    });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isImgDragging || !isImage) return;
    setImgPosition({
      x: e.clientX - imgDragStart.x,
      y: e.clientY - imgDragStart.y,
    });
  };

  const handleImageMouseUp = () => setIsImgDragging(false);

  // 10. Toggle Fullscreen
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

  // Zoom presets
  const zoomPresets = [
    { label: "Fit to Width", value: "width" },
    { label: "Fit to Page", value: "page" },
    { label: "50%", scale: 0.5 },
    { label: "75%", scale: 0.75 },
    { label: "100%", scale: 1.0 },
    { label: "125%", scale: 1.25 },
    { label: "150%", scale: 1.5 },
    { label: "200%", scale: 2.0 },
    { label: "300%", scale: 3.0 },
  ];

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden select-none touch-none"
    >
      {/* Top Header Controls Bar */}
      <div className="h-14 border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 shadow-sm gap-2">
        {/* Left Title & Back */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          <h1 className="text-sm font-semibold truncate max-w-[140px] sm:max-w-[260px] md:max-w-md">
            {title}
          </h1>
        </div>

        {/* Center Toolbar: Zoom, Scale Preset Dropdown, Dual Rotation, Reset */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Out */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => applyZoom(scale - 0.25)}
            disabled={scale <= 0.5}
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          {/* Scale Preset Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 font-mono text-xs font-medium rounded-lg min-w-[4rem] flex items-center justify-between gap-1"
              >
                <span>{Math.round(scale * 100)}%</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-36">
              {zoomPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.label}
                  onClick={() => {
                    if (preset.value === "width") {
                      setFitMode("width");
                      setScale(1.0);
                    } else if (preset.value === "page") {
                      setFitMode("page");
                      setScale(1.0);
                    } else if (preset.scale) {
                      setFitMode("custom");
                      applyZoom(preset.scale);
                    }
                  }}
                  className="flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>{preset.label}</span>
                  {((fitMode === preset.value) || (fitMode === "custom" && preset.scale === scale)) && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom In */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => applyZoom(scale + 0.25)}
            disabled={scale >= 3.0}
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-0.5 sm:mx-1" />

          {/* Rotate Anti-Clockwise (-90°) */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg hidden xs:inline-flex"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            title="Rotate Left (-90°)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          {/* Rotate Clockwise (+90°) */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate Right (+90°)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          {/* Reset View Button */}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-xs font-medium gap-1.5 hidden md:inline-flex"
            onClick={resetView}
            title="Reset Zoom & Alignment"
          >
            <ResetIcon className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>

        {/* Right Actions: Download & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {blobUrl && (
            <a
              href={blobUrl}
              download={`${title.replace(/[^a-zA-Z0-9]/g, "_")}.${isImage ? "png" : "pdf"}`}
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
              Rendering document in high resolution...
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
            ref={scrollViewportRef}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-xl transition-transform duration-100 ease-out"
              style={{
                transform: `translate(${imgPosition.x}px, ${imgPosition.y}px) scale(${scale}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        ) : (
          /* Continuous Native Scroll Multi-Page PDF Canvas Area (Natural 2D Scrolling Without Edge Clipping) */
          <div
            ref={scrollViewportRef}
            className="w-full h-full overflow-auto p-4 sm:p-8 flex flex-col items-center gap-8 scroll-smooth"
          >
            <div className="flex flex-col items-center gap-8 min-w-full pb-20">
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  data-page-number={index + 1}
                  ref={(el) => {
                    pageContainerRefs.current[index] = el;
                  }}
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-border/80 bg-card flex items-center justify-center"
                >
                  <canvas
                    ref={(el) => {
                      pageCanvasRefs.current[index] = el;
                    }}
                    className="block w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Bottom Page Indicator Bar for PDF */}
        {!loading && !error && !isImage && numPages > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-border/80 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-3 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted"
              onClick={() => scrollToPage(activePage - 1)}
              disabled={activePage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs font-semibold font-mono px-1">
              Page {activePage} of {numPages}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted"
              onClick={() => scrollToPage(activePage + 1)}
              disabled={activePage >= numPages}
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
