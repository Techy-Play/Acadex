/**
 * @component AssignmentCard
 * @description Renders a single assignment card with title, subject badge,
 * deadline countdown, Google Drive download link, and completion toggle.
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface AssignmentCardProps {
  id: string;
  title: string;
  description?: string;
  subjectName?: string;
  subjectId?: string;
  deadline?: string | null;
  fileUrl?: string;
  createdAt: string;
  completed?: boolean;
  onToggleComplete?: (id: string) => void;
}

export function AssignmentCard({
  id,
  title,
  description,
  subjectName,
  subjectId,
  deadline,
  fileUrl,
  createdAt,
  completed = false,
  onToggleComplete,
}: AssignmentCardProps) {
  const isOverdue = deadline ? new Date(deadline) < new Date() : false;
  const deadlineDate = deadline
    ? new Date(deadline).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      })
    : null;

  return (
    <Card
      className={`rounded-2xl border transition-all hover:shadow-md ${
        completed
          ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
          : "hover:-translate-y-0.5"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete?.(id);
              }}
              className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${
                completed
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-muted-foreground/40 hover:border-primary"
              }`}
              aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {completed && (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
            <div className="space-y-1">
              <CardTitle
                className={`text-base ${
                  completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {title}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {subjectName && (
                  subjectId ? (
                    <Link
                      href={`/user/dashboard/notes?subject=${subjectId}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge variant="secondary" className="rounded-lg text-xs hover:bg-primary/20 transition-colors cursor-pointer">
                        {subjectName}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="secondary" className="rounded-lg text-xs">
                      {subjectName}
                    </Badge>
                  )
                )}
                {deadline && (
                  <Badge
                    variant={
                      completed
                        ? "outline"
                        : isOverdue
                        ? "destructive"
                        : "outline"
                    }
                    className={`rounded-lg text-xs ${
                      completed ? "text-green-600 border-green-300" : ""
                    }`}
                  >
                    {completed
                      ? "Completed"
                      : isOverdue
                      ? `Overdue: ${deadlineDate}`
                      : `Due: ${deadlineDate}`}
                  </Badge>
                )}
                {completed && !deadline && (
                  <Badge
                    variant="outline"
                    className="rounded-lg text-xs text-green-600 border-green-300"
                  >
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              completed
                ? "bg-green-100 dark:bg-green-900/50"
                : "bg-primary/10"
            }`}
          >
            {completed ? (
              <svg
                className="h-4 w-4 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {description && (
          <p
            className={`text-sm mb-2 line-clamp-3 ${
              completed
                ? "text-muted-foreground/60 line-through"
                : "text-muted-foreground"
            }`}
          >
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {fileUrl && (
            <>
              <Link
                href={`/user/dashboard/viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title)}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Open
                </Button>
              </Link>
              <a
                href={toDownloadUrl(fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </Button>
              </a>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Posted:{" "}
          {new Date(createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
