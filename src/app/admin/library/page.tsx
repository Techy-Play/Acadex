/**
 * @page AdminLibrary (/admin/library)
 * @description Admin library resource management (create, edit, filter, delete).
 */
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
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

/* ────────── Interfaces ────────── */

interface Subject {
  _id: string;
  name: string;
  semester?: number;
  stream?: { _id: string; name: string } | null;
}

interface SectionItem {
  _id: string;
  name: string;
}

interface LibraryResource {
  _id: string;
  title: string;
  description: string;
  fileUrl: string;
  semester: number;
  academicYear: string;
  resourceType: string;
  tags: string[];
  createdAt: string;
  subject: { _id: string; name: string; type?: string };
  section?: { _id: string; name: string } | null;
  sections?: { _id: string; name: string }[];
  uploadedBy?: { _id: string; name: string } | null;
}

const RESOURCE_TYPES = [
  { value: "notes", label: "📝 Notes" },
  { value: "assignments", label: "📋 Assignments" },
  { value: "practicals", label: "🧪 Practicals" },
  { value: "oldyearpapers", label: "📄 Old Year Papers" },
  { value: "reference", label: "📖 Reference" },
] as const;

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const typeLabel = (type: string) =>
  RESOURCE_TYPES.find((t) => t.value === type)?.label ?? type;

/* ────────── Page Component ────────── */

