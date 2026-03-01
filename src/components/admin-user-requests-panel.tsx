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

interface UploadRequest {
  _id: string;
  type: "note" | "assignment" | "practical";
  requestKind?: "create" | "edit" | "delete";
  reqType?: "Upload" | "edit" | "remove";
  title: string;
  description: string;
  file_url: string;
  subject: { _id: string; name: string; semester?: number } | null;
  section: { _id: string; name: string } | null;
  uploadedBy: { _id: string; name: string; college_id: string } | null;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  reviewedBy: { _id: string; name: string } | null;
  createdAt: string;
}

interface UserData {
  isSuperAdmin?: boolean;
}

function normalizeRequestKind(value?: string): "create" | "edit" | "delete" {
  const normalized = (value || "").toLowerCase();
  if (normalized === "edit" || normalized === "update") return "edit";
  if (normalized === "delete" || normalized === "remove") return "delete";
  return "create";
}

function resolveRequestKind(
  requestKind?: string,
  reqType?: string
): "create" | "edit" | "delete" {
  const fromRequestKind = normalizeRequestKind(requestKind);
  const fromReqType = normalizeRequestKind(reqType);
  if (fromRequestKind === "delete" || fromReqType === "delete") return "delete";
  if (fromRequestKind === "edit" || fromReqType === "edit") return "edit";
  return "create";
}

export function AdminUserRequestsPanel() {
  const [uploads, setUploads] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterSemester, setFilterSemester] = useState<string>("all");

  const [reviewUpload, setReviewUpload] = useState<UploadRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch("/api/user-uploads");
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      }
    } catch {
      console.error("Failed to fetch user requests");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = (await meRes.json()) as { user?: UserData };
          setIsSuperAdmin(Boolean(meData.user?.isSuperAdmin));
        }
        await fetchUploads();
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchUploads]);

  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const upload of uploads) {
      if (upload.subject?._id && upload.subject?.name) {
        seen.set(upload.subject._id, upload.subject.name);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [uploads]);

  const semesterOptions = useMemo(() => {
    const set = new Set<number>();
    for (const upload of uploads) {
      const sem = upload.subject?.semester;
      if (sem && sem >= 1 && sem <= 8) set.add(sem);
    }
    return [...set].sort((a, b) => a - b);
  }, [uploads]);

  const filtered = uploads.filter((upload) => {
    if (filterType !== "all" && upload.type !== filterType) return false;
    if (filterStatus !== "all" && upload.status !== filterStatus) return false;

    if (!isSuperAdmin) {
      if (filterSubject !== "all" && upload.subject?._id !== filterSubject) return false;
    } else {
      if (filterSemester !== "all" && String(upload.subject?.semester || "") !== filterSemester) {
        return false;
      }
    }

    return true;
  });

  const counts = useMemo(() => {
    const pending = uploads.filter((upload) => upload.status === "pending").length;
    const approved = uploads.filter((upload) => upload.status === "approved").length;
    const denied = uploads.filter((upload) => upload.status === "denied").length;
    return { pending, approved, denied };
  }, [uploads]);

  const handleAction = async (uploadId: string, action: "approve" | "deny") => {
    setProcessing(uploadId);
    try {
      const res = await fetch("/api/user-uploads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          action,
          admin_note: adminNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action}`);
        return;
      }

      toast.success(action === "approve" ? "Request approved" : "Request denied");
      setReviewUpload(null);
      setAdminNote("");
      fetchUploads();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    try {
      const res = await fetch(`/api/user-uploads?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete request");
        return;
      }
      toast.success("Request deleted");
      setUploads((prev) => prev.filter((upload) => upload._id !== id));
    } catch {
      toast.error("Something went wrong");
    }
  };

  const typeLabel = (type: string) => {
    if (type === "note") return "Note";
    if (type === "assignment") return "Assignment";
    return "Practical";
  };

  const statusColor = (status: string) => {
    if (status === "approved") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (status === "denied") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  };

  const requestTypeLabel = (upload: UploadRequest) => {
    const normalized = resolveRequestKind(upload.requestKind, upload.reqType);
    if (normalized === "edit") return "Edit";
    if (normalized === "delete") return "Remove";
    return "Upload";
  };

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
      <div>
        <h1 className="text-2xl font-bold">User&apos;s Request panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and process student request types</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-semibold">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-semibold">{counts.approved}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Denied</p><p className="text-xl font-semibold">{counts.denied}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="practical">Practicals</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>

        {!isSuperAdmin && (
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isSuperAdmin && (
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesterOptions.map((semester) => (
                <SelectItem key={semester} value={String(semester)}>Semester {semester}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No user requests found for selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Request Type</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Section</th>
                  <th className="text-left p-3 font-medium">Uploaded By</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((upload) => (
                  <tr
                    key={upload._id}
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (upload.file_url) window.open(upload.file_url, "_blank");
                    }}
                  >
                    <td className="p-3">
                      <div className="font-medium">{upload.title}</div>
                      {upload.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{upload.description}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{typeLabel(upload.type)}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{requestTypeLabel(upload)}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{upload.subject?.name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{upload.section?.name || "—"}</td>
                    <td className="p-3">
                      {upload.uploadedBy ? (
                        <div>
                          <div className="text-xs font-medium">{upload.uploadedBy.name}</div>
                          <div className="text-xs text-muted-foreground">{upload.uploadedBy.college_id}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(upload.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-xs ${statusColor(upload.status)}`}>
                        {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                        {upload.status === "pending" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            disabled={processing === upload._id}
                            onClick={() => {
                              setReviewUpload(upload);
                              setAdminNote("");
                            }}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(upload._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={!!reviewUpload}
        onOpenChange={(open) => {
          if (!open) {
            setReviewUpload(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
            <DialogDescription>Approve to apply this request, or deny with feedback.</DialogDescription>
          </DialogHeader>

          {reviewUpload && (
            <div className="space-y-4 py-2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{reviewUpload.title}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{typeLabel(reviewUpload.type)}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span>{reviewUpload.subject?.name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Section</span><span>{reviewUpload.section?.name || "—"}</span></div>
              </div>

              <div className="space-y-1.5">
                <Label>Admin Note (optional)</Label>
                <Textarea
                  placeholder="Add a note for the student..."
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setReviewUpload(null); setAdminNote(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={!!processing} onClick={() => reviewUpload && handleAction(reviewUpload._id, "deny")}>{processing ? "..." : "Deny"}</Button>
            <Button disabled={!!processing} onClick={() => reviewUpload && handleAction(reviewUpload._id, "approve")}>{processing ? "..." : "Approve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
