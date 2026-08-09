/**
 * @component ImageCropModal
 * @description Advanced, high-DPI profile image cropper with local file dropzone.
 * Features strict boundary clamping to prevent blank space / corners,
 * crystal-clear preview without blur, Rule of Thirds grid, rotation, frame selection,
 * and high-DPI canvas export.
 */
"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Loader2,
  Check,
  UploadCloud,
  Circle,
  Square,
  Sparkles,
  Grid,
} from "lucide-react";
import { toast } from "sonner";

interface ImageCropModalProps {
  imageSrc: string | null;
  open: boolean;
  onClose: () => void;
  onCropSave: (croppedBlob: Blob) => Promise<void>;
  onFileSelect?: (file: File) => void;
}

const VIEWPORT_SIZE = 280; // High-res preview viewport in pixels

export function ImageCropModal({
  imageSrc,
  open,
  onClose,
  onCropSave,
  onFileSelect,
}: ImageCropModalProps) {
  const [scale, setScale] = useState(1.0);
  const [minCoverScale, setMinCoverScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [maskType, setMaskType] = useState<"circle" | "square">("circle");
  const [showGrid, setShowGrid] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate scale required so image completely covers the 280x280 viewport (no blank corners)
  const calculateMinCoverScale = (
    naturalW: number,
    naturalH: number,
    rot: number
  ) => {
    const isRotated = rot === 90 || rot === 270;
    const w = isRotated ? naturalH : naturalW;
    const h = isRotated ? naturalW : naturalH;
    if (!w || !h) return 1.0;
    return Math.max(VIEWPORT_SIZE / w, VIEWPORT_SIZE / h);
  };

  // Strictly clamp position so image edges NEVER move inside the viewport box
  const clampPosition = (
    newX: number,
    newY: number,
    currentScale: number,
    rot: number
  ) => {
    if (!imgRef.current || !imgRef.current.naturalWidth) return { x: newX, y: newY };
    const img = imgRef.current;
    const isRotated = rot === 90 || rot === 270;
    const imgW = (isRotated ? img.naturalHeight : img.naturalWidth) * currentScale;
    const imgH = (isRotated ? img.naturalWidth : img.naturalHeight) * currentScale;

    // Maximum allowed translation from center to keep viewport 100% covered
    const maxTranslateX = Math.max(0, (imgW - VIEWPORT_SIZE) / 2);
    const maxTranslateY = Math.max(0, (imgH - VIEWPORT_SIZE) / 2);

    return {
      x: Math.min(maxTranslateX, Math.max(-maxTranslateX, newX)),
      y: Math.min(maxTranslateY, Math.max(-maxTranslateY, newY)),
    };
  };

  // Reset state on modal open
  useEffect(() => {
    if (open) {
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  // Recalculate cover scale & clamp position on rotation or scale change
  useEffect(() => {
    if (imgRef.current && imgRef.current.naturalWidth) {
      const img = imgRef.current;
      const minScale = calculateMinCoverScale(
        img.naturalWidth,
        img.naturalHeight,
        rotation
      );
      setMinCoverScale(minScale);

      const targetScale = Math.max(minScale, scale);
      if (targetScale !== scale) {
        setScale(targetScale);
      }

      setPosition((prevPos) => clampPosition(prevPos.x, prevPos.y, targetScale, rotation));
    }
  }, [rotation, imageSrc]);

  // Handle initial image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const minScale = calculateMinCoverScale(
      img.naturalWidth,
      img.naturalHeight,
      rotation
    );
    setMinCoverScale(minScale);
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
  };

  // Handle slider or button zoom changes with strict boundary clamping
  const handleScaleChange = (newScale: number) => {
    const clampedScale = Math.max(minCoverScale, Math.min(minCoverScale * 4.0, newScale));
    setScale(clampedScale);
    setPosition((pos) => clampPosition(pos.x, pos.y, clampedScale, rotation));
  };

  // Mouse / Touch Pan Handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setPosition(clampPosition(rawX, rawY, scale, rotation));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isDragging && e.touches.length === 1) {
      const rawX = e.touches[0].clientX - dragStart.x;
      const rawY = e.touches[0].clientY - dragStart.y;
      setPosition(clampPosition(rawX, rawY, scale, rotation));
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Drag & Drop Files into Modal
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndPassFile(file);
    }
  };

  const validateAndPassFile = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid format. Please upload PNG, JPG, WEBP, or GIF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 10 MB.");
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // High-DPI Canvas Export
  const handleSave = async () => {
    if (!imgRef.current) return;
    setSaving(true);

    try {
      const img = imgRef.current;
      const baseDimension = Math.max(img.naturalWidth, img.naturalHeight);
      const exportDimension = Math.min(2048, Math.max(1024, baseDimension));

      const canvas = document.createElement("canvas");
      canvas.width = exportDimension;
      canvas.height = exportDimension;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const exportRatio = exportDimension / VIEWPORT_SIZE;
      const halfExport = exportDimension / 2;

      // Apply Circular / Square Frame Clipping
      if (maskType === "circle") {
        ctx.beginPath();
        ctx.arc(halfExport, halfExport, halfExport, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportDimension, exportDimension);

      ctx.save();
      ctx.translate(halfExport, halfExport);
      ctx.translate(position.x * exportRatio, position.y * exportRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * exportRatio, scale * exportRatio);

      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("Failed to generate cropped image.");
            setSaving(false);
            return;
          }

          if (blob.size > 10 * 1024 * 1024) {
            toast.error("Cropped image exceeds 10 MB limit.");
            setSaving(false);
            return;
          }

          await onCropSave(blob);
          onClose();
          setSaving(false);
        },
        "image/png",
        0.98
      );
    } catch (err) {
      console.error("Image crop error:", err);
      toast.error("Failed to crop image.");
      setSaving(false);
    }
  };

  const maxScale = minCoverScale * 4.0;

  return (
    <Dialog open={open} onOpenChange={(val) => !saving && !val && onClose()}>
      <DialogContent className="rounded-2xl max-w-md p-6 shadow-2xl border border-border">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Crop Profile Picture
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Image fills the aperture completely. Drag, zoom, or rotate for the perfect framing.
          </DialogDescription>
        </DialogHeader>

        {imageSrc ? (
          <div className="flex flex-col items-center gap-4 py-1">
            {/* Viewport Box (280px x 280px) with Sharp Mask Cutout & Alignment Grid */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
              className={`relative rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none border-2 transition-all ${
                isDragOver ? "border-primary ring-4 ring-primary/20 scale-[1.02]" : "border-border/80 shadow-inner"
              }`}
            >
              {/* Crisp Image Element (No backdrop blur overhead) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Avatar preview"
                onLoad={handleImageLoad}
                className="max-w-none pointer-events-none select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  imageRendering: "auto",
                }}
              />

              {/* 3x3 Rule of Thirds Alignment Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-60">
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-white/40" />
                  <div className="border-r border-white/40" />
                  <div />
                </div>
              )}

              {/* Crisp Mask Overlay (No blur to keep image sharp) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div
                  className={`absolute inset-0 transition-all ${
                    maskType === "circle"
                      ? "rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ring-2 ring-white/90"
                      : "rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ring-2 ring-white/90"
                  }`}
                />
              </div>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-col items-center gap-3 w-full bg-muted/40 p-3 rounded-xl border border-border/50">
              {/* Zoom & Rotation Slider */}
              <div className="flex items-center gap-2.5 w-full justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => handleScaleChange(scale - 0.1)}
                  disabled={saving || scale <= minCoverScale}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <input
                  type="range"
                  min={minCoverScale}
                  max={maxScale}
                  step="0.01"
                  value={scale}
                  onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                  className="w-36 accent-primary cursor-pointer"
                  disabled={saving}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => handleScaleChange(scale + 0.1)}
                  disabled={saving || scale >= maxScale}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                {/* Rotate 90deg */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  disabled={saving}
                  title="Rotate 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>

                {/* Grid Toggle */}
                <Button
                  type="button"
                  variant={showGrid ? "secondary" : "outline"}
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setShowGrid((g) => !g)}
                  disabled={saving}
                  title="Toggle 3x3 Alignment Grid"
                >
                  <Grid className="h-4 w-4" />
                </Button>

                {/* Reset */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => {
                    setScale(minCoverScale);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  disabled={saving}
                  title="Reset Alignment"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Frame Style Selector & Image Re-upload */}
              <div className="flex items-center justify-between w-full pt-1.5 border-t border-border/40 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="mr-1 font-medium">Frame:</span>
                  <Button
                    type="button"
                    variant={maskType === "circle" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-md"
                    onClick={() => setMaskType("circle")}
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Circle
                  </Button>
                  <Button
                    type="button"
                    variant={maskType === "square" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-md"
                    onClick={() => setMaskType("square")}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Square
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary hover:text-primary/90"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Dropzone if no image chosen */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="font-semibold text-sm">Click or drag photo here to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PNG, JPG, WEBP, or GIF up to 10 MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndPassFile(e.target.files[0]);
              e.target.value = "";
            }
          }}
          className="hidden"
        />

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving || !imageSrc}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Avatar...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Set Profile Picture
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
