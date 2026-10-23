/**
 * @component ResourceActionButton
 * @description Unified, context-aware button for opening or downloading resources.
 * - PDF / Image: shows "Open" button with Eye icon.
 * - Non-PDF files (Word, Excel, PPTX, ZIP, etc.): DOES NOT show Open button; ONLY shows Download/Install button.
 * - External pasted links (e.g. Canva, Notion, external website): shows "Open Link" button.
 */
"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Download, ExternalLink } from "lucide-react";
import { getResourceAction, ResourceActionInfo } from "@/lib/resource-resolver";

export interface ResourceActionButtonProps {
  fileUrl?: string | null;
  title?: string;
  mimeType?: string;
  onOpen?: () => void;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ResourceActionButton({
  fileUrl,
  title = "Document",
  mimeType,
  onOpen,
  size = "sm",
  variant = "outline",
  className = "",
  onClick,
}: ResourceActionButtonProps) {
  const action: ResourceActionInfo = useMemo(() => {
    return getResourceAction(fileUrl, title, mimeType);
  }, [fileUrl, title, mimeType]);

  if (!fileUrl) return null;

  // 1. External Web Link (Canva, Figma, external site not on Drive)
  if (action.actionKind === "open_link") {
    return (
      <Button
        variant={variant}
        size={size}
        className={`rounded-lg gap-1.5 ${className}`}
        asChild
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(e);
        }}
      >
        <a
          href={action.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open external link in browser: ${title}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open Link</span>
        </a>
      </Button>
    );
  }

  // 2. Non-PDF File (Word, Excel, PPT, ZIP, Installer, etc.)
  // "dont show open buttoin, only show install button"
  if (action.actionKind === "download_file") {
    return (
      <Button
        variant={variant}
        size={size}
        className={`rounded-lg gap-1.5 ${className}`}
        asChild
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(e);
        }}
      >
        <a
          href={action.downloadUrl || fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          title={`${action.buttonLabel} ${action.formatName || "file"}: ${title}`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{action.buttonLabel}</span>
        </a>
      </Button>
    );
  }

  // 3. PDF Document or Image -> Show "Open" button
  return (
    <Button
      variant={variant}
      size={size}
      className={`rounded-lg gap-1.5 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
        if (onOpen) onOpen();
      }}
      title={`Open ${action.formatName || "document"}: ${title}`}
    >
      <Eye className="h-3.5 w-3.5" />
      <span>Open</span>
    </Button>
  );
}

export default ResourceActionButton;
