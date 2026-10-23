/**
 * @component AuditLogDetailSheet
 * @description Slide-over inspection panel displaying full audit log details:
 * actor credentials, exact timestamp, action metadata, before/after changes comparison,
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
  Server,
  Terminal,
} from "lucide-react";

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

const roleBadgeColors: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
  student: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
  system: "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-300",
  anonymous: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300",
};

const categoryBadgeColors: Record<string, string> = {
  admin: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300",
  security: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-300",
  auth: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300",
  resource: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300",
  system: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300",
};

export function AuditLogDetailSheet({ log, open, onOpenChange }: AuditLogDetailSheetProps) {
  const [copiedId, setCopiedId] = useState(false);

  if (!log) return null;

  const copyLogId = () => {
    if (log.logId) {
      navigator.clipboard.writeText(log.logId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formattedDate = new Date(log.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

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

  const deletedRecord = log.metadata?.deletedRecord as Record<string, unknown> | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col gap-0 border-l bg-background shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    categoryBadgeColors[log.actionCategory] || "bg-muted"
                  }`}
                >
                  {log.actionCategory}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${
                    log.status === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300"
                  }`}
                >
                  {log.status === "success" ? (
                    <ShieldCheck className="h-3 w-3 mr-1 inline" />
                  ) : (
                    <ShieldAlert className="h-3 w-3 mr-1 inline" />
                  )}
                  {log.status.toUpperCase()}
                  {log.statusCode ? ` (${log.statusCode})` : ""}
                </Badge>
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground pt-1">
                {log.action}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {log.description}
              </SheetDescription>
            </div>
          </div>

          {/* Log Identifier & Copy */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground bg-background/80 rounded-lg p-2 border">
            <span className="font-mono truncate select-all">{log.logId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLogId}
              className="h-6 px-2 text-xs hover:bg-muted ml-2 shrink-0"
              title="Copy Audit ID"
            >
              {copiedId ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy ID
                </>
              )}
            </Button>
          </div>
        </SheetHeader>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Timestamp & Timing */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-card text-card-foreground shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
              <p className="text-sm font-semibold">{formattedDate}</p>
            </div>
          </div>

          {/* Actor / User Information Card */}
          <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <User className="h-4 w-4 text-primary" />
                Actor (User) Identity
              </div>
              <Badge
                variant="outline"
                className={`text-xs capitalize font-medium ${
                  roleBadgeColors[log.actor?.role || "student"]
                }`}
              >
                {log.actor?.role || "student"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium text-foreground text-sm mt-0.5">
                  {log.actor?.name || "Unknown"}
                </p>
              </div>
              {log.actor?.collegeId && (
                <div>
                  <span className="text-muted-foreground">College ID:</span>
                  <p className="font-mono font-medium text-foreground text-sm mt-0.5">
                    {log.actor.collegeId}
                  </p>
                </div>
              )}
              {log.actor?.ip && (
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{log.actor.ip}</p>
                </div>
              )}
              {log.actor?.id && (
                <div>
                  <span className="text-muted-foreground">Actor ID:</span>
                  <p className="font-mono text-muted-foreground mt-0.5 truncate" title={log.actor.id}>
                    {log.actor.id}
                  </p>
                </div>
              )}
            </div>

            {log.actor?.userAgent && (
              <div className="pt-2 border-t text-[11px] text-muted-foreground">
                <span className="font-medium">User Agent:</span>
                <p className="truncate font-mono mt-0.5" title={log.actor.userAgent}>
                  {log.actor.userAgent}
                </p>
              </div>
            )}
          </div>

          {/* Affected Target Record Card */}
          {log.target && (log.target.name || log.target.type) && (
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  Target Record
                </div>
                <Badge variant="secondary" className="text-xs uppercase font-medium">
                  {log.target.type}
                </Badge>
              </div>

              <div className="space-y-2 text-xs pt-1">
                {log.target.name && (
                  <div>
                    <span className="text-muted-foreground">Resource Name / Target:</span>
                    <p className="font-semibold text-foreground text-sm mt-0.5">
                      {log.target.name}
                    </p>
                  </div>
                )}
                {log.target.id && (
                  <div>
                    <span className="text-muted-foreground">Target ID:</span>
                    <p className="font-mono text-muted-foreground text-xs mt-0.5 select-all">
                      {log.target.id}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {sectionName && (
                    <div>
                      <span className="text-muted-foreground">Section:</span>
                      <p className="font-medium text-foreground mt-0.5">{sectionName}</p>
                    </div>
                  )}
                  {subjectName && (
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <p className="font-medium text-foreground mt-0.5">{subjectName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* View Related Record Deep Link Button */}
              {log.route && (
                <div className="pt-3 border-t">
                  <Link href={log.route} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full text-xs font-semibold flex items-center justify-center gap-2 h-9">
                      View Related Record
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Before & After Diff Card (Admin Changes) */}
          {log.diff && log.diff.changedFields && log.diff.changedFields.length > 0 && (
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Terminal className="h-4 w-4 text-amber-500" />
                  Modified Fields Comparison
                </div>
                <Badge variant="outline" className="text-xs">
                  {log.diff.changedFields.length} changed
                </Badge>
              </div>

              <div className="divide-y border rounded-lg overflow-hidden bg-background">
                {log.diff.changedFields.map((field) => {
                  const beforeVal = log.diff?.before ? log.diff.before[field] : undefined;
                  const afterVal = log.diff?.after ? log.diff.after[field] : undefined;

                  return (
                    <div key={field} className="p-3 text-xs space-y-2">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="font-mono text-primary">{field}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Before */}
                        <div className="p-2.5 rounded-md bg-red-500/5 border border-red-500/20 text-red-900 dark:text-red-300">
                          <span className="text-[10px] uppercase font-bold text-red-500 block mb-1">
                            Previous Value
                          </span>
                          <pre className="font-mono text-xs whitespace-pre-wrap break-all">
                            {beforeVal !== undefined && beforeVal !== null
                              ? typeof beforeVal === "object"
                                ? JSON.stringify(beforeVal, null, 2)
                                : String(beforeVal)
                              : "<empty>"}
                          </pre>
                        </div>

                        {/* After */}
                        <div className="p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
                          <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-1 flex items-center gap-1">
                            Updated Value <ArrowRight className="h-3 w-3 inline" />
                          </span>
                          <pre className="font-mono text-xs whitespace-pre-wrap break-all font-semibold">
                            {afterVal !== undefined && afterVal !== null
                              ? typeof afterVal === "object"
                                ? JSON.stringify(afterVal, null, 2)
                                : String(afterVal)
                              : "<empty>"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preserved Deletion Metadata */}
          {deletedRecord && (
            <div className="rounded-xl border border-red-500/30 bg-red-50/20 dark:bg-red-950/10 p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-red-700 dark:text-red-400">
                <Info className="h-4 w-4" />
                Preserved Record Snapshot (Post-Deletion)
              </div>
              <p className="text-xs text-muted-foreground">
                This record was removed, but the following metadata was securely retained for auditing:
              </p>
              <pre className="p-3 rounded-lg bg-background border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(deletedRecord, null, 2)}
              </pre>
            </div>
          )}

          {/* Context & Metadata Card */}
          {log.metadata && Object.keys(log.metadata).length > 0 && !deletedRecord && (
            <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Server className="h-4 w-4 text-muted-foreground" />
                Additional Metadata & Context
              </div>
              <pre className="p-3 rounded-lg bg-muted/40 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
