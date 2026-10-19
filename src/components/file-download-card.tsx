"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  FileCode,
  File as FileIcon,
} from "lucide-react";

export interface FileDownloadCardProps {
  title: string;
  downloadUrl?: string;
  directOpenUrl?: string;
  fileExtension?: string;
  mimeType?: string;
  className?: string;
}

export function FileDownloadCard({
  title,
  downloadUrl,
  directOpenUrl,
  fileExtension = "",
  className = "",
}: FileDownloadCardProps) {
  const ext = fileExtension.toLowerCase().replace(/^\./, "");

  // Determine appropriate icon, color, and description based on file format
  const getFormatDetails = () => {
    switch (ext) {
      case "doc":
      case "docx":
        return {
          icon: FileText,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          label: "Microsoft Word Document",
        };
      case "xls":
      case "xlsx":
      case "csv":
        return {
          icon: FileSpreadsheet,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          label: ext === "csv" ? "CSV Spreadsheet" : "Microsoft Excel Spreadsheet",
        };
      case "ppt":
      case "pptx":
        return {
          icon: Presentation,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          label: "PowerPoint Presentation",
        };
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
        return {
          icon: Archive,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/20",
          label: "Compressed Archive",
        };
      case "js":
      case "ts":
      case "jsx":
      case "tsx":
      case "py":
      case "java":
      case "cpp":
      case "c":
      case "html":
      case "css":
      case "json":
        return {
          icon: FileCode,
          color: "text-indigo-500",
          bgColor: "bg-indigo-500/10",
          borderColor: "border-indigo-500/20",
          label: "Source Code / Text",
        };
      default:
        return {
          icon: FileIcon,
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          label: ext ? `${ext.toUpperCase()} Document` : "File Document",
        };
    }
  };

  const format = getFormatDetails();
  const IconComponent = format.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-4 sm:p-6 h-full w-full bg-muted/20 ${className}`}>
      <div className="flex flex-col items-center max-w-md w-full bg-card rounded-2xl border border-border shadow-md p-6 text-center gap-4 animate-in fade-in">
        {/* Format Icon */}
        <div className={`p-4 rounded-2xl ${format.bgColor} ${format.color} shadow-xs`}>
          <IconComponent className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>

        {/* File Information */}
        <div className="min-w-0 w-full">
          <h2 className="text-base font-semibold text-foreground truncate px-2" title={title}>
            {title}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={`text-[11px] font-mono tracking-tight font-medium ${format.borderColor} ${format.color}`}
            >
              .{ext || "FILE"}
            </Badge>
            <span className="text-xs text-muted-foreground">{format.label}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
          This file format is available for direct download to view or edit in your local application.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full pt-2">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1"
            >
              <Button size="sm" className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 shadow-xs">
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </Button>
            </a>
          )}

          {directOpenUrl && (
            <a
              href={directOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 rounded-xl text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in Drive</span>
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileDownloadCard;
