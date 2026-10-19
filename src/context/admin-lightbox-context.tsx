"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AdminDocumentLightbox } from "@/components/admin-document-lightbox";

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
      if (typeof docOrUrl === "string") {
        if (!docOrUrl.trim()) return;
        setActiveDoc({
          url: docOrUrl.trim(),
          title: title || "Document",
          mimeType,
        });
      } else if (docOrUrl && docOrUrl.url) {
        setActiveDoc({
          url: docOrUrl.url,
          title: docOrUrl.title || title || "Document",
          mimeType: docOrUrl.mimeType || mimeType,
        });
      }
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
