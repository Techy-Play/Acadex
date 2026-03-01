"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Subject {
  _id: string;
  name: string;
  semester?: number;
}

interface Section {
  _id: string;
  name: string;
}

interface Upload {
  _id: string;
  type: "note" | "assignment" | "practical";
  requestKind?: "create" | "edit" | "delete";
  reqType?: "Upload" | "edit" | "remove";
  resourceId?: string | null;
  title: string;
  description: string;
  file_url: string;
  subject: { _id: string; name: string } | null;
  section: { _id: string; name: string } | null;
  uploadedBy: { _id: string; name: string; college_id: string } | null;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  reviewedBy: { _id: string; name: string } | null;
  createdAt: string;
}

interface UserResource {
  _id: string;
  type: "note" | "assignment" | "practical";
  title: string;
  description: string;
  file_url: string;
  subject: { _id: string; name: string } | null;
  section: { _id: string; name: string } | null;
  createdAt: string;
}

interface UserData {
  role: string;
  isSuperAdmin?: boolean;
  section?: { id: string; name: string } | null;
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

export function UserMyUploadsPanel() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [yourUploads, setYourUploads] = useState<UserResource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [yourUploadTypeFilter, setYourUploadTypeFilter] = useState<string>("all");
  const [yourUploadSubjectFilter, setYourUploadSubjectFilter] = useState<string>("all");
  const [clearing, setClearing] = useState<"all" | "approved" | "denied" | null>(null);

  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Upload | null>(null);
  const [editReqSubmitting, setEditReqSubmitting] = useState(false);
  const [editReqTitle, setEditReqTitle] = useState("");
  const [editReqDescription, setEditReqDescription] = useState("");
  const [editReqFileUrl, setEditReqFileUrl] = useState("");
  const [editReqSubject, setEditReqSubject] = useState("");

