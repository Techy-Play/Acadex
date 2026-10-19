"use client";

import React from "react";
import { AdobePdfViewer } from "@/components/adobe-pdf-viewer";

export interface AdobeViewerProps {
  file: File;
  clientId: string;
  embedMode?: "FULL_WINDOW" | "SIZED_CONTAINER";
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function AdobeViewer({
  file,
  clientId,
  embedMode = "FULL_WINDOW",
  onError,
  onSuccess,
}: AdobeViewerProps) {
  return (
    <AdobePdfViewer
      src={file}
      title={file.name}
      clientId={clientId}
      embedMode={embedMode}
      onError={onError}
      onSuccess={onSuccess}
      className="w-full h-full"
    />
  );
}

export default AdobeViewer;
