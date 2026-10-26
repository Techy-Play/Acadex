/**
 * @component AuditLogTable
 * @description Simplified, human-friendly, responsive audit log interface.
 * - Simple: plain-English activity summaries and clean single-pill action tags.
 * - Responsive: clean table on desktop, stacked card layout on mobile devices.
 * - Reliable: real database queries with server-side pagination, sorting, and refresh.
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AuditLogDetailSheet,
  AuditLogItem,
} from "@/components/audit-log-detail-sheet";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowUpDown,
  X,
  ChevronRightIcon,
  CheckCircle2,
  AlertTriangle,
  User,
  Filter,
} from "lucide-react";
import { simplifyAuditLog, formatTimeAgo } from "@/lib/audit-log-formatter";

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AuditLogTable({ initialLimit = 15 }: { initialLimit?: number }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: initialLimit,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeChip, setActiveChip] = useState<"all" | "admin" | "download" | "auth" | "failure">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  // Sheet Detail State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch real logs from server
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pagination.limit));
      params.set("sort", sortOrder);

      if (debouncedSearch) params.set("search", debouncedSearch);

      // Map quick chips to API params
      if (activeChip === "admin") params.set("category", "admin");
      else if (activeChip === "auth") params.set("category", "auth");
      else if (activeChip === "failure") params.set("status", "failure");
      else if (activeChip === "download") params.set("action", "DOWNLOAD_RESOURCE");

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch audit logs (${res.status})`);
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(
        data.pagination || {
          total: data.logs?.length || 0,
          page,
          limit: pagination.limit,
          totalPages: 1,
        }
      );
    } catch (err) {
      console.error("Fetch audit logs error:", err);
      setError((err as Error).message || "Error loading audit records");
    } finally {
      setLoading(false);
    }
  }, [page, pagination.limit, sortOrder, debouncedSearch, activeChip]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRowClick = (log: AuditLogItem) => {
    setSelectedLog(log);
    setSheetOpen(true);
  };

  const handleChipChange = (chip: "all" | "admin" | "download" | "auth" | "failure") => {
    setActiveChip(chip);
    setPage(1);
  };

  const hasActiveFilters = Boolean(debouncedSearch) || activeChip !== "all" || sortOrder !== "newest";

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setActiveChip("all");
    setSortOrder("newest");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ─── Top Toolbar: Search, Category Chips & Refresh ─── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, document, or action..."
              className="pl-9 pr-9 h-9.5 text-xs rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Order Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSortOrder(sortOrder === "newest" ? "oldest" : "newest");
                setPage(1);
              }}
              className="h-9 text-xs gap-1.5 rounded-xl font-medium"
              title={`Sort by: ${sortOrder}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
            </Button>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs()}
              disabled={loading}
              className="h-9 px-3 text-xs gap-1.5 rounded-xl font-medium"
              title="Refresh logs from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* ─── Simplified Quick Filter Chips ─── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline-flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => handleChipChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeChip === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Logs
          </button>
          <button
            type="button"
            onClick={() => handleChipChange("admin")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeChip === "admin"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            👤 Admin Actions
          </button>
          <button
            type="button"
            onClick={() => handleChipChange("download")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeChip === "download"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            📥 Downloads
          </button>
          <button
            type="button"
            onClick={() => handleChipChange("auth")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeChip === "auth"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            🔑 Logins
          </button>
          <button
            type="button"
            onClick={() => handleChipChange("failure")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeChip === "failure"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            ⚠️ Failed Events
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-2 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Loading Skeleton */}
        {loading && (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0 border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-28 bg-muted rounded animate-pulse hidden sm:block" />
                <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-10 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Unable to fetch audit logs right now.</p>
            <Button variant="outline" size="sm" onClick={() => fetchLogs()} className="text-xs rounded-xl mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && logs.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-foreground">No activity records found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "No logs match your current search or filter criteria. Try clearing them."
                : "No activities have been recorded yet. New user and admin actions will appear here automatically."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs rounded-xl mt-2">
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* ─── DESKTOP VIEW: Clean, Simple Table (md: and above) ─── */}
        {!loading && !error && logs.length > 0 && (
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-[120px] text-xs font-semibold">Time</TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold">User</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold">Action</TableHead>
                  <TableHead className="text-xs font-semibold">What Happened</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const s = simplifyAuditLog(log);
                  const actorRole = log.actor?.role || "student";

                  return (
                    <TableRow
                      key={log.logId || log.id}
                      onClick={() => handleRowClick(log)}
                      className="cursor-pointer hover:bg-muted/40 transition-colors border-border/60 group"
                    >
                      {/* Time Column */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground">{formatTimeAgo(log.createdAt)}</span>
                      </TableCell>

                      {/* User Column */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {(log.actor?.name || "U")[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[120px]">
                              {log.actor?.name || "Unknown"}
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                              {s.actorRoleDisplay}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Action Pill Column */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${s.badgeClass}`}
                        >
                          {s.badgeLabel}
                        </Badge>
                      </TableCell>

                      {/* What Happened Column */}
                      <TableCell className="text-xs">
                        <p className="font-medium text-foreground leading-snug">
                          {s.plainEnglishSummary}
                        </p>
                        {s.targetTypeDisplay && s.targetTypeDisplay !== "System" && (
                          <span className="text-[11px] text-muted-foreground/80 mt-0.5 block">
                            Type: {s.targetTypeDisplay}
                          </span>
                        )}
                      </TableCell>

                      {/* Status Column */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 inline-flex items-center gap-1 ${
                            s.isFailure
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {s.isFailure ? (
                            <>
                              <AlertTriangle className="h-3 w-3" /> Failed
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Success
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Chevron Arrow */}
                      <TableCell className="text-right p-2">
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all inline" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ─── MOBILE VIEW: Stacked Responsive Cards (< md) ─── */}
        {!loading && !error && logs.length > 0 && (
          <div className="block md:hidden divide-y divide-border/60">
            {logs.map((log) => {
              const s = simplifyAuditLog(log);

              return (
                <div
                  key={log.logId || log.id}
                  onClick={() => handleRowClick(log)}
                  className="p-4 hover:bg-muted/30 transition-colors active:bg-muted/50 cursor-pointer space-y-2.5"
                >
                  {/* Card Top Row: Actor, Role, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                        {(log.actor?.name || "U")[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                        {log.actor?.name || "Unknown"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium shrink-0">
                        {s.actorRoleDisplay}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>

                  {/* Card Middle Row: Action Pill & Summary */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${s.badgeClass}`}
                      >
                        {s.badgeLabel}
                      </Badge>
                      {s.isFailure && (
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                          Failure
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground leading-relaxed">
                      {s.plainEnglishSummary}
                    </p>
                  </div>

                  {/* Card Bottom Row: Target & Detail Link */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                    <span className="truncate">Type: {s.targetTypeDisplay}</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5 shrink-0">
                      View details <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Server-Side Pagination Bar ─── */}
        {!loading && !error && logs.length > 0 && (
          <div className="p-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{pagination.total}</span> entries
              <span className="ml-1 text-[11px] text-muted-foreground/80 hidden xs:inline">
                (Global 500 Limit)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="h-8 px-2.5 text-xs rounded-lg"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>

              <span className="font-medium text-foreground px-2">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="h-8 px-2.5 text-xs rounded-lg"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Slide-over Detail Sheet ─── */}
      <AuditLogDetailSheet
        log={selectedLog}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
