"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { RefreshCw, AlertCircle, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADOBE_SDK_URL = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
const ADOBE_SDK_SCRIPT_ID = "adobe-dc-view-sdk-script";

// Type definitions for Adobe PDF Embed API
declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: {
        clientId: string;
        divId: string;
        locale?: string;
      }) => {
        previewFile: (
          fileConfig: {
            content: {
              promise: Promise<ArrayBuffer>;
            };
            metaData: {
              fileName: string;
              id?: string;
            };
          },
          viewerConfig?: {
            embedMode?: "FULL_WINDOW" | "SIZED_CONTAINER" | "IN_LINE";
            showAnnotationTools?: boolean;
            showLeftHandPanel?: boolean;
            showDownloadPDF?: boolean;
            showPrintPDF?: boolean;
            showPageControls?: boolean;
            dockPageControls?: boolean;
            defaultViewMode?: "FIT_PAGE" | "FIT_WIDTH";
          }
        ) => Promise<unknown>;
        registerCallback?: (
          type: unknown,
          callback: (event: unknown) => void,
          options?: unknown
        ) => void;
      };
    };
  }
}

interface AdobeViewerProps {
  file: File;
  clientId: string;
  embedMode?: "FULL_WINDOW" | "SIZED_CONTAINER";
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

/**
 * Loads the Adobe View SDK script dynamically and resolves when SDK is ready.
 */
function loadAdobeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If AdobeDC is already loaded on window
    if (typeof window !== "undefined" && window.AdobeDC?.View) {
      resolve();
      return;
    }

    const handleReady = () => {
      resolve();
    };

    document.addEventListener("adobe_dc_view_sdk.ready", handleReady, { once: true });

    // Check if script element already exists
    let script = document.getElementById(ADOBE_SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = ADOBE_SDK_SCRIPT_ID;
      script.src = ADOBE_SDK_URL;
      script.async = true;
      script.onerror = () => {
        document.removeEventListener("adobe_dc_view_sdk.ready", handleReady);
        reject(
          new Error(
            "Failed to load Adobe PDF Embed API SDK from acrobatservices.adobe.com. Check your network or content blocker settings."
          )
        );
      };
      document.body.appendChild(script);
    }

    // Safety timeout in case ready event never fires
    setTimeout(() => {
      if (typeof window !== "undefined" && window.AdobeDC?.View) {
        resolve();
      } else {
        document.removeEventListener("adobe_dc_view_sdk.ready", handleReady);
        reject(
          new Error(
            "Adobe PDF Embed SDK initialization timed out after 15 seconds. Please ensure the domain is registered in the Adobe Developer Console."
          )
        );
      }
    }, 15000);
  });
}

export function AdobeViewer({
  file,
  clientId,
  embedMode = "FULL_WINDOW",
  onError,
  onSuccess,
}: AdobeViewerProps) {
  const rawId = useId();
  // Safe DOM ID without colons
  const containerDivId = `adobe-pdf-container-${rawId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setInitError(null);

    let isCancelled = false;

    async function initViewer() {
      try {
        if (!clientId || !clientId.trim()) {
          throw new Error("Missing Adobe PDF Embed API Client ID.");
        }

        // 1. Ensure SDK script is ready
        await loadAdobeSDK();
        if (isCancelled || !isMountedRef.current) return;

        if (!window.AdobeDC?.View) {
          throw new Error("AdobeDC.View constructor is unavailable after SDK load.");
        }

        // 2. Read file as ArrayBuffer locally in memory (zero network upload)
        const arrayBuffer = await file.arrayBuffer();
        if (isCancelled || !isMountedRef.current) return;

        const targetDiv = document.getElementById(containerDivId);
        if (!targetDiv) {
          throw new Error(`Target container #${containerDivId} was not found in the DOM.`);
        }
        // Clean out any stale child iframe from previous renders
        targetDiv.innerHTML = "";

        // 3. Initialize Adobe View instance
        const adobeDCView = new window.AdobeDC.View({
          clientId: clientId.trim(),
          divId: containerDivId,
        });

        // 4. Preview local file via ArrayBuffer Promise
        const previewPromise = adobeDCView.previewFile(
          {
            content: { promise: Promise.resolve(arrayBuffer) },
            metaData: {
              fileName: file.name,
              id: `${file.name}-${file.size}-${file.lastModified}`,
            },
          },
          {
            embedMode,
            showAnnotationTools: true,
            showLeftHandPanel: true,
            showDownloadPDF: true,
            showPrintPDF: true,
            showPageControls: true,
            dockPageControls: true,
            defaultViewMode: "FIT_PAGE",
          }
        );

        await previewPromise;

        if (isMountedRef.current && !isCancelled) {
          setIsLoading(false);
          if (onSuccess) onSuccess();
        }
      } catch (err: unknown) {
        if (isCancelled || !isMountedRef.current) return;
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to initialize Adobe PDF Embed API viewer.";
        console.error("[AdobeViewer Error]:", err);
        setInitError(errorMsg);
        setIsLoading(false);
        if (onError && err instanceof Error) onError(err);
      }
    }

    initViewer();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      const targetDiv = document.getElementById(containerDivId);
      if (targetDiv) {
        targetDiv.innerHTML = "";
      }
    };
  }, [file, clientId, embedMode, containerDivId, renderNonce, onError, onSuccess]);

  const handleRetry = () => {
    setInitError(null);
    setIsLoading(true);
    setRenderNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-background select-none overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xs text-center p-6">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shadow-xs">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Initializing Adobe PDF Embed API...
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Rendering local document via client ArrayBuffer into Adobe&apos;s embedded Acrobat engine.
            </p>
          </div>
        </div>
      )}

      {/* Initialization Failure State */}
      {initError && !isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="flex flex-col items-center max-w-md p-6 rounded-2xl bg-card border border-border shadow-md">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive mb-3">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Adobe Embed API Error
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {initError}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-muted/60 border border-border/80 text-[11px] text-muted-foreground text-left w-full space-y-1.5 font-mono">
              <p className="font-semibold text-foreground">Common Root Causes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Client ID is invalid or not registered for this domain.</li>
                <li>Domain restriction mismatch in Adobe Console.</li>
                <li>Content security policy or ad-blocker blocking acrobatservices.adobe.com.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="rounded-xl text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry Initialization
              </Button>
              <a
                href="https://developer.adobe.com/console"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary" className="rounded-xl text-xs gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Adobe Console
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Adobe DC View Mount Point */}
      <div
        id={containerDivId}
        className="w-full h-full min-h-[500px] flex-1 overflow-hidden"
      />
    </div>
  );
}
