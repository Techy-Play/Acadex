/**
 * @page AdminPracticals (/admin/practicals)
 * @description Admin CRUD for practicals (create, edit, delete).
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Subject {
  _id: string;
  name: string;
  semester: number;
}

interface SectionItem {
  _id: string;
  name: string;
}

interface Practical {
  _id: string;
  title: string;
  description: string;
  file_url: string;
  deadline?: string | null;
  createdAt: string;
  subject: { _id: string; name: string; semester?: number };
  section?: { _id: string; name: string } | null;
  uploadedBy?: { _id: string; name: string } | null;
}

interface AdminPracticalsSavedFilters {
  selectedSubjectFilter?: string;
  selectedSectionFilter?: string;
  semesterFilter?: string;
}

const FILTER_KEY = "adminPracticals";

export default function ManagePracticalsPage() {
  const [practicals, setPracticals] = useState<Practical[]>([]);
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
  const [addDeadline, setAddDeadline] = useState("");
  const [addSection, setAddSection] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPractical, setEditPractical] = useState<Practical | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSection, setEditSection] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePractical, setDeletePractical] = useState<Practical | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fetchPracticals = async () => {
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
        ? `/api/practicals?${params.toString()}`
        : "/api/practicals";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setPracticals(data.practicals || []);
    } catch {
      toast.error("Failed to fetch practicals");
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

        const saved = (data.user?.savedFilters?.[FILTER_KEY] || {}) as AdminPracticalsSavedFilters;
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
    fetchPracticals();
  }, [selectedSubjectFilter, selectedSectionFilter, semesterFilter, isSuperAdmin]);

  // ─── Add Practical ──────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addFileUrl.trim()) {
      toast.error("PDF / File URL is required");
      return;
    }

    setAddLoading(true);

    try {
      const res = await fetch("/api/practicals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          description: addDescription || undefined,
          file_url: addFileUrl.trim(),
          deadline: addDeadline || null,
          ...(isSuperAdmin && addSection && { section: addSection }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add practical");
        return;
      }

      toast.success("Practical added successfully!");
      setAddTitle("");
      setAddDescription("");
      setAddFileUrl("");
      setAddDeadline("");
      setAddSubject("");
      setAddSection("");
      setShowAddForm(false);
      fetchPracticals();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Edit Practical ─────────────────────────────
  const openEditDialog = (p: Practical) => {
    setEditPractical(p);
    setEditTitle(p.title);
    setEditDescription(p.description || "");
    setEditFileUrl(p.file_url || "");
    setEditDeadline(
      p.deadline ? new Date(p.deadline).toISOString().slice(0, 16) : ""
    );
    setEditSubject(p.subject._id);
    setEditSection(p.section?._id || "");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editPractical) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/practicals/${editPractical._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          file_url: editFileUrl,
          deadline: editDeadline || null,
          subject: editSubject,
          ...(editSection && { section: editSection }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update practical");
        return;
      }

      toast.success("Practical updated successfully!");
      setEditDialogOpen(false);
      fetchPracticals();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Practical ───────────────────────────
  const openDeleteDialog = (p: Practical) => {
    setDeletePractical(p);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletePractical) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/practicals/${deletePractical._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete practical");
        return;
      }

      toast.success("Practical deleted!");
      setPracticals(
        practicals.filter((p) => p._id !== deletePractical._id)
      );
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletePractical(null);
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
          <h1 className="text-2xl font-bold tracking-tight">Practicals</h1>
          <p className="text-muted-foreground">
            {practicals.length} practical{practicals.length !== 1 ? "s" : ""}{" "}
            created
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
            {showAddForm ? "Cancel" : "+ Add Practical"}
          </Button>
        </div>
      </div>

      {/* Add Practical Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Practical</CardTitle>
            <CardDescription>
              Students will see this on their dashboard with a completion
              checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addSubject">Subject</Label>
                  <Select
                    value={addSubject}
                    onValueChange={setAddSubject}
                    required
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {subjects.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addTitle">Title</Label>
                  <Input
                    id="addTitle"
                    placeholder="e.g. Practical 1 — SQL Joins"
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
                  placeholder="Add any details about the practical..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="addFileUrl">PDF / File URL</Label>
                  <Input
                    id="addFileUrl"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={addFileUrl}
                    onChange={(e) => setAddFileUrl(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addDeadline">Deadline (Optional)</Label>
                  <Input
                    id="addDeadline"
                    type="datetime-local"
                    value={addDeadline}
                    onChange={(e) => setAddDeadline(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                {isSuperAdmin && sections.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={addSection} onValueChange={setAddSection}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select section (optional)" />
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
                ) : (
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Input
                      value="Auto (your section)"
                      disabled
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={addLoading || !addSubject || !addFileUrl.trim()}
              >
                {addLoading ? "Adding..." : "Add Practical"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Practicals grouped by Subject */}
      {practicals.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No practicals yet. Click &ldquo;+ Add Practical&rdquo; above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const filtered = practicals;

          if (filtered.length === 0) {
            return (
              <Card className="rounded-2xl">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No practicals found for selected filters.
                  </p>
                </CardContent>
              </Card>
            );
          }

          const grouped: Record<string, Practical[]> = {};
          for (const p of filtered) {
            const subjectName = p.subject?.name || "Unknown";
            if (!grouped[subjectName]) grouped[subjectName] = [];
            grouped[subjectName].push(p);
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
                    <CardTitle className="text-lg">🧪 {subjectName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {items.length} practical{items.length !== 1 ? "s" : ""}
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
                          <TableHead>Deadline</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((p) => (
                          <TableRow
                            key={p._id}
                            className={p.file_url ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => {
                              if (p.file_url) {
                                window.open(
                                  `/user/dashboard/viewer?url=${encodeURIComponent(p.file_url)}&title=${encodeURIComponent(p.title)}`,
                                  "_blank"
                                );
                              }
                            }}
                          >
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {p.title}
                              {p.file_url && (
                                <span className="ml-2 text-xs text-primary">📄</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.deadline ? (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                  {new Date(p.deadline).toLocaleString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.section ? (
                                <Badge variant="outline" className="rounded-full text-xs">
                                  🏫 {p.section.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {p.uploadedBy?.name || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString("en-IN", {
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
                                onClick={(e) => { e.stopPropagation(); openEditDialog(p); }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-lg"
                                onClick={(e) => { e.stopPropagation(); openDeleteDialog(p); }}
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
                )}
              </Card>
            ));
        })()
      )}

      {/* Edit Practical Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Practical</DialogTitle>
            <DialogDescription>
              Update the practical details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={editSubject} onValueChange={setEditSubject}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label>PDF / File URL</Label>
              <Input
                value={editFileUrl}
                onChange={(e) => setEditFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Deadline (Optional)</Label>
              <Input
                type="datetime-local"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="rounded-xl"
              />
            </div>
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
              disabled={saving || !editTitle}
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
            <DialogTitle>Delete Practical</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletePractical?.title}
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
              {deleting ? "Deleting..." : "Delete Practical"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
