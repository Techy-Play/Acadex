"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface PdfUploadDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  onOpenViewer: () => void;
  disabled?: boolean;
}

export function PdfUploadDropzone({
  onFileSelected,
  selectedFile,
  onClearFile,
  onOpenViewer,
  disabled = false,
}: PdfUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const validateAndSelect = useCallback(
    (file: File) => {
      setValidationError(null);

      // Validate PDF MIME or file extension
      const isPdfMime = file.type === "application/pdf";
      const isPdfExt = file.name.toLowerCase().endsWith(".pdf");

      if (!isPdfMime && !isPdfExt) {
        setValidationError(
          `Invalid file format: "${file.name}". Please select a valid document with a .pdf extension.`
        );
        return;
      }

      // Max size check (100 MB safety limit)
      const maxBytes = 100 * 1024 * 1024;
      if (file.size > maxBytes) {
        setValidationError(
          `The selected file (${formatFileSize(file.size)}) exceeds the maximum limit of 100 MB.`
        );
        return;
      }

      if (file.size === 0) {
        setValidationError(`The selected file is empty (0 Bytes).`);
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-3 sm:gap-4 px-1 sm:px-0">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-5 min-[400px]:p-6 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none text-center ${
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/40 bg-card/60"
        } ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <div className="p-3 min-[400px]:p-3.5 sm:p-4 rounded-2xl bg-primary/10 text-primary mb-2.5 sm:mb-4 shadow-xs">
          <UploadCloud className="h-6 w-6 min-[400px]:h-7 min-[400px]:w-7 sm:h-8 sm:w-8" />
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-foreground">
          {isDragOver ? "Drop your PDF file here" : "Choose a local PDF document"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm px-1">
          Drag and drop a PDF file here, or click to browse from your computer.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[10px] sm:text-[11px] font-mono text-muted-foreground bg-muted/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border/60 max-w-full">
          <span>Supported format: .pdf</span>
          <span>•</span>
          <span>Max size: 100 MB</span>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Invalid File</p>
            <p className="mt-0.5 opacity-90 break-words">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="p-1 rounded-md hover:bg-destructive/20 text-destructive/80 transition-colors shrink-0"
            title="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Selected File Card & Launch Action */}
      {selectedFile && !validationError && (
        <div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <FileCheck2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold truncate text-foreground" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>Local Document</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onClearFile();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              title="Remove selected file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto h-9 sm:h-8 rounded-xl text-xs"
            >
              Choose Different File
            </Button>

            <Button
              size="sm"
              onClick={onOpenViewer}
              className="w-full sm:w-auto h-9 sm:h-8 rounded-xl text-xs gap-1.5 shadow-sm font-semibold justify-center"
            >
              <span>Open in Adobe Reader</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Privacy Guarantee Note */}
      <div className="flex items-start sm:items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-muted/40 border border-border/60 text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
        <span>
          <strong className="font-semibold text-foreground">Local Privacy Guaranteed:</strong> Your document is read in-memory via browser ArrayBuffer and rendered directly into the Adobe client SDK. No files are uploaded to Acadex servers, Google Drive, or external storage.
        </span>
      </div>
    </div>
  );
}
