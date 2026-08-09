/**
 * @component ImageCropModal
 * @description Advanced, responsive profile image cropper with dropzone uploader.
 * Features auto-contain image scaling, strict position boundary clamping,
 * Rule of Thirds alignment grid toggle, circle/square mask overlays,
 * rotation controls, and high-DPI 2048px canvas export.
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

export function ImageCropModal({
  imageSrc,
  open,
  onClose,
  onCropSave,
  onFileSelect,
}: ImageCropModalProps) {
  const [scale, setScale] = useState(1.0);
  const [initialFitScale, setInitialFitScale] = useState(1.0);
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

  useEffect(() => {
    if (open) {
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  // ── Auto-Scale to Fit Full Image on Load ──
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const viewportSize = 256;
    const isRotated = rotation === 90 || rotation === 270;
    const naturalW = isRotated ? img.naturalHeight : img.naturalWidth;
    const naturalH = isRotated ? img.naturalWidth : img.naturalHeight;

    const fitScale = Math.min(viewportSize / naturalW, viewportSize / naturalH);
    const safeFitScale = Math.max(0.2, fitScale);
    setScale(safeFitScale);
    setInitialFitScale(safeFitScale);
    setPosition({ x: 0, y: 0 });
  };

  // ── Position Boundary Clamping (Prevent image leaving viewer) ──
  const clampPosition = (newX: number, newY: number, currentScale: number) => {
    if (!imgRef.current) return { x: newX, y: newY };
    const viewportSize = 256;
    const img = imgRef.current;
    
    const isRotated = rotation === 90 || rotation === 270;
    const imgW = (isRotated ? img.naturalHeight : img.naturalWidth) * currentScale;
    const imgH = (isRotated ? img.naturalWidth : img.naturalHeight) * currentScale;

    // Allow dragging up to edge + 25% overflow maximum
    const maxTranslateX = Math.max(0, (imgW - viewportSize) / 2) + viewportSize * 0.25;
    const maxTranslateY = Math.max(0, (imgH - viewportSize) / 2) + viewportSize * 0.25;

    return {
      x: Math.min(maxTranslateX, Math.max(-maxTranslateX, newX)),
      y: Math.min(maxTranslateY, Math.max(-maxTranslateY, newY)),
    };
  };

  // ── Drag & Drop File Handlers ──
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
      toast.error("Invalid file format. Please upload PNG, JPG, WEBP, or GIF.");
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

  // ── Mouse & Touch Pan Handlers with Boundary Clamping ──
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setPosition(clampPosition(rawX, rawY, scale));
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
      setPosition(clampPosition(rawX, rawY, scale));
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // ── Canvas Crop Export ──
  const handleSave = async () => {
    if (!imgRef.current) return;
    setSaving(true);

    try {
      const img = imgRef.current;
      const cropViewportSize = 256;

      const baseDimension = Math.max(img.naturalWidth, img.naturalHeight);
      const exportDimension = Math.min(2048, Math.max(512, baseDimension));

      const canvas = document.createElement("canvas");
      canvas.width = exportDimension;
      canvas.height = exportDimension;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context.");

      const exportRatio = exportDimension / cropViewportSize;
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
        0.95
      );
    } catch (err) {
      console.error("Image crop error:", err);
      toast.error("Failed to crop image.");
      setSaving(false);
    }
  };

  const minScale = Math.max(0.1, initialFitScale * 0.5);
  const maxScale = Math.max(3.0, initialFitScale * 4.0);

  return (
    <Dialog open={open} onOpenChange={(val) => !saving && !val && onClose()}>
      <DialogContent className="rounded-2xl max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Crop Profile Picture
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Full image scaled to fit. Drag, zoom, or rotate for the perfect alignment.
          </DialogDescription>
        </DialogHeader>

        {imageSrc ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Viewport with Interactive Mask Overlay & Alignment Grid */}
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
              className={`relative w-64 h-64 rounded-2xl overflow-hidden bg-black/90 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none border-2 transition-all ${
                isDragOver ? "border-primary ring-4 ring-primary/20 scale-[1.02]" : "border-border shadow-md"
              }`}
            >
              {/* Image Transform Target */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Avatar preview"
                onLoad={handleImageLoad}
                className="max-w-none pointer-events-none select-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                }}
              />

              {/* 3x3 Rule of Thirds Alignment Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-70">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>
              )}

              {/* Crop Mask Overlay (Circular or Square Cutout) */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div
                  className={`absolute inset-0 border-[28px] border-black/60 backdrop-blur-[1px] transition-all ${
                    maskType === "circle" ? "rounded-full ring-2 ring-white/50" : "rounded-xl ring-2 ring-white/50"
                  }`}
                />
              </div>
            </div>

            {/* Toolbar & Controls */}
            <div className="flex flex-col items-center gap-3 w-full bg-muted/40 p-3 rounded-xl border border-border/50">
              {/* Zoom & Rotation Controls */}
              <div className="flex items-center gap-2.5 w-full justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setScale((s) => Math.max(minScale, s - 0.1))}
                  disabled={saving}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <input
                  type="range"
                  min={minScale}
                  max={maxScale}
                  step="0.02"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-32 accent-primary cursor-pointer"
                  disabled={saving}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setScale((s) => Math.min(maxScale, s + 0.1))}
                  disabled={saving}
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
                    setScale(initialFitScale);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  disabled={saving}
                  title="Reset Position & Fit Scale"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Mask Type Selector & Re-Upload Trigger */}
              <div className="flex items-center justify-between w-full pt-1 border-t border-border/40 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="mr-1">Frame:</span>
                  <Button
                    type="button"
                    variant={maskType === "circle" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs rounded-md"
                    onClick={() => setMaskType("circle")}
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    Circle
                  </Button>
                  <Button
                    type="button"
                    variant={maskType === "square" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs rounded-md"
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
                  Choose Different
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Dropzone State inside Modal if no image loaded yet */
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
