"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { RefreshCw, AlertCircle, RotateCcw, ExternalLink, KeyRound, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADOBE_SDK_URL = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
const ADOBE_SDK_SCRIPT_ID = "adobe-dc-view-sdk-script";
const SESSION_CLIENT_ID_KEY = "acadex_test_adobe_client_id";

// Global type declarations for Adobe PDF Embed API
declare global {
  interface Window {
    AdobeDC?: {
      View: {
        new (config: {
          clientId: string;
          divId: string;
          locale?: string;
        }): {
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
            callback: (event: { type?: string }) => void,
            options?: unknown
          ) => void;
        };
        Enum?: {
          CallbackType?: {
            EVENT_LISTENER?: unknown;
          };
          Events?: Record<string, string>;
        };
      };
    };
  }
}

export interface AdobePdfViewerProps {
  /**
   * PDF source: URL string, File object, Blob, or Uint8Array.
   */
  src: string | File | Blob | Uint8Array | ArrayBuffer;
  /**
   * Display filename or document title.
   */
  title?: string;
  /**
   * Fallback download URL in case of rendering errors.
   */
  downloadUrl?: string;
  /**
   * Optional custom Adobe Client ID override.
   */
  clientId?: string;
  /**
   * Viewer embedding mode: "FULL_WINDOW" (default) or "SIZED_CONTAINER".
   */
  embedMode?: "FULL_WINDOW" | "SIZED_CONTAINER";
  /**
   * Callback fired on initialization or loading error.
   */
  onError?: (error: Error) => void;
  /**
   * Callback fired on successful document presentation.
   */
  onSuccess?: () => void;
  /**
   * Additional container CSS classes.
   */
  className?: string;
}

/**
 * Loads the Adobe View SDK script dynamically and resolves when SDK is ready.
 */
function loadAdobeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.AdobeDC?.View) {
      resolve();
      return;
    }

    const handleReady = () => {
      resolve();
    };

    document.addEventListener("adobe_dc_view_sdk.ready", handleReady, { once: true });

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

