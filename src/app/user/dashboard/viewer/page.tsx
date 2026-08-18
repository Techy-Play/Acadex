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

  // Base dimensions tracker for instant CSS scaling
  const baseDimensionsRef = useRef<Record<number, { width: number; height: number }>>({});

  // Touch gesture tracking
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);
  const touchFocalPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  // State refs for native event listeners
  const scaleRef = useRef(scale);
  const isImageRef = useRef(isImage);
  const imgPositionRef = useRef(imgPosition);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    isImageRef.current = isImage;
  }, [isImage]);

  useEffect(() => {
    imgPositionRef.current = imgPosition;
  }, [imgPosition]);

  const proxyUrl = useMemo(
    () => `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`,
    [fileUrl]
  );

  // Cleanup PDF document to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy().catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    };
  }, [pdfDoc]);

  // 1. Fetch PDF binary stream into Blob URL
  useEffect(() => {
    if (!fileUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const isImg = /\.(png|jpe?g|webp|svg|gif|bmp)(\?.*)?$/i.test(fileUrl) || /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(title);
    setIsImage(isImg);

    const isUnsupported = /\.(docx?|xlsx?|pptx?|csv|txt|zip|rar|7z|tar|gz)(\?.*)?$/i.test(fileUrl) || /\.(docx?|xlsx?|pptx?|csv|txt|zip|rar|7z|tar|gz)$/i.test(title);

    if (isUnsupported) {
      setError("Preview not available for this file type. Please download the file to view it.");
      setLoading(false);
      return;
    }

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load document.`);
        return res;
      })
      .then(async (res) => {
        let contentType = res.headers.get("content-type") || "";
        let isActuallyImg = isImg || contentType.startsWith("image/");
        
        let blob = await res.blob();
        
        if (blob.size >= 4) {
          const slice = blob.slice(0, 12);
          const buf = await slice.arrayBuffer();
          const view = new DataView(buf);
          const magic = view.getUint32(0, false);
          
          let detectedType = "";

          // PDF: %PDF
          if (magic === 0x25504446) {
            detectedType = "application/pdf";
          }
          // PNG: \x89PNG
          else if (magic === 0x89504E47) {
            detectedType = "image/png";
          }
          // JPEG: FF D8 FF ...
          else if ((magic & 0xFFFFFF00) === 0xFFD8FF00 || (magic & 0xFFFF0000) === 0xFFD80000) {
            detectedType = "image/jpeg";
          }
          // GIF: GIF8
          else if (magic === 0x47494638) {
            detectedType = "image/gif";
          }
          // WebP: RIFF ... WEBP
          else if (magic === 0x52494646 && view.getUint32(8, false) === 0x57454250) {
            detectedType = "image/webp";
          }
          // BMP: BM
          else if ((magic & 0xFFFF0000) === 0x424D0000) {
            detectedType = "image/bmp";
          }

          if (detectedType === "application/pdf") {
            isActuallyImg = false;
            contentType = "application/pdf";
          } else if (detectedType.startsWith("image/")) {
            isActuallyImg = true;
            contentType = detectedType;
          } else if (!isActuallyImg) {
            // Fallback: If not PDF and not a known image, but extension says image, try to force it.
            // Or if we know it's not a PDF, we try to load it as image anyway.
            // Wait, we can check if it has '%PDF' anywhere in the first 12 bytes just in case.
            const text = new TextDecoder().decode(buf);
            if (text.includes("%PDF")) {
              isActuallyImg = false;
              contentType = "application/pdf";
            } else {
              isActuallyImg = true;
            }
          }
        }
        
        // Recreate the blob with the corrected MIME type if needed
        if (contentType && blob.type !== contentType) {
          blob = new Blob([blob], { type: contentType || (isActuallyImg ? "image/jpeg" : "application/pdf") });
        } else if (!blob.type) {
          blob = new Blob([blob], { type: isActuallyImg ? "image/jpeg" : "application/pdf" });
        }
        
        if (isMounted && isActuallyImg !== isImg) {
          setIsImage(isActuallyImg);
        }

        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);

        if (!isActuallyImg) {
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
                
                // Pre-calculate base dimensions for first page immediately to prevent collapse
                const page1 = await doc.getPage(1);
                const unscaled = page1.getViewport({ scale: 1.0, rotation: 0 });
                for (let i = 1; i <= doc.numPages; i++) {
                  baseDimensionsRef.current[i] = { width: unscaled.width, height: unscaled.height };
                }
                
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

  // 2. High-DPI Crisp Multi-Page Canvas Rendering (Silent Background)
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

        const baseFitWidthScale = availableWidth / unscaledViewport.width;
        const viewportHeight = scrollViewportRef.current.clientHeight || 700;
        const availableHeight = Math.max(400, viewportHeight - 80);
        const baseFitPageScale = Math.min(baseFitWidthScale, availableHeight / unscaledViewport.height);

        let targetBaseScale = baseFitWidthScale;
        if (fitMode === "page") {
          targetBaseScale = baseFitPageScale;
        }

        const baseWidth = unscaledViewport.width * targetBaseScale;
        const baseHeight = unscaledViewport.height * targetBaseScale;
        baseDimensionsRef.current[pageNum] = { width: baseWidth, height: baseHeight };

        const effectiveScale = targetBaseScale * scaleRef.current;
        const viewport = page.getViewport({ scale: effectiveScale, rotation });

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) continue;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        ctx.save();
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          intent: "display",
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);
        
        // Ensure layout is updated correctly after render finishes
        pageContainer.style.width = `${Math.floor(baseWidth * scaleRef.current)}px`;
        pageContainer.style.height = `${Math.floor(baseHeight * scaleRef.current)}px`;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    }
  }, [pdfDoc, isImage, rotation, fitMode]);

  // Instant 60fps Hardware-Accelerated Scaling (CSS Updates)
  useEffect(() => {
    for (let i = 1; i <= numPages; i++) {
      const container = pageContainerRefs.current[i - 1];
      const baseDim = baseDimensionsRef.current[i];
      if (container && baseDim) {
        container.style.width = `${Math.floor(baseDim.width * scale)}px`;
        container.style.height = `${Math.floor(baseDim.height * scale)}px`;
      }
    }
  }, [scale, numPages]);

  // Debounce silent re-render when zoom settles
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

  // Accurate Page Tracking using IntersectionObserver
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

  // Scroll to specific page number
  const scrollToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(numPages, targetPage));
    const targetElement = pageContainerRefs.current[safePage - 1];
    if (targetElement && scrollViewportRef.current) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(safePage);
    }
  };

  // Clamps panning for image viewer to avoid infinite drag
  const clampImagePosition = useCallback((x: number, y: number, currentScale: number) => {
    if (currentScale <= 1.0) return { x: 0, y: 0 };
    const container = containerRef.current;
    if (!container) return { x, y };
    
    // Approximate boundaries based on viewport expansion
    const maxPanX = Math.max(0, (container.clientWidth * (currentScale - 1)) / 1.5);
    const maxPanY = Math.max(0, (container.clientHeight * (currentScale - 1)) / 1.5);
    
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  // Focal-Point Zoom Change Helper
  const applyZoom = useCallback(
    (newScale: number, focalPoint?: { x: number; y: number }) => {
      const currentScale = scaleRef.current;
      const clampedScale = Math.max(0.5, Math.min(4.0, Number(newScale.toFixed(2))));
      if (clampedScale === currentScale) return;

      if (!focalPoint) {
        setScale(clampedScale);
        setFitMode("custom");
        return;
      }

      const scaleRatio = clampedScale / currentScale;

      if (isImageRef.current) {
        const tx = imgPositionRef.current.x;
        const ty = imgPositionRef.current.y;
        const container = containerRef.current;
        
        if (container) {
          const rect = container.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          
          const newTx = tx - (focalPoint.x - cx) * (scaleRatio - 1);
          const newTy = ty - (focalPoint.y - cy) * (scaleRatio - 1);
          
          setImgPosition(clampImagePosition(newTx, newTy, clampedScale));
        }
        
        setScale(clampedScale);
        setFitMode("custom");
      } else {
        const viewport = scrollViewportRef.current;
        if (!viewport) {
          setScale(clampedScale);
          setFitMode("custom");
          return;
        }

        const prevScrollX = viewport.scrollLeft;
        const prevScrollY = viewport.scrollTop;

        const focalX = focalPoint.x + prevScrollX;
        const focalY = focalPoint.y + prevScrollY;

        const newScrollX = focalX * scaleRatio - focalPoint.x;
        const newScrollY = focalY * scaleRatio - focalPoint.y;

        setScale(clampedScale);
        setFitMode("custom");

        requestAnimationFrame(() => {
          if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollLeft = Math.max(0, newScrollX);
            scrollViewportRef.current.scrollTop = Math.max(0, newScrollY);
          }
        });
      }
    },
    [clampImagePosition]
  );

  // Keyboard, Mouse Wheel, & Touch Event Controls (Global to container)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isImgDraggingNative = false;
    let imgDragStartNative = { x: 0, y: 0 };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          applyZoom(scaleRef.current + 0.25);
        } else if (e.key === "-") {
          e.preventDefault();
          applyZoom(scaleRef.current - 0.25);
        } else if (e.key === "0") {
          e.preventDefault();
          resetView();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Use a proportional scale factor for smooth touchpad pinch
        const zoomFactor = Math.pow(0.99, e.deltaY);
        const rect = container.getBoundingClientRect();
        const focal = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        applyZoom(scaleRef.current * zoomFactor, focal);
      }
    };

    const handleTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Block native page zoom
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartDistRef.current = dist;
        touchStartScaleRef.current = scaleRef.current;

        const rect = container.getBoundingClientRect();
        touchFocalPointRef.current = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const touch = e.touches[0];

        if (now - lastTapRef.current < 300) {
          e.preventDefault(); // Block native double-tap zoom
          const rect = container.getBoundingClientRect();
          const focal = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

          if (scaleRef.current > 1.2) {
            applyZoom(1.0, focal);
          } else {
            applyZoom(2.0, focal);
          }
        }
        lastTapRef.current = now;

        if (isImageRef.current && scaleRef.current > 1.0) {
          isImgDraggingNative = true;
          imgDragStartNative = {
            x: touch.clientX - imgPositionRef.current.x,
            y: touch.clientY - imgPositionRef.current.y,
          };
        }
      }
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDistRef.current !== null) {
        e.preventDefault(); // Block native page zoom
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const ratio = dist / touchStartDistRef.current;
        const targetScale = touchStartScaleRef.current * ratio;

        const rect = container.getBoundingClientRect();
        const currentFocal = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        applyZoom(targetScale, currentFocal);

        // Update focal point to allow panning while pinching
        if (isImageRef.current && touchFocalPointRef.current) {
          const dx = currentFocal.x - touchFocalPointRef.current.x;
          const dy = currentFocal.y - touchFocalPointRef.current.y;
          setImgPosition((prev) => clampImagePosition(prev.x + dx, prev.y + dy, scaleRef.current));
        }
        touchFocalPointRef.current = currentFocal;
      } else if (e.touches.length === 1 && isImgDraggingNative && isImageRef.current) {
        e.preventDefault(); // Prevent scrolling while panning image
        const touch = e.touches[0];
        const targetX = touch.clientX - imgDragStartNative.x;
        const targetY = touch.clientY - imgDragStartNative.y;
        setImgPosition(clampImagePosition(targetX, targetY, scaleRef.current));
      }
    };

    const handleTouchEndNative = () => {
      touchStartDistRef.current = null;
      touchFocalPointRef.current = null;
      isImgDraggingNative = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStartNative, { passive: false });
    container.addEventListener("touchmove", handleTouchMoveNative, { passive: false });
    container.addEventListener("touchend", handleTouchEndNative);
    container.addEventListener("touchcancel", handleTouchEndNative);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStartNative);
      container.removeEventListener("touchmove", handleTouchMoveNative);
      container.removeEventListener("touchend", handleTouchEndNative);
      container.removeEventListener("touchcancel", handleTouchEndNative);
    };
  }, [applyZoom, clampImagePosition]);

  // Reset View Handler
  const resetView = () => {
    setScale(1.0);
    setRotation(0);
    setFitMode("width");
    setImgPosition({ x: 0, y: 0 });
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  // Image Viewer Mouse Dragging (Bound to Window)
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (scaleRef.current <= 1.0 || !isImageRef.current) return;
    e.preventDefault(); // Prevent native image dragging
    setIsImgDragging(true);
    const startX = e.clientX - imgPositionRef.current.x;
    const startY = e.clientY - imgPositionRef.current.y;
    setImgDragStart({ x: startX, y: startY });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const targetX = moveEvent.clientX - startX;
      const targetY = moveEvent.clientY - startY;
      setImgPosition(clampImagePosition(targetX, targetY, scaleRef.current));
    };

    const handleMouseUp = () => {
      setIsImgDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
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
      className="flex flex-col h-[calc(100vh-4rem)] w-full bg-background text-foreground overflow-hidden select-none"
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
                      setScale(preset.scale);
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
            disabled={scale >= 4.0}
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
          {(blobUrl || fileUrl) && (
            <a
              href={blobUrl || fileUrl}
              download={title}
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
            <h3 className="font-semibold text-lg">{error.includes("Preview not available") ? "Preview Not Supported" : "Unable to Display Document"}</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
            <a href={blobUrl || fileUrl} download={title} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-xl mt-2">
                <Download className="mr-2 h-4 w-4" /> Download File
              </Button>
            </a>
          </div>
        ) : isImage && blobUrl ? (
          /* Direct Image Viewer with HD Scaling & Bounded Pan */
          <div
            onMouseDown={handleImageMouseDown}
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-none p-4"
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
          /* Continuous Native Scroll Multi-Page PDF Canvas Area */
          <div
            ref={scrollViewportRef}
            className="w-full h-full overflow-auto p-4 sm:p-8 flex flex-col items-center gap-8 scroll-smooth"
            style={{ touchAction: "pan-x pan-y" }}
          >
            <div className="flex flex-col items-center gap-8 min-w-full pb-20">
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  data-page-number={index + 1}
                  ref={(el) => {
                    pageContainerRefs.current[index] = el;
                  }}
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-border/80 bg-card flex items-center justify-center min-h-[40vh]"
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
