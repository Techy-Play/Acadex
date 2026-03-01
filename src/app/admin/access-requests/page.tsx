/**
 * @page AdminAccessRequests (/admin/access-requests)
 * @description Admin panel for reviewing and approving student access requests.
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AccessRequest {
  _id: string;
  name: string;
  college_id: string;
  email: string;
  stream: { _id: string; name: string } | null;
  section: { _id: string; name: string } | null;
  semester: number | null;
  reason: string;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  duplicateId?: boolean;
  createdAt: string;
}

type FilterStatus = "all" | "pending" | "approved" | "denied";

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "college_id" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  // Action dialog (approve/deny)
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "deny">("approve");
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearingOlder, setClearingOlder] = useState(false);

  // Approval result
  const [approvalResult, setApprovalResult] = useState<{
    collegeId: string;
    tempPassword: string;
    email: string;
  } | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/access-requests");
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch {
      toast.error("Failed to fetch access requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (
            !r.name.toLowerCase().includes(q) &&
            !r.college_id.toLowerCase().includes(q) &&
            !r.email.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") cmp = a.name.localeCompare(b.name);
        else if (sortBy === "college_id") cmp = a.college_id.localeCompare(b.college_id);
        else if (sortBy === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [requests, filter, searchQuery, sortBy, sortOrder]);

  const activeFilters =
    (filter !== "pending" ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (sortBy !== "date" || sortOrder !== "desc" ? 1 : 0);

  // ─── Open detail dialog ─────────────────────────
  const openDetailDialog = (req: AccessRequest) => {
    setSelectedRequest(req);
    setDetailDialogOpen(true);
  };

  // ─── Open action dialog from detail ─────────────
  const openActionDialog = (type: "approve" | "deny") => {
    setActionType(type);
    setAdminNote("");
    setApprovalResult(null);
    setDetailDialogOpen(false);
    setTimeout(() => setActionDialogOpen(true), 150);
  };

  // ─── Open delete dialog from detail ─────────────
  const openDeleteDialog = () => {
    setDetailDialogOpen(false);
    setTimeout(() => setDeleteDialogOpen(true), 150);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/access-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          action: actionType,
          admin_note: adminNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `Failed to ${actionType} request`);
        return;
      }

      if (actionType === "approve" && data.tempPassword) {
        setApprovalResult({
          collegeId: selectedRequest.college_id,
          tempPassword: data.tempPassword,
          email: selectedRequest.email,
        });
        toast.success("Request approved! User account created.");
      } else {
        toast.success(
          `Request ${actionType === "approve" ? "approved" : "denied"}.`
        );
        setActionDialogOpen(false);
      }

      fetchRequests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/access-requests?id=${selectedRequest._id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete request");
        return;
      }

      toast.success("Request deleted");
      setRequests(requests.filter((r) => r._id !== selectedRequest._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleClearOlder = async () => {
    if (!confirm("Clear older processed requests (approved/denied)? Pending requests will be kept.")) {
      return;
    }
    setClearingOlder(true);
    try {
      const res = await fetch("/api/admin/access-requests?mode=clear-older", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to clear older requests");
        return;
      }
      toast.success(`Cleared ${data.deletedCount || 0} older request(s)`);
      fetchRequests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setClearingOlder(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="rounded-full text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
          >
            ⏳ Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="rounded-full text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
          >
            ✅ Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge
            variant="outline"
            className="rounded-full text-red-600 border-red-300 dark:text-red-400 dark:border-red-700"
          >
            ❌ Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access Requests</h1>
        <p className="text-muted-foreground">
          Review and manage account access requests from students
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-indigo-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{requests.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "pending" ? "ring-2 ring-amber-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("pending")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "approved" ? "ring-2 ring-emerald-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("approved")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {approvedCount}
            </p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "denied" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("denied")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{deniedCount}</p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">
                {filter === "all"
                  ? "All"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
                Requests
              </CardTitle>
              <CardDescription>
                {filteredRequests.length} of {requests.length} request
                {requests.length !== 1 ? "s" : ""} shown
                {activeFilters > 0 && (
                  <button
                    className="ml-2 text-xs text-primary hover:underline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilter("pending");
                      setSortBy("date");
                      setSortOrder("desc");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="rounded-xl text-xs h-9"
              onClick={handleClearOlder}
              disabled={clearingOlder}
            >
              {clearingOlder ? "Clearing..." : "Clear Older Requests"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Sort Bar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Search by name, college ID, or email..."
                className="rounded-xl pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [by, order] = v.split("-") as [
                    "name" | "college_id" | "date",
                    "asc" | "desc",
                  ];
                  setSortBy(by);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="rounded-xl text-xs h-9 w-[160px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A→Z</SelectItem>
                  <SelectItem value="name-desc">Name Z→A</SelectItem>
                  <SelectItem value="college_id-asc">ID A→Z</SelectItem>
                  <SelectItem value="college_id-desc">ID Z→A</SelectItem>
                </SelectContent>
              </Select>

              {activeFilters > 0 && (
                <button
                  className="text-xs text-primary hover:underline whitespace-nowrap"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("pending");
                    setSortBy("date");
                    setSortOrder("desc");
                  }}
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-muted-foreground">
                {requests.length === 0
                  ? "No requests found."
                  : "No requests match the current filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>College ID</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req, index) => (
                    <TableRow
                      key={req._id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openDetailDialog(req)}
                    >
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {req.name}
                            {req.reason && (
                              <span title="Has a message" className="text-muted-foreground">
                                💬
                              </span>
                            )}
                          </div>
                          {req.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[220px]">
                              {req.reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          {req.college_id}
                          {req.duplicateId && req.status === "pending" && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] px-1.5 py-0 text-orange-600 border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-700 animate-pulse"
                            >
                              ⚠ ID in use
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.stream ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-xs"
                          >
                            🎓 {req.stream.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.section ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-xs"
                          >
                            🏫 {req.section.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.semester ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-xs"
                          >
                            📅 Sem {req.semester}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Detail Dialog ─────────────────────────── */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) setSelectedRequest(null);
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Full access request information & actions
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {selectedRequest.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedRequest.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {statusBadge(selectedRequest.status)}
                    {selectedRequest.duplicateId && selectedRequest.status === "pending" && (
                      <Badge
                        variant="outline"
                        className="rounded-full text-[10px] px-1.5 py-0 text-orange-600 border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-700 animate-pulse"
                      >
                        ⚠ College ID already in use
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground">College ID</p>
                  <p className="text-sm font-medium font-mono">
                    {selectedRequest.college_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">
                    {selectedRequest.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stream</p>
                  <p className="text-sm font-medium">
                    {selectedRequest.stream
                      ? `🎓 ${selectedRequest.stream.name}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Section</p>
                  <p className="text-sm font-medium">
                    {selectedRequest.section
                      ? `🏫 ${selectedRequest.section.name}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Semester</p>
                  <p className="text-sm font-medium">
                    {selectedRequest.semester
                      ? `📅 Semester ${selectedRequest.semester}`
                      : "Not specified"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>

              {/* Reason / Message */}
              {selectedRequest.reason && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Message from Student
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex gap-3">
                      <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">
                        💬
                      </span>
                      <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-wrap">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Note (if already actioned) */}
              {selectedRequest.admin_note && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin Note
                  </p>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedRequest.admin_note}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedRequest.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => openActionDialog("approve")}
                      >
                        ✅ Approve & Create Account
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => openActionDialog("deny")}
                      >
                        ❌ Deny Request
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-xl text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ${selectedRequest.status !== "pending" ? "col-span-2" : "col-span-2"}`}
                    onClick={openDeleteDialog}
                  >
                    🗑 Delete Request
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDetailDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Action Dialog (Approve/Deny) ──────────── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalResult
                ? "Account Created!"
                : actionType === "approve"
                  ? "Approve Request"
                  : "Deny Request"}
            </DialogTitle>
            <DialogDescription>
              {approvalResult
                ? "A new user account has been created and an email has been sent."
                : actionType === "approve"
                  ? `Approve access for ${selectedRequest?.name} (${selectedRequest?.college_id})? This will create their account and email them a temporary password.`
                  : `Deny access for ${selectedRequest?.name} (${selectedRequest?.college_id})? They will be notified via email.`}
            </DialogDescription>
          </DialogHeader>

          {approvalResult ? (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">College ID:</span>
                  <span className="font-mono font-medium">
                    {approvalResult.collegeId}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Temp Password:</span>
                  <span className="font-mono font-bold">
                    {approvalResult.tempPassword}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email sent to:</span>
                  <span className="text-xs">{approvalResult.email}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                The student will be required to change their password on first
                login.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>
                  Admin Note{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  placeholder={
                    actionType === "approve"
                      ? "e.g. Welcome!"
                      : "e.g. Reason for denial..."
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {approvalResult ? (
              <Button
                className="rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(approvalResult.tempPassword);
                  toast.success("Password copied!");
                  setActionDialogOpen(false);
                }}
              >
                Copy Password & Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={`rounded-xl text-white ${
                    actionType === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                  onClick={handleAction}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : actionType === "approve"
                      ? "Approve & Create Account"
                      : "Deny Request"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Delete the access request from{" "}
              <strong>{selectedRequest?.name}</strong> (
              {selectedRequest?.college_id})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
