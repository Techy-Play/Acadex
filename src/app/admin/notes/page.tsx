/**
 * @page AdminNotes (/admin/notes)
 * @description Admin CRUD for notes (create, edit, delete).
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

interface Note {
  _id: string;
  title: string;
  file_url: string;
  uploadedAt: string;
  subject: { _id: string; name: string; semester?: number };
  section?: { _id: string; name: string } | null;
  uploadedBy?: { _id: string; name: string } | null;
}

interface AdminNotesSavedFilters {
  selectedSubjectFilter?: string;
  selectedSectionFilter?: string;
  semesterFilter?: string;
}

const FILTER_KEY = "adminNotes";

export default function ManageNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
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
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addStagedFile, setAddStagedFile] = useState<File | null>(null);
  const [addSection, setAddSection] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editStagedFile, setEditStagedFile] = useState<File | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editSection, setEditSection] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = async () => {
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

      const url = params.toString() ? `/api/notes?${params.toString()}` : "/api/notes";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setNotes(data.notes || []);
    } catch {
      toast.error("Failed to fetch notes");
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

        const saved = (data.user?.savedFilters?.[FILTER_KEY] || {}) as AdminNotesSavedFilters;
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
    fetchNotes();
  }, [selectedSubjectFilter, selectedSectionFilter, semesterFilter, isSuperAdmin]);

  // ─── Add Note ───────────────────────────────────
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
        formData.append("semester", String(subj?.semester || "General"));
        formData.append("resourceType", "Notes");

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

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          file_url: finalFileUrl,
          ...(isSuperAdmin && addSection && { section: addSection }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add note");
        return;
      }

      toast.success("Note added successfully!");
      setAddTitle("");
      setAddFileUrl("");
      setAddStagedFile(null);
      setAddSubject("");
      setAddSection("");
      setShowAddForm(false);
      fetchNotes();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Edit Note ──────────────────────────────────
  const openEditDialog = (note: Note) => {
    setEditNote(note);
    setEditTitle(note.title);
    setEditFileUrl(note.file_url);
    setEditStagedFile(null);
    setEditSubject(note.subject._id);
    setEditSection(note.section?._id || "");
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editNote) return;
    setSaving(true);

    let finalFileUrl = editFileUrl;

    try {
      if (editStagedFile) {
        const formData = new FormData();
        formData.append("file", editStagedFile);
        const subj = subjects.find((s) => s._id === editSubject);
        formData.append("subjectName", subj?.name || "General");
        formData.append("semester", String(subj?.semester || "General"));
        formData.append("resourceType", "Notes");

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

      const res = await fetch(`/api/notes/${editNote._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          file_url: finalFileUrl,
          subject: editSubject,
          ...(editSection && { section: editSection }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update note");
        return;
      }

      toast.success("Note updated successfully!");
      setEditStagedFile(null);
      setEditDialogOpen(false);
      fetchNotes();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Note ────────────────────────────────
  const openDeleteDialog = (note: Note) => {
    setDeleteNote(note);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteNote) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/notes/${deleteNote._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete note");
        return;
      }

      toast.success("Note deleted!");
      setNotes(notes.filter((n) => n._id !== deleteNote._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteNote(null);
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
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} uploaded
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
            {showAddForm ? "Cancel" : "+ Add Note"}
          </Button>
        </div>
      </div>

      {/* Add Note Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Note</CardTitle>
            <CardDescription>
              Provide a link to the file (Google Drive, Dropbox, etc.)
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
                    placeholder="e.g. Unit 1 — Introduction to AI"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadInput
                  value={addFileUrl}
                  onChange={setAddFileUrl}
                  onFileStaged={setAddStagedFile}
                  stagedFile={addStagedFile}
                  subjectName={subjects.find((s) => s._id === addSubject)?.name || "General"}
                  semester={subjects.find((s) => s._id === addSubject)?.semester || "General"}
                  resourceType="Notes"
                  label="PDF Document / File"
                />
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
                disabled={addLoading || !addSubject || (!addFileUrl.trim() && !addStagedFile)}
              >
                {addLoading ? "Adding..." : "Add Note"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notes Grouped by Subject */}
      {notes.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No notes yet. Click &ldquo;+ Add Note&rdquo; above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const filtered = notes;

          if (filtered.length === 0) {
            return (
              <Card className="rounded-2xl">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No notes found for selected filters.
                  </p>
                </CardContent>
              </Card>
            );
          }

          const grouped: Record<string, Note[]> = {};
          for (const note of filtered) {
            const subjectName = note.subject?.name || "Unknown";
            if (!grouped[subjectName]) grouped[subjectName] = [];
            grouped[subjectName].push(note);
          }
          return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([subjectName, subjectNotes]) => (
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
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    📚 {subjectName}
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {subjectNotes.length}
                    </Badge>
                  </CardTitle>
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform ${(expandedSubjects[subjectName] ?? true) ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
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
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectNotes.map((note) => (
                        <TableRow
                          key={note._id}
                          className={note.file_url ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => {
                            if (note.file_url) {
                              window.open(
                                `/user/dashboard/viewer?url=${encodeURIComponent(note.file_url)}&title=${encodeURIComponent(note.title)}`,
                                "_blank"
                              );
                            }
                          }}
                        >
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {note.title}
                            {note.file_url && (
                              <span className="ml-2 text-xs text-primary">📄</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {note.section ? (
                              <Badge variant="outline" className="rounded-full text-xs">
                                🏫 {note.section.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {note.uploadedBy?.name || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(note.uploadedAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" className="rounded-lg" onClick={(e) => { e.stopPropagation(); openEditDialog(note); }}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="rounded-lg" onClick={(e) => { e.stopPropagation(); openDeleteDialog(note); }}>
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

      {/* Edit Note Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note details below.
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
            <FileUploadInput
              value={editFileUrl}
              onChange={setEditFileUrl}
              onFileStaged={setEditStagedFile}
              stagedFile={editStagedFile}
              subjectName={subjects.find((s) => s._id === editSubject)?.name || "General"}
              semester={subjects.find((s) => s._id === editSubject)?.semester || "General"}
              resourceType="Notes"
              label="PDF Document / File"
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
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteNote?.title}&rdquo;?
              This action cannot be undone.
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
              {deleting ? "Deleting..." : "Delete Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
