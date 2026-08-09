/**
 * @component FileUploadInput
 * @description Drag-and-drop / file selector component. Supports instant upload
 * or staged deferred upload (stores file locally until user clicks submit).
 * Includes manual URL input toggle.
 */
"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Upload, CheckCircle2, Link2, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  onFileStaged?: (file: File | null) => void;
  stagedFile?: File | null;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string; // "Notes", "Assignments", "Practicals", "Library", etc.
  label?: string;
}

export function FileUploadInput({
  value,
  onChange,
  onFileStaged,
  stagedFile = null,
  streamName = "General",
  semester = "General",
  subjectName = "General",
  resourceType = "Notes",
  label = "PDF Document / File",
}: FileUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = async (file: File) => {
    setUploadError(null);

    // If onFileStaged callback is provided, stage the file locally (deferred upload)
    if (onFileStaged) {
      onFileStaged(file);
      return;
    }

    // Direct immediate upload fallback
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("streamName", streamName);
      formData.append("semester", String(semester));
      formData.append("subjectName", subjectName);
      formData.append("resourceType", resourceType);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file.");
      }

      onChange(data.fileUrl);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleSelectFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleSelectFile(file);
    }
  };

  const handleClear = () => {
    onChange("");
    if (onFileStaged) {
      onFileStaged(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const activeFileName = stagedFile ? stagedFile.name : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">{label}</label>
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Link2 className="h-3 w-3" />
          {showManualUrl ? "Upload File from Device" : "Paste custom URL manually"}
        </button>
      </div>

      {showManualUrl ? (
        <Input
          type="url"
          placeholder="https://drive.google.com/file/d/..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (onFileStaged) onFileStaged(null);
          }}
          className="rounded-xl"
        />
      ) : activeFileName ? (
        <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-mono font-medium truncate max-w-[280px]">
                {activeFileName}
              </span>
              {stagedFile && (
                <span className="text-[10px] text-emerald-600 font-medium">
                  Selected (ready to save on submission) — {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors duration-150 ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:bg-muted/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx"
          />

          {uploading ? (
            <div className="flex flex-col items-center py-2 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                Processing file...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1 gap-1.5">
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs font-medium">
                Click to upload PDF or drag & drop here
              </p>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-destructive mt-1 font-medium">{uploadError}</p>
      )}
    </div>
  );
}
