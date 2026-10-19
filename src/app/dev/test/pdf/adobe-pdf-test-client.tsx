"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  FileText,
  KeyRound,
  AlertTriangle,
  Upload,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { PdfUploadDropzone } from "./components/pdf-upload-dropzone";
import { AdobeViewer } from "./components/adobe-viewer";

const SESSION_CLIENT_ID_KEY = "acadex_test_adobe_client_id";

export function AdobePdfTestClient() {
  const router = useRouter();

  const envClientId = process.env.NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID || "";
  const [customClientId, setCustomClientId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return sessionStorage.getItem(SESSION_CLIENT_ID_KEY) || "";
    } catch {
      return "";
    }
  });
  const [showKeySettings, setShowKeySettings] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isViewerActive, setIsViewerActive] = useState<boolean>(false);
  const embedMode = "FULL_WINDOW";

  const activeClientId = customClientId.trim() || envClientId.trim();

  const handleSaveCustomClientId = (key: string) => {
    setCustomClientId(key);
    try {
      if (key.trim()) {
        sessionStorage.setItem(SESSION_CLIENT_ID_KEY, key.trim());
      } else {
        sessionStorage.removeItem(SESSION_CLIENT_ID_KEY);
      }
    } catch {
      // ignore
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setIsViewerActive(false);
  };

  const handleOpenViewer = () => {
    if (!selectedFile) return;
    setIsViewerActive(true);
  };

  const handleBackNavigation = () => {
    if (isViewerActive) {
      setIsViewerActive(false);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background select-none overflow-hidden">
      {/* Top Application Header Bar matching /user/dashboard/viewer */}
      <header className="h-12 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 z-20 shrink-0">
        {/* Left Section: Back button, Title, and Badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg shrink-0"
            onClick={handleBackNavigation}
            title={isViewerActive ? "Return to Upload Screen" : "Go Back"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-red-500 shrink-0 hidden sm:block" />
            <h1 className="text-sm font-semibold truncate text-foreground">
              {isViewerActive && selectedFile ? selectedFile.name : "Adobe PDF Reader — Test Lab"}
            </h1>

            <Badge
              variant="outline"
              className="text-[10px] font-mono tracking-tight shrink-0 hidden sm:inline-flex border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5"
            >
              Adobe PDF Embed API
            </Badge>

            <Badge
              variant="secondary"
              className="text-[10px] font-mono shrink-0 hidden md:inline-flex bg-muted/60 text-muted-foreground"
            >
              Isolated Lab
            </Badge>
          </div>
        </div>

        {/* Right Section: Actions & Client ID Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Client ID Status Pill */}
          <button
            onClick={() => setShowKeySettings(!showKeySettings)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
              activeClientId
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
            }`}
            title="Click to view or update Adobe Client ID settings"
          >
            {activeClientId ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">Client ID Set</span>
              </>
            ) : (
              <>
                <KeyRound className="h-3 w-3 animate-pulse" />
                <span>Client ID Needed</span>
              </>
            )}
          </button>

          {/* Viewer Mode Controls (When viewing PDF) */}
          {isViewerActive && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium rounded-lg gap-1.5 shadow-xs"
                onClick={() => setIsViewerActive(false)}
                title="Choose a different PDF file"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Change PDF</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium rounded-lg gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleClearFile}
                title="Clear current document and return to upload"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Client ID Configuration Modal / Popover Banner */}
      {showKeySettings && (
        <div className="shrink-0 p-4 bg-card/98 border-b border-border shadow-md z-15 animate-in slide-in-from-top-2">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold text-foreground">
                  Adobe PDF Embed API Configuration
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setShowKeySettings(false)}
              >
                Close
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Adobe requires a valid Client ID registered for the domain accessing the SDK.
              For local development, register <code className="bg-muted px-1 rounded">localhost:3000</code>. For production, register <code className="bg-muted px-1 rounded">au-acadex.com</code>.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Enter Adobe Client ID (e.g., e7d4f...)"
                  value={customClientId}
                  onChange={(e) => handleSaveCustomClientId(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {envClientId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => handleSaveCustomClientId("")}
                  title="Revert to environment variable"
                >
                  Use .env Default
                </Button>
              )}

              <a
                href="https://developer.adobe.com/console"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5 w-full sm:w-auto">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Adobe Console
                </Button>
              </a>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Environment Variable: {envClientId ? "Configured" : "None"}</span>
              <span>Active Client ID: {activeClientId ? `${activeClientId.slice(0, 10)}...` : "None"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative flex-1 w-full h-full min-h-0 bg-muted/30 overflow-hidden flex items-center justify-center">
        {/* State A: File Upload & Setup Panel */}
        {!isViewerActive && (
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
            {/* Missing Client ID Alert Box (if not configured) */}
            {!activeClientId && (
              <div className="w-full max-w-xl mx-auto mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground shadow-xs animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400">
                      Adobe Client ID Required for Viewer Initialization
                    </h4>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      Adobe PDF Embed API requires an API key bound to your hostname.
                      Set <code className="bg-muted px-1 rounded text-foreground font-mono">NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID</code> in your environment, or click below to enter one for this session.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg"
                        onClick={() => setShowKeySettings(true)}
                      >
                        Enter Client ID
                      </Button>
                      <a
                        href="https://developer.adobe.com/console"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Adobe Developer Console
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Dropzone */}
            <PdfUploadDropzone
              onFileSelected={handleFileSelected}
              selectedFile={selectedFile}
              onClearFile={handleClearFile}
              onOpenViewer={handleOpenViewer}
              disabled={false}
            />
          </div>
        )}

        {/* State B: Active Adobe PDF Embed Viewer */}
        {isViewerActive && selectedFile && (
          <div className="relative w-full h-full flex flex-col overflow-hidden">
            <AdobeViewer
              file={selectedFile}
              clientId={activeClientId}
              embedMode={embedMode}
              onError={(err) => {
                console.error("[Adobe PDF Test Client] Error:", err);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
