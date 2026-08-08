/**
 * @component FileUploadInput
 * @description Direct file drag-and-drop / selector component that streams PDFs
 * into your 5 TB Google Drive via /api/upload and sets the resulting URL in form inputs.
 * Includes a manual URL input toggle for 100% backward compatibility.
 */
"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Upload, CheckCircle2, Link2, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  streamName?: string;
  semester?: number | string;
  subjectName?: string;
  resourceType?: string; // "Notes", "Assignments", "Practicals", "Library", etc.
  label?: string;
}

export function FileUploadInput({
  value,
  onChange,
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

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);

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
        throw new Error(data.error || "Failed to upload file to Google Drive.");
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
      void handleUploadFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
  };

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
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      ) : value ? (
        <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[280px]">
              {value}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
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
                Uploading to 5 TB Google Drive...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1 gap-1.5">
              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs font-medium">
                Click to upload PDF or drag & drop here
              </p>
              <p className="text-[11px] text-muted-foreground">
                Automatically saved to 5 TB Drive under {streamName} / {subjectName}
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
