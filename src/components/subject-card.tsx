"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";

interface SubjectCardProps {
  name: string;
  noteCount?: number;
  assignmentCount?: number;
  completedCount?: number;
  practicalCount?: number;
  practicalCompletedCount?: number;
  onClick?: () => void;
}

export function SubjectCard({
  name,
  noteCount = 0,
  assignmentCount = 0,
  completedCount = 0,
  practicalCount = 0,
  practicalCompletedCount = 0,
  onClick,
}: SubjectCardProps) {
  const progressPercent =
    assignmentCount > 0
      ? Math.round((completedCount / assignmentCount) * 100)
      : 0;

  const practicalPercent =
    practicalCount > 0
      ? Math.round((practicalCompletedCount / practicalCount) * 100)
      : 0;

  return (
    <div onClick={onClick} className="cursor-pointer">
      <MagicCard
        className="rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
        gradientSize={250}
        gradientColor="#6366f120"
        gradientFrom="#6366f1"
        gradientTo="#a855f7"
        gradientOpacity={0.1}
      >
        <div className="bg-card rounded-2xl">
          <CardHeader className="pb-2 p-5">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-lg mb-2">
                📚
              </div>
              {assignmentCount > 0 && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg">
                  {progressPercent}%
                </span>
              )}
            </div>
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {noteCount} notes
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {completedCount}/{assignmentCount}
              </span>
              {practicalCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  {practicalCompletedCount}/{practicalCount}
                </span>
              )}
            </div>
            {/* Per-subject assignment progress bar */}
            {assignmentCount > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progressPercent === 100
                      ? "bg-gradient-to-r from-emerald-400 to-green-500"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
            {/* Per-subject practical progress bar */}
            {practicalCount > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    practicalPercent === 100
                      ? "bg-gradient-to-r from-emerald-400 to-green-500"
                      : "bg-gradient-to-r from-teal-500 to-emerald-500"
                  }`}
                  style={{ width: `${practicalPercent}%` }}
                />
              </div>
            )}
          </CardContent>
        </div>
      </MagicCard>
    </div>
  );
}
