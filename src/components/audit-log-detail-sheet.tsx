/**
 * @component AuditLogDetailSheet
 * @description Simplified, human-readable slide-over panel displaying audit log details:
 * plain-English summary, actor identity, affected record, clean before/after comparisons,
 * and a deep-link button to view the affected record without leaving the table.
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  FileText,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  simplifyAuditLog,
  formatFullDateTime,
  formatTimeAgo,
} from "@/lib/audit-log-formatter";

export interface AuditActor {
  id: string;
  name: string;
  collegeId?: string;
  role: "superadmin" | "admin" | "student" | "system" | "anonymous";
  email?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditTarget {
  id?: string;
  type: string;
  name?: string;
  section?: { _id?: string; name: string } | string | null;
  subject?: { _id?: string; name: string } | string | null;
}

export interface AuditDiff {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
}

export interface AuditLogItem {
  id: string;
  _id?: string;
  logId: string;
  actor: AuditActor;
  action: string;
  actionCategory: "auth" | "resource" | "admin" | "system" | "security";
  description: string;
  target?: AuditTarget;
  route?: string;
  status: "success" | "failure";
  statusCode?: number;
  diff?: AuditDiff;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogDetailSheetProps {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailSheet({ log, open, onOpenChange }: AuditLogDetailSheetProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!log) return null;

  const s = simplifyAuditLog(log);

  const copyLogId = () => {
    if (log.logId) {
      navigator.clipboard.writeText(log.logId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formattedDate = formatFullDateTime(log.createdAt);

  const sectionName =
    typeof log.target?.section === "object" && log.target?.section !== null
      ? log.target.section.name
      : typeof log.target?.section === "string"
      ? log.target.section
      : null;

  const subjectName =
    typeof log.target?.subject === "object" && log.target?.subject !== null
      ? log.target.subject.name
      : typeof log.target?.subject === "string"
      ? log.target.subject
      : null;

  const hasDiff = Boolean(log.diff?.changedFields && log.diff.changedFields.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto p-0 flex flex-col gap-0 border-l bg-background shadow-2xl"
      >
        {/* ─── Sheet Header ─── */}
        <SheetHeader className="p-5 sm:p-6 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 rounded-md ${s.badgeClass}`}>
                  {s.badgeLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    s.isFailure
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {s.isFailure ? (
                    <>
                      <ShieldAlert className="h-3 w-3 mr-1 inline" /> Failed
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3 mr-1 inline" /> Success
                    </>
                  )}
                </Badge>
              </div>

              <SheetTitle className="text-xl font-bold tracking-tight text-foreground pt-1">
                {s.humanTitle}
              </SheetTitle>

              <SheetDescription className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                {s.plainEnglishSummary}
              </SheetDescription>
            </div>
          </div>

          {/* Log Identifier & Copy Button */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground bg-background rounded-lg p-2 border border-border/60">
            <span className="font-mono text-[11px] truncate select-all">{log.logId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLogId}
              className="h-6 px-2 text-[11px] hover:bg-muted ml-2 shrink-0 rounded-md"
              title="Copy Unique Audit ID"
            >
              {copiedId ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" /> Copy ID
                </>
              )}
            </Button>
          </div>
        </SheetHeader>

        {/* ─── Sheet Body ─── */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* Timestamp Card */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Date & Time</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{formattedDate}</p>
              <p className="text-[11px] text-muted-foreground/80">{formatTimeAgo(log.createdAt)}</p>
            </div>
          </div>

          {/* Actor / User Information Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-foreground">
                <User className="h-4 w-4 text-primary" />
                Who performed this
              </div>
              <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-wider">
                {s.actorRoleDisplay}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
              <div>
                <span className="text-[11px] text-muted-foreground block">Full Name</span>
                <span className="font-semibold text-foreground">{log.actor?.name || "System"}</span>
              </div>
              {log.actor?.collegeId && (
                <div>
                  <span className="text-[11px] text-muted-foreground block">College ID</span>
                  <span className="font-mono font-medium text-foreground">{log.actor.collegeId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Affected Target Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Affected Item
              </div>
              <Badge variant="secondary" className="text-[11px] capitalize">
                {s.targetTypeDisplay}
              </Badge>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/60 text-xs">
              <div>
                <span className="text-[11px] text-muted-foreground block">Title / Name</span>
                <span className="font-semibold text-foreground break-words">{s.targetDisplay}</span>
              </div>

              {(subjectName || sectionName) && (
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  {subjectName && <span>Subject: <strong className="text-foreground">{subjectName}</strong></span>}
                  {sectionName && <span>Section: <strong className="text-foreground">{sectionName}</strong></span>}
                </div>
              )}
            </div>
          </div>

          {/* ─── Before & After Comparison (If changes were made) ─── */}
          {hasDiff && (
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-foreground">
                <Info className="h-4 w-4 text-primary" />
                What Changed (Before & After)
              </div>

              <div className="space-y-3 pt-1 border-t border-border/60">
                {log.diff?.changedFields?.map((field) => {
                  const valBefore = log.diff?.before ? String(log.diff.before[field] ?? "None") : "None";
                  const valAfter = log.diff?.after ? String(log.diff.after[field] ?? "None") : "None";

                  return (
                    <div key={field} className="rounded-lg bg-muted/30 p-2.5 border border-border/40 text-xs space-y-1.5">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-primary block">
                        {field}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-background p-2 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Previous Value:</span>
                          <span className="text-muted-foreground line-through break-all">{valBefore}</span>
                        </div>
                        <div className="rounded bg-primary/5 p-2 border border-primary/20">
                          <span className="text-[10px] text-primary font-semibold block mb-0.5">Updated Value:</span>
                          <span className="text-foreground font-medium break-all">{valAfter}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deep Link to View Affected Record */}
          {log.route && (
            <div className="pt-2">
              <Link href={log.route} onClick={() => onOpenChange(false)} className="w-full inline-block">
                <Button className="w-full rounded-xl text-xs font-semibold gap-1.5 h-10 shadow-sm">
                  <span>Open Related Record in Acadex</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
