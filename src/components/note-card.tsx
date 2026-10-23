"use client";

import { useMemo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import Link from "next/link";
import { Eye, Download, ExternalLink } from "lucide-react";
import { toDownloadUrl } from "@/lib/document-utils";
import { getResourceAction } from "@/lib/resource-resolver";

interface NoteCardProps {
  title: string;
  subjectName?: string;
  fileUrl: string;
  uploadedAt: string;
}

export function NoteCard({ title, subjectName, fileUrl, uploadedAt }: NoteCardProps) {
  const action = useMemo(() => getResourceAction(fileUrl, title), [fileUrl, title]);

  return (
    <MagicCard
      className="rounded-2xl shadow-sm hover:shadow-md transition-all"
      gradientSize={200}
      gradientColor="color-mix(in oklch, var(--primary) 15%, transparent)"
      gradientFrom="var(--primary)"
      gradientTo="var(--accent)"
      gradientOpacity={0.08}
    >
      <div className="bg-card rounded-2xl border border-border">
        <CardHeader className="pb-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle className="text-base font-semibold leading-snug">{title}</CardTitle>
              {subjectName && (
                <Badge variant="secondary" className="rounded-lg text-xs font-medium">
                  {subjectName}
                </Badge>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(uploadedAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <div className="flex items-center gap-1.5">
              {/* External web links (Canva, Figma, etc.): only show Open Link button */}
              {action.actionKind === "open_link" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                  asChild
                >
                  <a href={action.targetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Link
                  </a>
                </Button>
              ) : action.actionKind === "download_file" ? (
                /* Non-PDF files: DO NOT show open button, ONLY show install/download button */
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8 gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  asChild
                >
                  <a href={action.downloadUrl || toDownloadUrl(fileUrl)} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5" />
                    {action.buttonLabel}
                  </a>
                </Button>
              ) : (
                /* PDF and Image resources: show Open (Adobe PDF Embed API) and Download */
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                    asChild
                  >
                    <Link href={`/user/dashboard/viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title)}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                    asChild
                  >
                    <a href={toDownloadUrl(fileUrl)} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </MagicCard>
  );
}
