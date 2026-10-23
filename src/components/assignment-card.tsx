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

import { toDownloadUrl } from "@/lib/document-utils";
import { getResourceAction } from "@/lib/resource-resolver";
import { Eye, Download, ExternalLink } from "lucide-react";

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
  subjectLinkPath?: string; // M-07: Customize where the subject badge links
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
  subjectLinkPath = "/user/dashboard/notes",
}: AssignmentCardProps) {
  // H-03: Use end-of-day UTC (23:59:59) so assignments aren't marked overdue
  // on the morning of the due date itself. Only mark overdue the next day.
  const isOverdue = deadline
    ? (() => {
        const d = new Date(deadline);
        d.setUTCHours(23, 59, 59, 999);
        return d < new Date();
      })()
    : false;
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
                      href={`${subjectLinkPath}?subject=${subjectId}`}
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
          {fileUrl && (() => {
            const action = getResourceAction(fileUrl, title);
            if (action.actionKind === "open_link") {
              return (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <a href={action.targetUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Link
                  </a>
                </Button>
              );
            }
            if (action.actionKind === "download_file") {
              return (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <a href={action.downloadUrl || toDownloadUrl(fileUrl)} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5" />
                    {action.buttonLabel}
                  </a>
                </Button>
              );
            }
            return (
              <>
                <Link
                  href={`/user/dashboard/viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title)}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
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
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </a>
              </>
            );
          })()}
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
