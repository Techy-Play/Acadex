/**
 * @component AdminRequestsPanel
 * @description Admin panel for reviewing admin-role access requests.
 * Displays a filterable table of pending/reviewed requests with
 * approve/reject actions via a confirmation dialog.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PopulatedRef {
  _id: string;
  name: string;
  [key: string]: unknown;
}

interface Request {
  _id: string;
  action: "add" | "update" | "remove";
  resourceType: "note" | "assignment" | "practical";
  resourceId: string | null;
  title: string;
  description: string;
  file_url: string;
  subject: PopulatedRef & { semester?: number } | null;
  section: PopulatedRef | null;
  uploadedBy: PopulatedRef & { college_id?: string };
  status: "pending" | "approved" | "denied";
  reviewNote: string;
  reviewedBy: PopulatedRef | null;
  deadline: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ACTION_COLORS: Record<string, string> = {
  add: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  update: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  remove: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  approved: "bg-green-500/10 text-green-600 dark:text-green-400",
  denied: "bg-red-500/10 text-red-600 dark:text-red-400",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert Google Drive URL to embeddable /preview form */
function toEmbedUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch)
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return url;
}

/** Convert Google Drive URL to direct download URL */
function toDownloadUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match)
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch)
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  return url;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminRequestsPanel() {
  /* --- data --- */
  const [requests, setRequests] = useState<Request[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  /* --- filters --- */
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");

  /* --- review dialog --- */
  const [reviewTarget, setReviewTarget] = useState<Request | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetch                                                       */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const [meRes, reqRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/user-requests"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setIsSuperAdmin(meData.user?.isSuperAdmin ?? false);
      }

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  // Unique subject options from loaded requests
  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.subject) map.set(r.subject._id, r.subject.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  // Unique semester options from loaded requests (super-admin only)
  const semesterOptions = useMemo(() => {
    const set = new Set<number>();
    requests.forEach((r) => {
      const sem = (r.subject as PopulatedRef & { semester?: number })?.semester;
      if (sem) set.add(sem);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterAction !== "all" && r.action !== filterAction) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType !== "all" && r.resourceType !== filterType) return false;
      if (filterSubject !== "all" && r.subject?._id !== filterSubject)
        return false;
      if (filterSemester !== "all") {
        const sem = (r.subject as PopulatedRef & { semester?: number })
          ?.semester;
        if (String(sem) !== filterSemester) return false;
      }
      return true;
    });
  }, [
    requests,
    filterAction,
    filterStatus,
    filterType,
    filterSubject,
    filterSemester,
  ]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const openReview = (r: Request) => {
    setReviewTarget(r);
    setReviewNote("");
  };

  const handleDecision = async (decision: "approve" | "deny") => {
    if (!reviewTarget) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/user-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reviewTarget._id,
          decision,
          reviewNote: reviewNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        decision === "approve" ? "Request approved" : "Request denied"
      );
      setReviewTarget(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request record?")) return;
    try {
      const res = await fetch(`/api/user-requests?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success("Request deleted");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ header ============ */}
      <div>
        <h1 className="text-2xl font-bold">User Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and process student request types</p>
      </div>

      {/* ============ stats ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-semibold">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-semibold">{approvedCount}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Denied</p><p className="text-xl font-semibold">{deniedCount}</p></CardContent></Card>
      </div>

      {/* ============ filters ============ */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="add">Add</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="remove">Remove</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="assignment">Assignment</SelectItem>
            <SelectItem value="practical">Practical</SelectItem>
          </SelectContent>
        </Select>

        {!isSuperAdmin && (
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isSuperAdmin && (
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesterOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  Semester {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ============ requests table ============ */}
      <Card>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No requests found for selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{r.title}</span>
                          {r.status === "denied" && r.reviewNote && (
                            <p className="mt-1 text-xs text-red-500">
                              {r.reviewNote}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {r.resourceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${ACTION_COLORS[r.action] ?? ""}`}
                        >
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.subject?.name ?? "—"}</TableCell>
                      <TableCell>{r.section?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{r.uploadedBy?.name}</p>
                          {r.uploadedBy?.college_id && (
                            <p className="text-xs text-muted-foreground">
                              {r.uploadedBy.college_id}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${STATUS_COLORS[r.status] ?? ""}`}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReview(r)}
                            >
                              Review
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(r._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ review dialog ============ */}
      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(open) => !open && setReviewTarget(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {reviewTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  <span className="text-xl">{reviewTarget.title}</span>
                  <Badge
                    variant="outline"
                    className={`capitalize ${ACTION_COLORS[reviewTarget.action] ?? ""}`}
                  >
                    {reviewTarget.action}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`capitalize ${STATUS_COLORS[reviewTarget.status] ?? ""}`}
                  >
                    {reviewTarget.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Review the request details and file preview below, then
                  approve or deny.
                </DialogDescription>
              </DialogHeader>

              {/* -- details grid -- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Resource Type
                  </span>
                  <p className="capitalize">{reviewTarget.resourceType}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Subject
                  </span>
                  <p>{reviewTarget.subject?.name ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Section
                  </span>
                  <p>{reviewTarget.section?.name ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Submitted By
                  </span>
                  <p>
                    {reviewTarget.uploadedBy?.name}
                    {reviewTarget.uploadedBy?.college_id && (
                      <span className="text-muted-foreground ml-1">
                        ({reviewTarget.uploadedBy.college_id})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Date Submitted
                  </span>
                  <p>
                    {new Date(reviewTarget.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
                {reviewTarget.deadline && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Deadline
                    </span>
                    <p>
                      {new Date(reviewTarget.deadline).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                  </div>
                )}
                {reviewTarget.description && (
                  <div className="sm:col-span-2">
                    <span className="font-medium text-muted-foreground">
                      Description
                    </span>
                    <p className="whitespace-pre-wrap">
                      {reviewTarget.description}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* -- file preview -- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">File Preview</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(reviewTarget.file_url, "_blank")
                      }
                    >
                      Open in New Tab
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          toDownloadUrl(reviewTarget.file_url),
                          "_blank"
                        )
                      }
                    >
                      Download
                    </Button>
                  </div>
                </div>
                <div className="relative w-full rounded-lg border bg-muted/30 overflow-hidden" style={{ height: "400px" }}>
                  <iframe
                    src={toEmbedUrl(reviewTarget.file_url)}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="autoplay"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    title="File preview"
                  />
                </div>
              </div>

              <Separator />

              {/* -- review actions -- */}
              <div className="space-y-3">
                <div>
                  <Label>Review Message (optional)</Label>
                  <Textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add a message for the student…"
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  disabled={processing}
                  onClick={() => handleDecision("deny")}
                >
                  {processing ? "Processing…" : "Deny Request"}
                </Button>
                <Button
                  disabled={processing}
                  onClick={() => handleDecision("approve")}
                >
                  {processing ? "Processing…" : "Approve Request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
