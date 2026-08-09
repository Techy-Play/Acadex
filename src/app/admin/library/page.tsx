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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/* ────────── Interfaces ────────── */

interface Subject {
  _id: string;
  name: string;
  semester?: number;
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
  subject: { _id: string; name: string };
  section?: { _id: string; name: string } | null;
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
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addStagedFile, setAddStagedFile] = useState<File | null>(null);
  const [addSection, setAddSection] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResource, setEditResource] = useState<LibraryResource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editType, setEditType] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editStagedFile, setEditStagedFile] = useState<File | null>(null);
  const [editSection, setEditSection] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteResource, setDeleteResource] = useState<LibraryResource | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalFileUrl = addFileUrl.trim();

    if (!finalFileUrl && !addStagedFile) {
      toast.error("PDF / File or custom URL is required");
      return;
    }

    setAddLoading(true);

    try {
      if (addStagedFile) {
        const formData = new FormData();
        formData.append("file", addStagedFile);
        const subj = subjects.find((s) => s._id === addSubject);
        formData.append("subjectName", subj?.name || "General");
        formData.append("semester", String(subj?.semester || addSemester || "General"));
        formData.append("resourceType", "Library");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload file.");
        }
        finalFileUrl = uploadData.fileUrl;
      }

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
          tags: addTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          fileUrl: finalFileUrl,
          ...(addSection && { section: addSection }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add resource");
        return;
      }

      toast.success("Library resource added!");
      setAddTitle("");
      setAddDescription("");
      setAddSubject("");
      setAddSemester("");
      setAddYear("");
      setAddType("");
      setAddTags("");
      setAddFileUrl("");
      setAddStagedFile(null);
      setAddSection("");
      setShowAddForm(false);
      fetchResources();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  /* ──── Edit Resource ──── */

  const openEditDialog = (r: LibraryResource) => {
    setEditResource(r);
    setEditTitle(r.title);
    setEditDescription(r.description);
    setEditSubject(r.subject._id);
    setEditSemester(String(r.semester));
    setEditYear(r.academicYear);
    setEditType(r.resourceType);
    setEditTags(r.tags.join(", "));
    setEditFileUrl(r.fileUrl);
    setEditStagedFile(null);
    setEditSection(r.section?._id || "");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editResource) return;
    setSaving(true);

    let finalFileUrl = editFileUrl;

    try {
      if (editStagedFile) {
        const formData = new FormData();
        formData.append("file", editStagedFile);
        const subj = subjects.find((s) => s._id === editSubject);
        formData.append("subjectName", subj?.name || "General");
        formData.append("semester", String(subj?.semester || editSemester || "General"));
        formData.append("resourceType", "Library");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload file.");
        }
        finalFileUrl = uploadData.fileUrl;
      }

      const res = await fetch(`/api/library/${editResource._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          subject: editSubject,
          semester: parseInt(editSemester),
          academicYear: editYear,
          resourceType: editType,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          fileUrl: finalFileUrl,
          ...(editSection && { section: editSection }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update resource");
        return;
      }

      toast.success("Resource updated!");
      setEditStagedFile(null);
      setEditDialogOpen(false);
      fetchResources();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
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
                    <Label>Section (Optional)</Label>
                    <Select
                      value={addSection}
                      onValueChange={setAddSection}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Auto (your section)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {sections.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            🏫 {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={
                  addLoading || !addSubject || !addSemester || !addType
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
                    <TableHead>Section</TableHead>
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
                        {r.section ? (
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
                <Label>Section</Label>
                <Select value={editSection} onValueChange={setEditSection}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="No section" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {sections.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        🏫 {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              disabled={saving || !editTitle || !editFileUrl}
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
    </div>
  );
}
