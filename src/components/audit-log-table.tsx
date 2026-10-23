/**
 * @component AuditLogTable
 * @description Searchable, filterable, sortable, and paginated audit log table.
 * Each row is clickable and opens the AuditLogDetailSheet side-panel.
 * Uses server-side querying with Atlas and Mongoose indexes.
 */
"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
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
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowUpDown,
  X,
  ChevronRightIcon,
  SlidersHorizontal,
} from "lucide-react";

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const categoryColors: Record<string, string> = {
  admin: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300",
  security: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-300",
  auth: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300",
  resource: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300",
  system: "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-300",
};

const roleColors: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300",
  student: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300",
  system: "bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-300",
  anonymous: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300",
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
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
  const [category, setCategory] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Sheet Detail State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [, startTransition] = useTransition();

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch logs from server
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pagination.limit));
      params.set("sort", sortOrder);

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category !== "all") params.set("category", category);
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      if (resourceType !== "all") params.set("resourceType", resourceType);

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
  }, [page, pagination.limit, sortOrder, debouncedSearch, category, role, status, resourceType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRowClick = (log: AuditLogItem) => {
    setSelectedLog(log);
    setSheetOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("all");
    setRole("all");
    setStatus("all");
    setResourceType("all");
    setSortOrder("newest");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    category !== "all" ||
    role !== "all" ||
    status !== "all" ||
    resourceType !== "all" ||
    sortOrder !== "newest";

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, target or log ID..."
            className="pl-9 pr-9 h-9 text-xs rounded-xl"
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

        {/* Filter & Refresh Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters || hasActiveFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 text-xs gap-1.5 rounded-xl"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="h-9 text-xs gap-1.5 rounded-xl"
            title={`Sort: currently ${sortOrder}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="h-9 w-9 p-0 rounded-xl"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Expandable Filter Bar */}
      {showFilters && (
        <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Audit Entries
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-primary hover:underline font-normal"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              >
                <option value="all">All Categories</option>
                <option value="admin">Admin Operations</option>
                <option value="resource">Resource Access</option>
                <option value="auth">Authentication</option>
                <option value="security">Security Events</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Actor Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="student">Student</option>
                <option value="system">System</option>
                <option value="anonymous">Anonymous</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>

            {/* Target Type Filter */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Target Type
              </label>
              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border bg-background text-xs"
              >
                <option value="all">All Targets</option>
                <option value="note">Notes</option>
                <option value="assignment">Assignments</option>
                <option value="practical">Practicals</option>
                <option value="library">Library</option>
                <option value="student">Users / Students</option>
                <option value="subject">Subjects</option>
                <option value="access_request">Access Requests</option>
                <option value="admin_request">Admin Requests</option>
                <option value="auth">Auth Events</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[170px] text-xs font-semibold">Time</TableHead>
              <TableHead className="w-[200px] text-xs font-semibold">User (Actor)</TableHead>
              <TableHead className="text-xs font-semibold">Action & Details</TableHead>
              <TableHead className="w-[180px] text-xs font-semibold">Target</TableHead>
              <TableHead className="w-[100px] text-xs font-semibold text-center">Status</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-5 w-16 bg-muted rounded-full mx-auto animate-pulse" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : error ? (
              // Error State
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center text-red-500 space-y-2">
                    <ShieldAlert className="h-8 w-8" />
                    <p className="text-sm font-semibold">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLogs()}
                      className="text-xs mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <Clock className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">No audit entries found</p>
                    {hasActiveFilters && (
                      <p className="text-xs">
                        Try clearing active filters or search terms.
                      </p>
                    )}
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs text-primary"
                      >
                        Reset all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              logs.map((log) => {
                const targetName =
                  log.target?.name ||
                  (log.target?.type ? `[${log.target.type}]` : "System");

                const targetSection =
                  typeof log.target?.section === "object" && log.target?.section !== null
                    ? log.target.section.name
                    : null;

                return (
                  <TableRow
                    key={log.id || log.logId}
                    onClick={() => handleRowClick(log)}
                    className="cursor-pointer hover:bg-muted/60 transition-colors group"
                  >
                    {/* Time Column */}
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>

                    {/* User / Actor Column */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {log.actor?.name || "Anonymous"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 uppercase font-medium ${
                            roleColors[log.actor?.role || "student"]
                          }`}
                        >
                          {log.actor?.role || "student"}
                        </Badge>
                      </div>
                      {log.actor?.collegeId && (
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {log.actor.collegeId}
                        </div>
                      )}
                    </TableCell>

                    {/* Action & Description Column */}
                    <TableCell className="text-xs max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-semibold text-foreground">
                          {log.action}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider ${
                            categoryColors[log.actionCategory] || "bg-muted"
                          }`}
                        >
                          {log.actionCategory}
                        </Badge>
                        {log.diff?.changedFields && log.diff.changedFields.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {log.diff.changedFields.length} changed
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {log.description}
                      </p>
                    </TableCell>

                    {/* Target Column */}
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground truncate max-w-[160px]" title={targetName}>
                        {targetName}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="capitalize">{log.target?.type || "Record"}</span>
                        {targetSection && (
                          <span className="truncate">· {targetSection}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell className="text-center text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold px-2 py-0.5 capitalize inline-flex items-center gap-1 ${
                          log.status === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-300"
                        }`}
                      >
                        {log.status === "success" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                        {log.status}
                      </Badge>
                    </TableCell>

                    {/* Detail Chevron */}
                    <TableCell className="text-right p-2">
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all inline" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Server-Side Pagination Bar */}
        <div className="p-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {logs.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{pagination.total}</span> entries
            <span className="ml-1 text-[11px] text-muted-foreground/80">
              (Strict 500 Global Limit)
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
      </div>

      {/* Slide-over Detail Sheet */}
      <AuditLogDetailSheet
        log={selectedLog}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
