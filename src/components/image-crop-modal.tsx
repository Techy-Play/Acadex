/**
 * @component ImageCropModal
 * @description Interactive 1:1 square image cropper and preview modal for user avatars.
 * Preserves high image quality up to 2048px 1:1 square resolution under 10 MB file size limit.
 */
"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageCropModalProps {
  imageSrc: string | null;
  open: boolean;
  onClose: () => void;
  onCropSave: (croppedBlob: Blob) => Promise<void>;
}

export function ImageCropModal({
  imageSrc,
  open,
  onClose,
  onCropSave,
}: ImageCropModalProps) {
  const [scale, setScale] = useState(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

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

  const handleSave = async () => {
    if (!imgRef.current) return;
    setSaving(true);

    try {
      const img = imgRef.current;
      const cropViewportSize = 256; // Viewport width/height in DOM px

      // Dynamically preserve image resolution up to 2048px square
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
      ctx.scale(scale * exportRatio, scale * exportRatio);

      // Draw image centered in square frame
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("Failed to generate cropped image.");
            setSaving(false);
            return;
          }

          // Strict 10 MB file size limit check
          if (blob.size > 10 * 1024 * 1024) {
            toast.error("Cropped image exceeds 10 MB limit. Please select a smaller photo.");
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
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
          <DialogDescription>
            Position your photo inside the 1:1 square frame (Max 10 MB).
          </DialogDescription>
        </DialogHeader>

        {imageSrc && (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* 1:1 Square Aspect Ratio Crop Viewport */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-64 h-64 rounded-2xl overflow-hidden border-4 border-primary/30 bg-black/80 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none shadow-inner"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Avatar preview"
                className="max-w-none pointer-events-none select-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }}
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 w-full justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                disabled={saving}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
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
                onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
                disabled={saving}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => {
                  setScale(1.0);
                  setPosition({ x: 0, y: 0 });
                }}
                disabled={saving}
                title="Reset Position"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
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
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
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
