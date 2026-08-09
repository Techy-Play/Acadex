/**
 * @component ImageCropModal
 * @description Sleek, interactive profile image cropper & dropzone uploader.
 * Supports drag-and-drop file selection, 1:1 circular/square mask overlays,
 * rotation, zoom slider, touch/mouse panning, and crisp canvas export up to 2048px.
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
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [maskType, setMaskType] = useState<"circle" | "square">("circle");
  const [isDragOver, setIsDragOver] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setScale(1.0);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

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

  // ── Pan Handlers ──
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
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
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // ── Export Canvas Crop ──
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

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportDimension, exportDimension);

      const exportRatio = exportDimension / cropViewportSize;
      const halfExport = exportDimension / 2;

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

  return (
    <Dialog open={open} onOpenChange={(val) => !saving && !val && onClose()}>
      <DialogContent className="rounded-2xl max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Crop Profile Picture
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Drag to position, scale, or rotate your photo for the perfect fit (Max 10 MB).
          </DialogDescription>
        </DialogHeader>

        {imageSrc ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Crop Viewport with Interactive Mask Overlay */}
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
                className="max-w-none pointer-events-none select-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                }}
              />

              {/* Crop Mask Overlay (Circular or Square Cutout) */}
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className={`absolute inset-0 border-[32px] border-black/60 backdrop-blur-[1px] transition-all ${
                    maskType === "circle" ? "rounded-full ring-2 ring-white/40" : "rounded-xl ring-2 ring-white/40"
                  }`}
                />
              </div>
            </div>

            {/* Toolbar & Controls */}
            <div className="flex flex-col items-center gap-3 w-full bg-muted/40 p-3 rounded-xl border border-border/50">
              {/* Zoom Controls */}
              <div className="flex items-center gap-3 w-full justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
                  disabled={saving}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-36 accent-primary cursor-pointer"
                  disabled={saving}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setScale((s) => Math.min(3.5, s + 0.15))}
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

                {/* Reset */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => {
                    setScale(1.0);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  disabled={saving}
                  title="Reset Controls"
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