export default function ManageLibraryPage() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addSubject, setAddSubject] = useState("");
  const [addSemester, setAddSemester] = useState("");
  const [addYear, setAddYear] = useState("");
  const [addType, setAddType] = useState("");
  const [addTags, setAddTags] = useState("");
  const [addSections, setAddSections] = useState<string[]>([]);
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addStagedFile, setAddStagedFile] = useState<File | null>(null);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResource, setEditResource] = useState<LibraryResource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editType, setEditType] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editStagedFile, setEditStagedFile] = useState<File | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editSections, setEditSections] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteResource, setDeleteResource] = useState<LibraryResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicate overwrite state
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    fileName: string;
    mode: "add" | "edit";
  }>({ open: false, fileName: "", mode: "add" });

  /* ──── Fetchers ──── */

  const fetchResources = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSearch) params.set("search", filterSearch);
      if (filterSemester) params.set("semester", filterSemester);
      if (filterType) params.set("type", filterType);
      if (filterYear) params.set("year", filterYear);

      const res = await fetch(`/api/library?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setResources(data.resources || []);
    } catch {
      toast.error("Failed to fetch library resources");
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

  useEffect(() => {
    fetchSubjects();
    fetchSections();
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => fetchResources(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSearch, filterSemester, filterType, filterYear]);

  /* ──── Add Resource ──── */

  const executeAddResource = async (isOverwrite: boolean = false) => {
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
        const semesterName = String(subj?.semester || addSemester || "General");
        const subjectName = subj?.name || "General";
        const resourceType = "Library";

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

      const tagsArray = addTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle,
          description: addDescription,
          subject: addSubject,
          semester: parseInt(addSemester),
          academicYear: addYear,
          resourceType: addType,
          tags: tagsArray,
          fileUrl: finalFileUrl,
          sections: addSections,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add resource");
        return;
      }

      const resourceName = addTitle.trim() || addStagedFile?.name || "Library Resource";
      toast.success(`"${resourceName}" successfully uploaded!`);
      setAddTitle("");
      setAddDescription("");
      setAddSubject("");
      setAddSemester("");
      setAddYear("");
      setAddType("");
      setAddTags("");
      setAddSubject("");
      setAddFileUrl("");
      setAddStagedFile(null);
      setAddSections([]);
      setShowAddForm(false);
      fetchResources();
    } catch (err) {
      console.error("Add library resource error:", err);
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    void executeAddResource(false);
  };

  /* ──── Edit Resource ──── */

  const openEditDialog = (resource: LibraryResource) => {
    setEditResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description);
    setEditSubject(resource.subject._id);
    setEditSemester(String(resource.semester));
    setEditYear(resource.academicYear);
    setEditType(resource.resourceType);
    setEditTags(resource.tags.join(", "));
    setEditFileUrl(resource.fileUrl || "");
    setEditStagedFile(null);
    const initialSections = resource.sections && resource.sections.length > 0 
      ? resource.sections.map(s => s._id) 
      : resource.section ? [resource.section._id] : [];
    setEditSections(initialSections);
    setEditDialogOpen(true);
  };

  const executeEditResource = async (isOverwrite: boolean = false) => {
    if (!editResource) return;
    setSaving(true);

    let finalFileUrl = editFileUrl;

    try {
      if (editStagedFile) {
        const subj = subjects.find((s) => s._id === editSubject);
        const streamName = subj?.stream?.name || "General";
        const semesterName = String(subj?.semester || editSemester || "General");
        const subjectName = subj?.name || "General";
        const resourceType = "Library";

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

      const res = await fetch(`/api/library/${editResource._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          semester: parseInt(editSemester),
          academicYear: editYear,
          resourceType: editType,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          fileUrl: finalFileUrl,
          subject: editSubject,
          sections: editSections,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update resource");
        return;
      }

      const resourceName = editTitle.trim() || editStagedFile?.name || "Library Resource";
      toast.success(`"${resourceName}" successfully updated!`);
      setEditStagedFile(null);
      setEditDialogOpen(false);
      setEditResource(null);
      fetchResources();
    } catch (err) {
      console.error("Edit library resource error:", err);
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    void executeEditResource(false);
  };

  /* ──── Delete Resource ──── */

  const openDeleteDialog = (r: LibraryResource) => {
    setDeleteResource(r);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteResource) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/library/${deleteResource._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete resource");
        return;
      }

      toast.success("Resource deleted!");
      setResources(resources.filter((r) => r._id !== deleteResource._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteResource(null);
    }
  };

  /* ──── Render ──── */

  if (loading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground">
            {resources.length} resource{resources.length !== 1 ? "s" : ""} in
            library
          </p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Resource"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search title, description, tags…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="rounded-xl"
            />
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All semesters" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All semesters</SelectItem>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All types</SelectItem>
                {RESOURCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Academic year (e.g. 2024-25)"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Resource Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Library Resource</CardTitle>
            <CardDescription>
              Upload a resource with a file link (Google Drive, Dropbox, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Row 1 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addTitle">Title</Label>
                  <Input
                    id="addTitle"
                    placeholder="e.g. Unit 1 — Intro to AI"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
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
              </div>

              {/* Row 2 */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={addSemester}
                    onValueChange={setAddSemester}
                    required
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Pick semester" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    placeholder="e.g. 2024-25"
                    value={addYear}
                    onChange={(e) => setAddYear(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={addType}
                    onValueChange={setAddType}
                    required
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Resource type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadInput
                  value={addFileUrl}
                  onChange={setAddFileUrl}
                  onFileStaged={setAddStagedFile}
                  stagedFile={addStagedFile}
                  subjectName={subjects.find((s) => s._id === addSubject)?.name || "General"}
                  semester={subjects.find((s) => s._id === addSubject)?.semester || "General"}
                  resourceType="Library"
                  label="PDF Document / File"
                />
                <div className="space-y-2">
                  <Label htmlFor="addTags">Tags (comma-separated)</Label>
                  <Input
                    id="addTags"
                    placeholder="e.g. midterm, unit1, important"
                    value={addTags}
                    onChange={(e) => setAddTags(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addDescription">
                    Description (optional)
                  </Label>
                  <Input
                    id="addDescription"
                    placeholder="Brief description of the resource"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                {sections.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sections</Label>
                    <MultiSelect
                      options={sections.map(s => ({ label: `🏫 ${s.name}`, value: s._id }))}
                      selected={addSections}
                      onChange={setAddSections}
                      placeholder="Select sections (optional)"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={
                  addLoading || !addSubject || !addSemester || !addType || (!addFileUrl.trim() && !addStagedFile)
                }
              >
                {addLoading ? "Adding..." : "Add Resource"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Resource Table */}
      {resources.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No library resources yet. Click &ldquo;+ Add Resource&rdquo; to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              📚 All Resources
              <Badge variant="secondary" className="rounded-full text-xs">
                {resources.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {r.title}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.subject?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.semester}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full text-xs whitespace-nowrap"
                        >
                          {typeLabel(r.resourceType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.academicYear}
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        {r.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="rounded-full text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {r.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{r.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.sections && r.sections.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {r.sections.map(s => (
                              <Badge key={s._id} variant="outline" className="rounded-full text-xs">
                                🏫 {s.name}
                              </Badge>
                            ))}
                          </div>
                        ) : r.section ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-xs"
                          >
                            🏫 {r.section.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.uploadedBy?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          asChild
                        >
                          <Link
                            href={`/user/dashboard/viewer?url=${encodeURIComponent(r.fileUrl)}&title=${encodeURIComponent(r.title)}`}
                            target="_blank"
                          >
                            Open
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openEditDialog(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openDeleteDialog(r)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Resource Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update the library resource details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
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
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Semester</Label>
                <Select value={editSemester} onValueChange={setEditSemester}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <FileUploadInput
              value={editFileUrl}
              onChange={setEditFileUrl}
              onFileStaged={setEditStagedFile}
              stagedFile={editStagedFile}
              subjectName={subjects.find((s) => s._id === editSubject)?.name || "General"}
              semester={subjects.find((s) => s._id === editSubject)?.semester || "General"}
              resourceType="Library"
              label="PDF Document / File"
            />
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
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
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteResource?.title}
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
              {deleting ? "Deleting..." : "Delete Resource"}
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
                  void executeAddResource(true);
                } else {
                  void executeEditResource(true);
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
