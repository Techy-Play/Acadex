"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AdminDocumentLightbox } from "@/components/admin-document-lightbox";
import { getResourceAction } from "@/lib/resource-resolver";

export interface LightboxDocument {
  url: string;
  title?: string;
  mimeType?: string;
}

interface AdminLightboxContextType {
  openLightbox: (docOrUrl: LightboxDocument | string, title?: string, mimeType?: string) => void;
  closeLightbox: () => void;
  isOpen: boolean;
  activeDoc: LightboxDocument | null;
}

const AdminLightboxContext = createContext<AdminLightboxContextType | undefined>(undefined);

export function AdminLightboxProvider({ children }: { children: React.ReactNode }) {
  const [activeDoc, setActiveDoc] = useState<LightboxDocument | null>(null);

  const openLightbox = useCallback(
    (docOrUrl: LightboxDocument | string, title?: string, mimeType?: string) => {
      const url = (typeof docOrUrl === "string" ? docOrUrl.trim() : docOrUrl?.url?.trim()) || "";
      const docTitle = (typeof docOrUrl === "string" ? title : docOrUrl?.title || title) || "Document";
      const docMime = typeof docOrUrl === "string" ? mimeType : docOrUrl?.mimeType || mimeType;

      if (!url) return;

      const action = getResourceAction(url, docTitle, docMime);

      // External link (e.g. Canva, Figma, Notion, external website not on Drive): open directly in browser
      if (action.actionKind === "open_link") {
        if (typeof window !== "undefined") {
          window.open(action.targetUrl || url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // Non-PDF file that cannot be opened with Adobe API (DOCX, PPTX, XLSX, ZIP, EXE, etc.): trigger download
      if (action.actionKind === "download_file") {
        if (typeof window !== "undefined") {
          const downloadUrl = action.downloadUrl || url;
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.download = "";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }

      // PDF and Image resources: open in Admin Lightbox
      setActiveDoc({
        url,
        title: docTitle,
        mimeType: docMime,
      });
    },
    []
  );

  const closeLightbox = useCallback(() => {
    setActiveDoc(null);
  }, []);

  return (
    <AdminLightboxContext.Provider
      value={{
        openLightbox,
        closeLightbox,
        isOpen: Boolean(activeDoc),
        activeDoc,
      }}
    >
      {children}
      {activeDoc && (
        <AdminDocumentLightbox
          url={activeDoc.url}
          title={activeDoc.title}
          mimeType={activeDoc.mimeType}
          onClose={closeLightbox}
        />
      )}
    </AdminLightboxContext.Provider>
  );
}

export function useAdminLightbox() {
  const context = useContext(AdminLightboxContext);
  if (!context) {
    throw new Error("useAdminLightbox must be used within an AdminLightboxProvider");
  }
  return context;
}
