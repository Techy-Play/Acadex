/**
 * @component UserRequestsPanel
 * @description Student-facing panel for submitting and tracking resource
 * requests (add/edit notes, assignments, practicals). Includes a dialog
 * form, status table, and an admin-side management tab for reviewing requests.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadInput } from "@/components/file-upload-input";
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
  subject: PopulatedRef | null;
  section: PopulatedRef | null;
  uploadedBy: PopulatedRef & { college_id?: string };
  status: "pending" | "approved" | "denied";
  reviewNote: string;
  reviewedBy: PopulatedRef | null;
  deadline: string | null;
  createdAt: string;
}

interface YourResource {
  _id: string;
  resourceType: "note" | "assignment" | "practical";
  title: string;
  description?: string;
  file_url: string;
  subject: PopulatedRef | null;
  createdAt: string;
}

interface SubjectOption {
  _id: string;
  name: string;
  semester: number;
}

interface SectionOption {
  _id: string;
  name: string;
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UserRequestsPanel() {
  /* --- data --- */
  const [requests, setRequests] = useState<Request[]>([]);
  const [yourResources, setYourResources] = useState<YourResource[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [user, setUser] = useState<{
    name: string;
    email: string | null;
    isSuperAdmin: boolean;
    section: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  /* --- filters (requests table) --- */
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  /* --- filters (your resources) --- */
  const [resFilterType, setResFilterType] = useState("all");
  const [resFilterSubject, setResFilterSubject] = useState("all");

  /* --- new request dialog --- */
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newRequestKind, setNewRequestKind] = useState<"upload" | "suggestion">("upload");
  const [formResourceType, setFormResourceType] = useState<string>("note");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [suggestionSubject, setSuggestionSubject] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* --- update request dialog --- */
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<YourResource | null>(null);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateFileUrl, setUpdateFileUrl] = useState("");
  const [updateSubject, setUpdateSubject] = useState("");

  /* --- clearing --- */
  const [clearing, setClearing] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetch                                                       */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, subRes, secRes, meRes] = await Promise.all([
        fetch("/api/user-requests"),
        fetch("/api/subjects"),
        fetch("/api/sections"),
        fetch("/api/auth/me"),
      ]);

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests ?? []);
        setYourResources(data.yourResources ?? []);
      }
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubjects(Array.isArray(subData) ? subData : subData.subjects ?? []);
      }
      if (secRes.ok) {
        const secData = await secRes.json();
        setSections(
          Array.isArray(secData) ? secData : secData.sections ?? []
        );
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser({
          name: meData.user?.name ?? "",
          email: meData.user?.email ?? null,
          isSuperAdmin: meData.user?.isSuperAdmin ?? false,
          section: meData.user?.section?.id ?? null,
        });
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
  /*  Filtered lists                                                   */
  /* ---------------------------------------------------------------- */

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterAction !== "all" && r.action !== filterAction) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterType !== "all" && r.resourceType !== filterType) return false;
      if (filterSubject !== "all" && r.subject?._id !== filterSubject)
        return false;
      return true;
    });
  }, [requests, filterAction, filterStatus, filterType, filterSubject]);

  const filteredResources = useMemo(() => {
    return yourResources.filter((r) => {
      if (resFilterType !== "all" && r.resourceType !== resFilterType)
        return false;
      if (resFilterSubject !== "all" && r.subject?._id !== resFilterSubject)
        return false;
      return true;
    });
  }, [yourResources, resFilterType, resFilterSubject]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  // Subject options derived from fetched subjects
  const subjectOptions = subjects;

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  /** Submit a new "add" request */
  const handleSubmitNew = async () => {
    if (!formTitle.trim() || !formFileUrl.trim() || !formSubject) {
      toast.error("Title, File URL, and Subject are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          resourceType: formResourceType,
          title: formTitle.trim(),
          description: formDescription.trim(),
          file_url: formFileUrl.trim(),
          subject: formSubject,
          section: formSection && formSection !== "all" ? formSection : undefined,
          deadline: formDeadline || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Request submitted!");
      setShowNewDialog(false);
      resetNewForm();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  /** Open update-request dialog */
  const openUpdateDialog = (resource: YourResource) => {
    setUpdateTarget(resource);
    setUpdateTitle(resource.title);
    setUpdateDescription(resource.description ?? "");
    setUpdateFileUrl(resource.file_url);
    setUpdateSubject(resource.subject?._id ?? "");
    setShowUpdateDialog(true);
  };

  /** Submit an "update" request */
  const handleSubmitUpdate = async () => {
    if (!updateTarget) return;
    if (!updateTitle.trim() || !updateFileUrl.trim() || !updateSubject) {
      toast.error("Title, File URL, and Subject are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          resourceType: updateTarget.resourceType,
          resourceId: updateTarget._id,
          title: updateTitle.trim(),
          description: updateDescription.trim(),
          file_url: updateFileUrl.trim(),
          subject: updateSubject,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Update request submitted!");
      setShowUpdateDialog(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  /** Submit a "remove" request */
  const handleSubmitRemove = async (resource: YourResource) => {
    if (!confirm(`Request removal of "${resource.title}"?`)) return;
    try {
      const res = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          resourceType: resource.resourceType,
          resourceId: resource._id,
          title: resource.title,
          description: resource.description ?? "",
          file_url: resource.file_url,
          subject: resource.subject?._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Remove request submitted!");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  /** Delete a request record */
  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Delete this request?")) return;
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

  /** Bulk clear */
  const handleBulkClear = async (mode: "all" | "approved" | "denied") => {
    const labels: Record<string, string> = {
      all: "all requests",
      approved: "approved requests",
      denied: "denied requests",
    };
    if (!confirm(`Clear ${labels[mode]}?`)) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/user-requests?mode=${mode}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success("Cleared successfully");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  const resetNewForm = () => {
    setNewRequestKind("upload");
    setFormResourceType("note");
    setFormTitle("");
    setFormDescription("");
    setFormFileUrl("");
    setFormSubject("");
    setFormSection("");
    setFormDeadline("");
    setSuggestionSubject("");
    setSuggestionMessage("");
  };

  /** Submit a suggestion/question message to admins */
  const handleSubmitSuggestion = async () => {
    if (!user?.name || !user?.email) {
      toast.error("Please update your profile email before sending a suggestion.");
      return;
    }
    if (!suggestionSubject.trim() || !suggestionMessage.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          subject: suggestionSubject.trim(),
          message: suggestionMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      toast.success("Your suggestion has been sent to admin.");
      setShowNewDialog(false);
      resetNewForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send suggestion");
    } finally {
      setSubmitting(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your resource submissions and manage requests</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>+ New Request</Button>
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

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectOptions.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ============ bulk clear ============ */}
      {requests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={clearing}
            onClick={() => handleBulkClear("all")}
          >
            Clear All ({requests.length})
          </Button>
          {approvedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={clearing}
              onClick={() => handleBulkClear("approved")}
            >
              Clear Approved ({approvedCount})
            </Button>
          )}
          {deniedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={clearing}
              onClick={() => handleBulkClear("denied")}
            >
              Clear Denied ({deniedCount})
            </Button>
          )}
        </div>
      )}

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
                          <button
                            className="text-left font-medium hover:underline"
                            onClick={() => window.open(r.file_url, "_blank")}
                          >
                            {r.title}
                          </button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteRequest(r._id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ your resources ============ */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Resources</h2>

        <div className="flex flex-wrap gap-3">
          <Select value={resFilterType} onValueChange={setResFilterType}>
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

          <Select value={resFilterSubject} onValueChange={setResFilterSubject}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredResources.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No resources found.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border">
            {filteredResources.map((r) => (
              <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{r.title}</h3>
                    <Badge variant="outline" className="capitalize shrink-0 text-xs">
                      {r.resourceType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {r.subject && <span>{r.subject.name}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `/user/dashboard/viewer?url=${encodeURIComponent(r.file_url)}&title=${encodeURIComponent(r.title)}`,
                        "_blank"
                      )
                    }
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openUpdateDialog(r)}
                  >
                    Request Update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleSubmitRemove(r)}
                  >
                    Request Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ new request dialog ============ */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Request</DialogTitle>
            <DialogDescription>
              Choose what you want to submit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Request Option</Label>
              <Select
                value={newRequestKind}
                onValueChange={(value) =>
                  setNewRequestKind(value as "upload" | "suggestion")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggestion">Suggestion / Question to Admin</SelectItem>
                  <SelectItem value="upload">Upload PDF (Needs Admin Approval)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRequestKind === "suggestion" ? (
              <>
                <div>
                  <Label>Subject *</Label>
                  <Input
                    value={suggestionSubject}
                    onChange={(e) => setSuggestionSubject(e.target.value)}
                    placeholder="e.g. Need notes for Unit 4"
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label>Message *</Label>
                  <Textarea
                    value={suggestionMessage}
                    onChange={(e) => setSuggestionMessage(e.target.value)}
                    placeholder="Write your suggestion or question for admin"
                    maxLength={2000}
                    rows={5}
                  />
                </div>
              </>
            ) : (
              <>
            <div>
              <Label>Resource Type</Label>
              <Select
                value={formResourceType}
                onValueChange={setFormResourceType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter title"
                maxLength={200}
              />
            </div>

            <div>
              <Label>Subject *</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user?.isSuperAdmin && (
              <div>
                <Label>Section (optional)</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FileUploadInput
              value={formFileUrl}
              onChange={setFormFileUrl}
              subjectName={subjects.find((s) => s._id === formSubject)?.name || "General"}
              resourceType={formResourceType === "assignment" ? "Assignments" : formResourceType === "practical" ? "Practicals" : "Notes"}
              label="PDF Document / File *"
            />

            <div>
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                maxLength={1000}
                rows={3}
              />
            </div>

            {formResourceType === "assignment" && (
              <div>
                <Label>Deadline</Label>
                <Input
                  type="datetime-local"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                />
              </div>
            )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewDialog(false);
                resetNewForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={
                newRequestKind === "suggestion"
                  ? handleSubmitSuggestion
                  : handleSubmitNew
              }
              disabled={submitting}
            >
              {submitting
                ? "Submitting…"
                : newRequestKind === "suggestion"
                  ? "Send to Admin"
                  : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ update request dialog ============ */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Update</DialogTitle>
            <DialogDescription>
              Edit the fields you want to change. At least one field must
              differ from the current resource.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <Label>Subject *</Label>
              <Select value={updateSubject} onValueChange={setUpdateSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FileUploadInput
              value={updateFileUrl}
              onChange={setUpdateFileUrl}
              subjectName={subjects.find((s) => s._id === updateSubject)?.name || "General"}
              resourceType={updateTarget?.resourceType ? String(updateTarget.resourceType) : "Notes"}
              label="PDF Document / File *"
            />

            <div>
              <Label>Description</Label>
              <Textarea
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitUpdate} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Update Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
