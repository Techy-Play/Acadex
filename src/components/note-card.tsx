/**
 * @component NoteCard
 * @description Renders a single note card with title, subject badge,
 * upload date, and download/view links. Uses MagicCard for hover gradient.
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import Link from "next/link";

function toDownloadUrl(url: string): string {
  try {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (parsed.hostname === "drive.google.com" && idParam) return `https://drive.google.com/uc?export=download&id=${idParam}`;
  } catch {}
  return url;
}

interface NoteCardProps {
  title: string;
  subjectName?: string;
  fileUrl: string;
  uploadedAt: string;
}

export function NoteCard({ title, subjectName, fileUrl, uploadedAt }: NoteCardProps) {
  return (
    <MagicCard
      className="rounded-2xl shadow-sm hover:shadow-md transition-all"
      gradientSize={200}
      gradientColor="color-mix(in oklch, var(--primary) 15%, transparent)"
      gradientFrom="var(--primary)"
      gradientTo="var(--accent)"
      gradientOpacity={0.08}
    >
      <div className="bg-card rounded-2xl">
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
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
              asChild
            >
              <Link href={`/user/dashboard/viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title)}`}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
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
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </Button>
          </div>
        </CardContent>
      </div>
    </MagicCard>
  );
}