export function AdobePdfViewer({
  src,
  title = "Document.pdf",
  downloadUrl,
  clientId,
  embedMode = "FULL_WINDOW",
  onError,
  onSuccess,
  className = "",
}: AdobePdfViewerProps) {
  const envClientId = process.env.NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID || "";
  const [sessionClientId, setSessionClientId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return sessionStorage.getItem(SESSION_CLIENT_ID_KEY) || "";
    } catch {
      return "";
    }
  });

  const activeClientId = (clientId || sessionClientId || envClientId).trim();

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);
  const [tempKeyInput, setTempKeyInput] = useState("");

  // Unique container ID per document and render attempt to prevent SDK divId collisions
  const containerDivId = useMemo(() => {
    const safeTitle = (title || "doc").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15);
    const rand = Math.random().toString(36).slice(2, 8);
    return `adobe-pdf-${safeTitle}-${Date.now().toString(36)}-${rand}-${renderNonce}`;
  }, [title, renderNonce]);

  const isMountedRef = useRef(true);

  const handleSaveSessionKey = () => {
    if (!tempKeyInput.trim()) return;
    try {
      sessionStorage.setItem(SESSION_CLIENT_ID_KEY, tempKeyInput.trim());
      setSessionClientId(tempKeyInput.trim());
      setInitError(null);
      setIsLoading(true);
      setRenderNonce((n) => n + 1);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    setInitError(null);

    let isCancelled = false;
    let safetyTimer: NodeJS.Timeout | null = null;
    const abortController = new AbortController();

    async function initViewer() {
      try {
        if (!activeClientId) {
          throw new Error("Missing Adobe PDF Embed API Client ID. Please configure NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID.");
        }

        // 1. Ensure Adobe SDK is loaded and ready
        await loadAdobeSDK();
        if (isCancelled || !isMountedRef.current) return;

        if (!window.AdobeDC?.View) {
          throw new Error("AdobeDC.View constructor is unavailable after SDK load.");
        }

        // 2. Fetch or resolve the PDF ArrayBuffer in-memory
        let arrayBuffer: ArrayBuffer;
        if (src instanceof File || src instanceof Blob) {
          arrayBuffer = await src.arrayBuffer();
        } else if (src instanceof Uint8Array) {
          arrayBuffer = src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength) as ArrayBuffer;
        } else if (src instanceof ArrayBuffer) {
          arrayBuffer = src;
        } else if (typeof src === "string" && src.trim()) {
          const res = await fetch(src, {
            credentials: "same-origin",
            signal: abortController.signal,
          });
          if (!res.ok) {
            throw new Error(`Failed to load PDF document (HTTP ${res.status}: ${res.statusText}).`);
          }
          arrayBuffer = await res.arrayBuffer();
        } else {
          throw new Error("No valid PDF document source provided.");
        }

        if (isCancelled || !isMountedRef.current) return;

        // 3. Locate target DOM container and clear previous content
        const targetDiv = document.getElementById(containerDivId);
        if (!targetDiv) {
          throw new Error(`Target container #${containerDivId} was not found in the DOM.`);
        }
        targetDiv.innerHTML = "";

        // 4. Instantiate AdobeDC.View on unique container
        const adobeDCView = new window.AdobeDC.View({
          clientId: activeClientId,
          divId: containerDivId,
        });

        // 5. Register lifecycle events to dismiss loading immediately on first frame
        try {
          if (adobeDCView.registerCallback) {
            const callbackType =
              window.AdobeDC?.View?.Enum?.CallbackType?.EVENT_LISTENER || "EVENT_LISTENER";
            adobeDCView.registerCallback(
              callbackType,
              (event: { type?: string }) => {
                if (
                  event?.type === "DOCUMENT_OPEN" ||
                  event?.type === "PAGE_VIEW" ||
                  event?.type === "APP_RENDERING_DONE"
                ) {
                  if (isMountedRef.current && !isCancelled) {
                    setIsLoading(false);
                    if (onSuccess) onSuccess();
                  }
                }
              },
              { enablePDFAnalytics: true }
            );
          }
        } catch (cbErr) {
          console.warn("[AdobePdfViewer] registerCallback notice:", cbErr);
        }

        // 6. Invoke previewFile with in-memory ArrayBuffer promise
        const fileName = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;
        const previewPromise = adobeDCView.previewFile(
          {
            content: { promise: Promise.resolve(arrayBuffer) },
            metaData: {
              fileName,
              id: `${fileName}-${arrayBuffer.byteLength}-${Date.now()}`,
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

        // 7. Safety timeout: Adobe DC View renders internal spinners while opening documents.
        // Dismiss parent overlay after 2.5s if events are delayed.
        safetyTimer = setTimeout(() => {
          if (isMountedRef.current && !isCancelled) {
            setIsLoading(false);
          }
        }, 2500);

        await previewPromise;

        if (isMountedRef.current && !isCancelled) {
          setIsLoading(false);
          if (onSuccess) onSuccess();
        }
      } catch (err: unknown) {
        if (isCancelled || !isMountedRef.current) return;
        if (err instanceof Error && err.name === "AbortError") return;

        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to initialize Adobe PDF Embed API viewer.";
        console.error("[AdobePdfViewer Error]:", err);
        setInitError(errorMsg);
        setIsLoading(false);
        if (onError && err instanceof Error) onError(err);
      } finally {
        if (safetyTimer) {
          clearTimeout(safetyTimer);
        }
      }
    }

    initViewer();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      abortController.abort();
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
      const targetDiv = document.getElementById(containerDivId);
      if (targetDiv) {
        targetDiv.innerHTML = "";
      }
    };
  }, [src, title, activeClientId, embedMode, containerDivId, renderNonce, onError, onSuccess]);

  const handleRetry = () => {
    setInitError(null);
    setIsLoading(true);
    setRenderNonce((n) => n + 1);
  };

  // Missing Client ID Configuration State
  if (!activeClientId) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 h-full w-full bg-muted/20 ${className}`}>
        <div className="flex flex-col items-center max-w-md w-full bg-card rounded-2xl border border-amber-500/30 shadow-md p-6 text-center gap-3 animate-in fade-in">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <KeyRound className="h-7 w-7 animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Adobe PDF Client ID Required
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Adobe PDF Embed API requires an API key bound to this domain.
            Set <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID</code> in your environment, or enter a session key below:
          </p>

          <div className="flex items-center gap-2 w-full mt-2">
            <Input
              type="text"
              placeholder="Enter Adobe Client ID..."
              value={tempKeyInput}
              onChange={(e) => setTempKeyInput(e.target.value)}
              className="h-8 text-xs font-mono"
            />
            <Button size="sm" onClick={handleSaveSessionKey} className="h-8 text-xs font-semibold px-3">
              Apply
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <a
              href="https://developer.adobe.com/console"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                Adobe Developer Console
              </Button>
            </a>
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-muted-foreground">
                  <Download className="h-3 w-3" />
                  Download File
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-0 flex-1 flex flex-col bg-background select-none overflow-hidden ${className}`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xs text-center p-4 sm:p-6 animate-in fade-in">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-primary/10 text-primary shadow-xs">
            <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Initializing Adobe PDF Embed API...
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm px-2">
              Rendering document into Adobe&apos;s embedded Acrobat engine.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground hover:text-foreground h-7 rounded-lg"
            onClick={() => setIsLoading(false)}
          >
            Document visible? Dismiss overlay
          </Button>
        </div>
      )}

      {/* Initialization Failure State */}
      {initError && !isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-background overflow-y-auto">
          <div className="flex flex-col items-center max-w-md w-full p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-md my-auto">
            <div className="p-2.5 sm:p-3 rounded-full bg-destructive/10 text-destructive mb-2.5 sm:mb-3">
              <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Unable to Display Document in Adobe Reader
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed break-words max-w-full">
              {initError}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-4 sm:mt-5 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full sm:w-auto rounded-xl text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button size="sm" className="w-full rounded-xl text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download Original PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adobe DC View Mount Point */}
      <div
        id={containerDivId}
        className="w-full h-full min-h-0 flex-1 overflow-hidden"
      />
    </div>
  );
}

export default AdobePdfViewer;
