/**
 * @page AdminAuditLogs (/admin/activity)
 * @description Dedicated admin audit logs view.
 * Provides searching, multi-field filtering, sorting, server-side pagination,
 * and clickable row inspection side-sheet for compliance and security auditing.
 */
"use client";

import React from "react";
import Link from "next/link";
import { AuditLogTable } from "@/components/audit-log-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Lock } from "lucide-react";

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Dashboard
              </Button>
            </Link>
            <span className="text-muted-foreground/60 text-xs">/</span>
            <span className="text-xs font-medium text-foreground">Audit Logs</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Logs & Security Activity
          </h1>
          <p className="text-sm text-muted-foreground">
            Searchable, high-integrity audit trail tracking user sessions, resource access, and detailed admin operations with before/after comparisons.
          </p>
        </div>

        {/* Security & Retention Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 font-medium bg-muted/40">
            <Database className="h-3.5 w-3.5 text-primary" />
            Collection: AuditLog
          </Badge>
          <Badge variant="outline" className="text-xs gap-1.5 py-1 px-2.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
            <Lock className="h-3.5 w-3.5" />
            Global 500 Limit Enforced
          </Badge>
        </div>
      </div>

      {/* Main Interactive Audit Log Table */}
      <AuditLogTable initialLimit={15} />
    </div>
  );
}