  const [formType, setFormType] = useState<string>("note");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formDeadline, setFormDeadline] = useState("");

  const isAdmin = user?.role === "admin";

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch("/api/user-uploads");
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
        setYourUploads(data.yourUploads || []);
      }
    } catch {
      console.error("Failed to fetch uploads");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [uploadsRes, subjectsRes, meRes, sectionsRes] = await Promise.all([
          fetch("/api/user-uploads"),
          fetch("/api/subjects"),
          fetch("/api/auth/me"),
          fetch("/api/sections"),
        ]);

        if (uploadsRes.ok) {
          const data = await uploadsRes.json();
          setUploads(data.uploads || []);
          setYourUploads(data.yourUploads || []);
        }
        if (subjectsRes.ok) {
          const data = await subjectsRes.json();
          setSubjects(data.subjects || []);
        }
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user || null);
        }
        if (sectionsRes.ok) {
          const data = await sectionsRes.json();
          setSections(data.sections || []);
        }
      } catch {
        console.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const resetForm = () => {
    setFormType("note");
    setFormTitle("");
    setFormDescription("");
    setFormFileUrl("");
    setFormSubject("");
    setFormSection("");
    setFormDeadline("");
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formFileUrl.trim() || !formSubject) {
      toast.error("Title, File URL, and Subject are required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: formType,
        reqType: "Upload",
        title: formTitle.trim(),
        description: formDescription.trim(),
        file_url: formFileUrl.trim(),
        subject: formSubject,
      };

      if (isAdmin && user?.isSuperAdmin && formSection) {
        payload.section = formSection;
      }

      if (formType === "assignment" && formDeadline) {
        payload.deadline = formDeadline;
      }

      const res = await fetch("/api/user-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit");
        return;
      }

      toast.success("Upload request submitted for admin approval");
      resetForm();
      setShowUploadDialog(false);
      fetchUploads();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    try {
      const res = await fetch(`/api/user-uploads?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Request deleted");
        setUploads((prev) => prev.filter((upload) => upload._id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleBulkClear = async (mode: "all" | "approved" | "denied") => {
    const confirmText =
      mode === "all"
        ? "Clear all your requests?"
        : mode === "approved"
        ? "Clear all approved requests?"
        : "Clear all denied requests?";

    if (!confirm(confirmText)) return;

    setClearing(mode);
    try {
      const res = await fetch(`/api/user-uploads?mode=${mode}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to clear requests");
        return;
      }

      toast.success(`Removed ${data.deletedCount || 0} request(s)`);
      fetchUploads();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setClearing(null);
    }
  };

  const openEditRequestDialog = (upload: Upload) => {
    if (!upload.resourceId) {
      toast.error("This upload cannot be edited via request.");
      return;
    }
    setEditTarget(upload);
    setEditReqTitle(upload.title || "");
    setEditReqDescription(upload.description || "");
    setEditReqFileUrl(upload.file_url || "");
    setEditReqSubject(upload.subject?._id || "");
    setShowEditRequestDialog(true);
  };

  const handleSubmitEditRequest = async () => {
    if (!editTarget) return;
    if (!editReqTitle.trim() || !editReqFileUrl.trim() || !editReqSubject) {
      toast.error("Title, File URL, and Subject are required");
      return;
    }

    setEditReqSubmitting(true);
    try {
      const res = await fetch("/api/user-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editTarget.type,
          requestKind: "edit",
          reqType: "edit",
          resourceId: editTarget.resourceId,
          title: editReqTitle.trim(),
          description: editReqDescription.trim(),
          file_url: editReqFileUrl.trim(),
          subject: editReqSubject,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit edit request");
        return;
      }

      toast.success("Edit request submitted for admin approval");
      setShowEditRequestDialog(false);
      setEditTarget(null);
      fetchUploads();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEditReqSubmitting(false);
    }
  };

  const handleSubmitDeleteRequest = async (upload: Upload) => {
    if (!upload.resourceId) {
      toast.error("This upload cannot be removed via request.");
      return;
    }
    if (!confirm("Generate remove request for this resource?")) return;

    try {
      const res = await fetch("/api/user-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: upload.type,
          requestKind: "delete",
          reqType: "remove",
          resourceId: upload.resourceId,
          title: upload.title,
          description: upload.description || "",
          file_url: upload.file_url,
          subject: upload.subject?._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create remove request");
        return;
      }

      toast.success("Remove request submitted for admin approval");
      fetchUploads();
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

  const filteredRequests = uploads.filter((upload) => {
    if (filterType !== "all" && upload.type !== filterType) return false;
    if (filterStatus !== "all" && upload.status !== filterStatus) return false;
    if (filterSubject !== "all" && upload.subject?._id !== filterSubject) return false;
    return true;
  });

  const requestCounts = useMemo(() => {
    const pending = uploads.filter((upload) => upload.status === "pending").length;
    const approved = uploads.filter((upload) => upload.status === "approved").length;
    const denied = uploads.filter((upload) => upload.status === "denied").length;
    return { pending, approved, denied };
  }, [uploads]);

  const requestTypeLabel = (upload: Upload) => {
    const normalized = resolveRequestKind(upload.requestKind, upload.reqType);
    if (normalized === "edit") return "Edit";
    if (normalized === "delete") return "Remove";
    return "Upload";
  };

  const filteredYourUploads = yourUploads.filter((upload) => {
    if (yourUploadTypeFilter !== "all" && upload.type !== yourUploadTypeFilter) return false;
    if (yourUploadSubjectFilter !== "all" && upload.subject?._id !== yourUploadSubjectFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading uploads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My uploads panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and manage your request types</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>+ Upload</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-semibold">{requestCounts.pending}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-semibold">{requestCounts.approved}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Denied</p><p className="text-xl font-semibold">{requestCounts.denied}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="note">Notes</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="practical">Practicals</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleBulkClear("all")} disabled={clearing !== null}>
          {clearing === "all" ? "Clearing..." : "Clear All Requests"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleBulkClear("approved")} disabled={clearing !== null}>
          {clearing === "approved" ? "Clearing..." : "Clear Approved"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleBulkClear("denied")} disabled={clearing !== null}>
          {clearing === "denied" ? "Clearing..." : "Clear Denied"}
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
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
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((upload) => (
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
                      {upload.status === "denied" && upload.admin_note && (
                        <div className="text-xs text-red-500 mt-1">Admin note: {upload.admin_note}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{typeLabel(upload.type)}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{requestTypeLabel(upload)}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{upload.subject?.name || "—"}</td>
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
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(upload._id)}
                        >
                          Remove
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your uploads</CardTitle>
          <p className="text-sm text-muted-foreground">These are your uploaded resources. You can request edit or removal.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={yourUploadTypeFilter} onValueChange={setYourUploadTypeFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="practical">Practicals</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yourUploadSubjectFilter} onValueChange={setYourUploadSubjectFilter}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredYourUploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads found for selected filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredYourUploads.map((upload) => (
                <Card key={`your-upload-${upload._id}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => upload.file_url && window.open(upload.file_url, "_blank")}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{upload.title}</h3>
                          <Badge variant="outline" className="text-xs">{typeLabel(upload.type)}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {upload.subject && <span>Subject: {upload.subject.name}</span>}
                          {upload.section && <span>• Section: {upload.section.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openEditRequestDialog({
                              _id: upload._id,
                              type: upload.type,
                              title: upload.title,
                              description: upload.description,
                              file_url: upload.file_url,
                              subject: upload.subject,
                              section: upload.section,
                              uploadedBy: null,
                              status: "approved",
                              admin_note: "",
                              reviewedBy: null,
                              createdAt: upload.createdAt,
                              requestKind: "create",
                              resourceId: upload._id,
                            })
                          }
                        >
                          Request Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleSubmitDeleteRequest({
                              _id: upload._id,
                              type: upload.type,
                              title: upload.title,
                              description: upload.description,
                              file_url: upload.file_url,
                              subject: upload.subject,
                              section: upload.section,
                              uploadedBy: null,
                              status: "approved",
                              admin_note: "",
                              reviewedBy: null,
                              createdAt: upload.createdAt,
                              requestKind: "create",
                              resourceId: upload._id,
                            })
                          }
                        >
                          Request Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Upload Request</DialogTitle>
            <DialogDescription>Your upload will be reviewed by an admin before being published.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Chapter 5 - Data Structures" value={formTitle} onChange={(event) => setFormTitle(event.target.value)} maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && user?.isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section._id} value={section._id}>{section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>File URL *</Label>
              <Input placeholder="https://drive.google.com/..." value={formFileUrl} onChange={(event) => setFormFileUrl(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description (optional)" value={formDescription} onChange={(event) => setFormDescription(event.target.value)} rows={2} maxLength={1000} />
            </div>

            {formType === "assignment" && (
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input type="datetime-local" value={formDeadline} onChange={(event) => setFormDeadline(event.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowUploadDialog(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Edit Request</DialogTitle>
            <DialogDescription>Submit changes for admin approval. Existing resource stays live until approved.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editReqTitle} onChange={(event) => setEditReqTitle(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={editReqSubject} onValueChange={setEditReqSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File URL *</Label>
              <Input value={editReqFileUrl} onChange={(event) => setEditReqFileUrl(event.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={editReqDescription} onChange={(event) => setEditReqDescription(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitEditRequest} disabled={editReqSubmitting}>{editReqSubmitting ? "Submitting..." : "Submit Edit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
