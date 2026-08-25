/**
 * @page AdminAssignments (/admin/assignments)
 * @description Admin CRUD for assignments (create, edit, delete, set deadlines).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FileUploadInput } from "@/components/file-upload-input";
import { SearchableSelect } from "@/components/searchable-select";
import { uploadFileDirectToDestination } from "@/lib/direct-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/multi-select";

interface Subject {
  _id: string;
  name: string;
  semester: number;
  stream?: { _id: string; name: string } | null;
}

interface SectionItem {
  _id: string;
  name: string;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  file_url: string;
  deadline: string | null;
  createdAt: string;
  subject: { _id: string; name: string; semester?: number };
  section?: { _id: string; name: string } | null;
  sections?: { _id: string; name: string }[];
  uploadedBy?: { _id: string; name: string } | null;
}

interface AdminAssignmentsSavedFilters {
  selectedSubjectFilter?: string;
  selectedSectionFilter?: string;
  semesterFilter?: string;
}

const FILTER_KEY = "adminAssignments";

export default function ManageAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all");
  const [userSectionId, setUserSectionId] = useState<string>("");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const saveFiltersTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addStagedFile, setAddStagedFile] = useState<File | null>(null);
  const [addDeadline, setAddDeadline] = useState("");
  const [addSections, setAddSections] = useState<string[]>([]);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editStagedFile, setEditStagedFile] = useState<File | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editSections, setEditSections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicate overwrite state
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    fileName: string;
    mode: "add" | "edit";
  }>({ open: false, fileName: "", mode: "add" });

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSubjectFilter !== "all") {
        params.set("subject", selectedSubjectFilter);
      }
      if (selectedSectionFilter === "all") {
        params.set("section", "all");
      } else if (selectedSectionFilter !== "my-section" && selectedSectionFilter) {
        params.set("section", selectedSectionFilter);
      }
      if (isSuperAdmin && semesterFilter !== "all") {
        params.set("semester", semesterFilter);
      }

      const url = params.toString()
        ? `/api/assignments?${params.toString()}`
        : "/api/assignments";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setAssignments(data.assignments || []);
    } catch {
      toast.error("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      if (res.ok) setSubjects(data.subjects || []);
    } catch {
      // silent
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/sections");
      const data = await res.json();
      if (res.ok) setSections(data.sections || []);
    } catch {
      // silent
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok) {
        const superAdmin = Boolean(data.user?.isSuperAdmin);
        setIsSuperAdmin(superAdmin);
        const sectionId = data.user?.section?.id || "";
        setUserSectionId(sectionId);

        const saved = (data.user?.savedFilters?.[FILTER_KEY] || {}) as AdminAssignmentsSavedFilters;
        if (typeof saved.selectedSubjectFilter === "string") {
          setSelectedSubjectFilter(saved.selectedSubjectFilter);
        }
        if (typeof saved.selectedSectionFilter === "string") {
          setSelectedSectionFilter(saved.selectedSectionFilter);
        } else {
          setSelectedSectionFilter(superAdmin ? "all" : "my-section");
        }
        if (typeof saved.semesterFilter === "string") {
          setSemesterFilter(saved.semesterFilter);
        }
      }
    } catch {
      setIsSuperAdmin(false);
    } finally {
      setFiltersHydrated(true);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchSections();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;

    if (saveFiltersTimerRef.current) {
      clearTimeout(saveFiltersTimerRef.current);
    }

    saveFiltersTimerRef.current = setTimeout(() => {
      void fetch("/api/profile/update-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedFilters: {
            [FILTER_KEY]: {
              selectedSubjectFilter,
              selectedSectionFilter,
              semesterFilter,
            },
          },
        }),
      });
    }, 350);

    return () => {
      if (saveFiltersTimerRef.current) {
        clearTimeout(saveFiltersTimerRef.current);
      }
    };
  }, [filtersHydrated, selectedSubjectFilter, selectedSectionFilter, semesterFilter]);

  useEffect(() => {
    fetchAssignments();
  }, [selectedSubjectFilter, selectedSectionFilter, semesterFilter, isSuperAdmin]);

  // ─── Add Assignment ─────────────────────────────
  const executeAddAssignment = async (isOverwrite: boolean = false) => {
    let finalFileUrl = addFileUrl.trim();

    if (!finalFileUrl && !addStagedFile) {
      toast.error("PDF / File or custom URL is required");
      return;
    }

    setAddLoading(true);

    try {
      if (addStagedFile) {
        const subj = subjects.find((s) => s._id === addSubject);
        const streamName = subj?.stream?.name || "General";
        const semesterName = String(subj?.semester || "General");
        const subjectName = subj?.name || "General";
        const resourceType = "Assignments";

        if (!isOverwrite) {
          const checkRes = await fetch("/api/upload/check-duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: addStagedFile.name,
              streamName,
              semester: semesterName,
              subjectName,
              resourceType,
            }),
          });
          const checkData = await checkRes.json();
          if (checkData.exists) {
            setDuplicateDialog({
              open: true,
              fileName: addStagedFile.name,
              mode: "add",
            });
            setAddLoading(false);
            return;
          }
        }

        if (addStagedFile.size > 4 * 1024 * 1024) {
          const { fileUrl } = await uploadFileDirectToDestination({
            file: addStagedFile,
            streamName,
            semester: semesterName,
            subjectName,
            resourceType,
            overwrite: isOverwrite,
          });
          finalFileUrl = fileUrl;
        } else {
          const formData = new FormData();
          formData.append("file", addStagedFile);
          formData.append("streamName", streamName);
          formData.append("subjectName", subjectName);
          formData.append("semester", semesterName);
          formData.append("resourceType", resourceType);
          if (isOverwrite) formData.append("overwrite", "true");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          let uploadData: any = {};
          try {
            uploadData = await uploadRes.json();
          } catch {
            throw new Error(`Upload failed with server status ${uploadRes.status}`);
          }

          if (!uploadRes.ok) {
            throw new Error(uploadData.error || "Failed to upload file.");
          }
          finalFileUrl = uploadData.fileUrl;
        }
      }

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          description: addDescription || undefined,
          file_url: finalFileUrl,
          deadline: addDeadline || null,
          ...(isSuperAdmin && addSections.length > 0 && { sections: addSections }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add assignment");
        return;
      }

      const resourceName = addTitle.trim() || addStagedFile?.name || "Assignment";
      toast.success(`"${resourceName}" successfully uploaded!`);
      setAddTitle("");
      setAddDescription("");
      setAddFileUrl("");
      setAddStagedFile(null);
      setAddSubject("");
      setAddSections([]);
      setShowAddForm(false);
      fetchAssignments();
    } catch (err) {
      console.error("Add assignment error:", err);
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    void executeAddAssignment(false);
  };

  // ─── Edit Assignment ────────────────────────────
  const openEditDialog = (a: Assignment) => {
    setEditAssignment(a);
    setEditTitle(a.title);
    setEditDescription(a.description || "");
    setEditFileUrl(a.file_url || "");
    setEditStagedFile(null);
    setEditSubject(a.subject._id);
    const initialSections = a.sections && a.sections.length > 0 
      ? a.sections.map(s => s._id) 
      : a.section ? [a.section._id] : [];
    setEditSections(initialSections);
    setEditDeadline(
      a.deadline ? new Date(a.deadline).toISOString().split('T')[0] : ""
    );
    setEditDialogOpen(true);
  };

  const executeEditAssignment = async (isOverwrite: boolean = false) => {
    if (!editAssignment) return;
    setSaving(true);

    let finalFileUrl = editFileUrl;

    try {
      if (editStagedFile) {
        const subj = subjects.find((s) => s._id === editSubject);
        const streamName = subj?.stream?.name || "General";
        const semesterName = String(subj?.semester || "General");
        const subjectName = subj?.name || "General";
        const resourceType = "Assignments";

        if (!isOverwrite) {
          const checkRes = await fetch("/api/upload/check-duplicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: editStagedFile.name,
              streamName,
              semester: semesterName,
              subjectName,
              resourceType,
            }),
          });
          const checkData = await checkRes.json();
          if (checkData.exists) {
            setDuplicateDialog({
              open: true,
              fileName: editStagedFile.name,
              mode: "edit",
            });
            setSaving(false);
            return;
          }
        }

        if (editStagedFile.size > 4 * 1024 * 1024) {
          const { fileUrl } = await uploadFileDirectToDestination({
            file: editStagedFile,
            streamName,
            semester: semesterName,
            subjectName,
            resourceType,
            overwrite: isOverwrite,
          });
          finalFileUrl = fileUrl;
        } else {
          const formData = new FormData();
          formData.append("file", editStagedFile);
          formData.append("streamName", streamName);
          formData.append("subjectName", subjectName);
          formData.append("semester", semesterName);
          formData.append("resourceType", resourceType);
          if (isOverwrite) formData.append("overwrite", "true");

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          let uploadData: any = {};
          try {
            uploadData = await uploadRes.json();
          } catch {
            throw new Error(`Upload failed with server status ${uploadRes.status}`);
          }

          if (!uploadRes.ok) {
            throw new Error(uploadData.error || "Failed to upload file.");
          }
          finalFileUrl = uploadData.fileUrl;
        }
      }

      const res = await fetch(`/api/assignments/${editAssignment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          file_url: finalFileUrl,
          deadline: editDeadline || null,
          subject: editSubject,
          sections: editSections,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update assignment");
        return;
      }

      const resourceName = editTitle.trim() || editStagedFile?.name || "Assignment";
      toast.success(`"${resourceName}" successfully updated!`);
      setEditDialogOpen(false);
      setEditAssignment(null);
      fetchAssignments();
    } catch (err) {
      console.error("Edit assignment error:", err);
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    void executeEditAssignment(false);
  };

  // ─── Delete Assignment ──────────────────────────
  const openDeleteDialog = (a: Assignment) => {
    setDeleteAssignment(a);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteAssignment) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/assignments/${deleteAssignment._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete assignment");
        return;
      }

      toast.success("Assignment deleted!");
      setAssignments(assignments.filter((a) => a._id !== deleteAssignment._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteAssignment(null);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
            <SelectTrigger className="w-[170px] rounded-xl">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSectionFilter} onValueChange={setSelectedSectionFilter}>
            <SelectTrigger className="w-[170px] rounded-xl">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {!isSuperAdmin && userSectionId && (
                <SelectItem value="my-section">My Section</SelectItem>
              )}
              <SelectItem value="all">All Sections</SelectItem>
              {sections
                .filter((s) => !userSectionId || s._id !== userSectionId)
                .map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    🏫 {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {isSuperAdmin && (
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "+ Add Assignment"}
          </Button>
        </div>
      </div>

      {/* Add Assignment Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Assignment</CardTitle>
            <CardDescription>
              Students will see this on their dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addSubject">Subject</Label>
                  <SearchableSelect
                    value={addSubject}
                    onValueChange={setAddSubject}
                    options={subjects.map((s) => ({
                      value: s._id,
                      label: s.name,
                      sublabel: s.semester ? `Semester ${s.semester}` : undefined,
                    }))}
                    placeholder="Select a subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addTitle">Title</Label>
                  <Input
                    id="addTitle"
                    placeholder="e.g. Assignment 1 — ER Diagrams"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addDescription">Description (Optional)</Label>
                <textarea
                  id="addDescription"
                  placeholder="Add any details about the assignment..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadInput
                  value={addFileUrl}
                  onChange={setAddFileUrl}
                  onFileStaged={setAddStagedFile}
                  stagedFile={addStagedFile}
                  subjectName={subjects.find((s) => s._id === addSubject)?.name || "General"}
                  semester={subjects.find((s) => s._id === addSubject)?.semester || "General"}
                  resourceType="Assignments"
                  label="PDF Document / File"
                />
                <div className="space-y-2">
                  <Label htmlFor="addDeadline">Deadline (Optional)</Label>
                  <Input
                    id="addDeadline"
                    type="date"
                    value={addDeadline}
                    onChange={(e) => setAddDeadline(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {isSuperAdmin && sections.length > 0 ? (
                <div className="space-y-2">
                  <Label>Sections</Label>
                  <MultiSelect
                    options={sections.map(s => ({ label: `🏫 ${s.name}`, value: s._id }))}
                    selected={addSections}
                    onChange={setAddSections}
                    placeholder="Select sections (optional)"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input
                    value="Auto (your section)"
                    disabled
                    className="rounded-xl w-full sm:w-[200px]"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={addLoading || !addSubject || (!addFileUrl.trim() && !addStagedFile)}
              >
                {addLoading ? "Adding..." : "Add Assignment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assignments grouped by Subject */}
      {assignments.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No assignments yet. Click &ldquo;+ Add Assignment&rdquo; above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const filtered = assignments;

          if (filtered.length === 0) {
            return (
              <Card className="rounded-2xl">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No assignments found for selected filters.
                  </p>
                </CardContent>
              </Card>
            );
          }

          const grouped: Record<string, Assignment[]> = {};
          for (const a of filtered) {
            const subjectName = a.subject?.name || "Unknown";
            if (!grouped[subjectName]) grouped[subjectName] = [];
            grouped[subjectName].push(a);
          }
          return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([subjectName, items]) => (
              <Card key={subjectName} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 text-left"
                    onClick={() =>
                      setExpandedSubjects((prev) => ({
                        ...prev,
                        [subjectName]: !(prev[subjectName] ?? true),
                      }))
                    }
                  >
                    <CardTitle className="text-lg">📝 {subjectName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {items.length} assignment{items.length !== 1 ? "s" : ""}
                      </Badge>
                      <svg
                        className={`h-4 w-4 text-muted-foreground transition-transform ${(expandedSubjects[subjectName] ?? true) ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                </CardHeader>
                {(expandedSubjects[subjectName] ?? true) && (
                  <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((a) => {
                          const isOverdue = a.deadline
                            ? new Date(a.deadline) < new Date()
                            : false;
                          return (
                            <TableRow
                              key={a._id}
                              className={a.file_url ? "cursor-pointer hover:bg-muted/50" : ""}
                              onClick={() => {
                                if (a.file_url) {
                                  window.open(
                                    `/user/dashboard/viewer?url=${encodeURIComponent(a.file_url)}&title=${encodeURIComponent(a.title)}`,
                                    "_blank"
                                  );
                                }
                              }}
                            >
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {a.title}
                                {a.file_url && (
                                  <span className="ml-2 text-xs text-primary">📄</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {a.sections && a.sections.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {a.sections.map(s => (
                                      <Badge key={s._id} variant="outline" className="rounded-full text-xs">
                                        🏫 {s.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : a.section ? (
                                  <Badge variant="outline" className="rounded-full text-xs">
                                    🏫 {a.section.name}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {a.uploadedBy?.name || <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {a.deadline ? (
                                  <Badge
                                    variant={isOverdue ? "destructive" : "outline"}
                                    className="rounded-full text-xs"
                                  >
                                    {isOverdue ? "Overdue" : "Due"}:{" "}
                                    {new Date(a.deadline).toLocaleDateString("en-IN", {
                                      month: "short",
                                      day: "numeric",
                                      timeZone: "UTC"
                                    })}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(a.createdAt).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(a); }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); openDeleteDialog(a); }}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ));
        })()
      )}

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <SearchableSelect
                value={editSubject}
                onValueChange={setEditSubject}
                options={subjects.map((s) => ({
                  value: s._id,
                  label: s.name,
                  sublabel: s.semester ? `Semester ${s.semester}` : undefined,
                }))}
                placeholder="Select a subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <FileUploadInput
              value={editFileUrl}
              onChange={setEditFileUrl}
              onFileStaged={setEditStagedFile}
              stagedFile={editStagedFile}
              subjectName={subjects.find((s) => s._id === editSubject)?.name || "General"}
              semester={subjects.find((s) => s._id === editSubject)?.semester || "General"}
              resourceType="Assignments"
              label="PDF Document / File"
            />
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {sections.length > 0 && (
              <div className="space-y-2">
                <Label>Sections</Label>
                <MultiSelect
                  options={sections.map(s => ({ label: `🏫 ${s.name}`, value: s._id }))}
                  selected={editSections}
                  onChange={setEditSections}
                  placeholder="No sections"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleEdit}
              disabled={saving || !editTitle || (!editFileUrl && !editStagedFile)}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteAssignment?.title}
              &rdquo;? This action cannot be undone.
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
              {deleting ? "Deleting..." : "Delete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate File Overwrite Confirmation Dialog */}
      <Dialog
        open={duplicateDialog.open}
        onOpenChange={(val) =>
          setDuplicateDialog((prev) => ({ ...prev, open: val }))
        }
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Duplicate File Detected</DialogTitle>
            <DialogDescription>
              A file named &ldquo;{duplicateDialog.fileName}&rdquo; already exists in this subject folder. Do you want to overwrite it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDuplicateDialog({ open: false, fileName: "", mode: "add" })}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const mode = duplicateDialog.mode;
                setDuplicateDialog({ open: false, fileName: "", mode: "add" });
                if (mode === "add") {
                  void executeAddAssignment(true);
                } else {
                  void executeEditAssignment(true);
                }
              }}
            >
              Overwrite File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
