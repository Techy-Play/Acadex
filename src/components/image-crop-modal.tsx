/**
 * @component ImageCropModal
 * @description Interactive 1:1 square image cropper and preview modal for user avatars.
 * Allows users to zoom, drag/pan, and export a cropped 512x512 square profile picture.
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
      // Create a 512x512 square canvas
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context.");

      const img = imgRef.current;
      const cropSize = 256; // Viewport crop size in px

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);

      // Compute scale ratio between crop viewport and exported 512x512 canvas
      const exportRatio = 512 / cropSize;

      ctx.save();
      // Center origin
      ctx.translate(256, 256);
      ctx.translate(position.x * exportRatio, position.y * exportRatio);
      ctx.scale(scale * exportRatio, scale * exportRatio);

      // Draw image centered
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            await onCropSave(blob);
            onClose();
          } else {
            throw new Error("Failed to generate cropped image blob.");
          }
          setSaving(false);
        },
        "image/png",
        0.95
      );
    } catch (err) {
      console.error("Image crop error:", err);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !saving && !val && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
          <DialogDescription>
            Drag and zoom to position your avatar inside the square frame.
          </DialogDescription>
        </DialogHeader>

        {imageSrc && (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Square 1:1 Crop Viewport */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary/30 bg-black/80 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none shadow-inner"
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
