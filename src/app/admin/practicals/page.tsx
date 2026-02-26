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
  createdAt: string;
  subject: { _id: string; name: string };
  section?: { _id: string; name: string } | null;
  uploadedBy?: { _id: string; name: string } | null;
}

export default function ManagePracticalsPage() {
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addSection, setAddSection] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPractical, setEditPractical] = useState<Practical | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
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
      const res = await fetch("/api/practicals");
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

  useEffect(() => {
    fetchPracticals();
    fetchSubjects();
    fetchSections();
  }, []);

  // ─── Add Practical ──────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/practicals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          description: addDescription || undefined,
          file_url: addFileUrl || undefined,
          ...(addSection && { section: addSection }),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practicals</h1>
          <p className="text-muted-foreground">
            {practicals.length} practical{practicals.length !== 1 ? "s" : ""}{" "}
            created
          </p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Practical"}
        </Button>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addFileUrl">PDF / File URL (Optional)</Label>
                  <Input
                    id="addFileUrl"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={addFileUrl}
                    onChange={(e) => setAddFileUrl(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                {sections.length > 0 && (
                  <div className="space-y-2">
                    <Label>Section (Optional)</Label>
                    <Select value={addSection} onValueChange={setAddSection}>
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
                disabled={addLoading || !addSubject}
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
          const grouped: Record<string, Practical[]> = {};
          for (const p of practicals) {
            const subjectName = p.subject?.name || "Unknown";
            if (!grouped[subjectName]) grouped[subjectName] = [];
            grouped[subjectName].push(p);
          }
          return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([subjectName, items]) => (
              <Card key={subjectName} className="rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">🧪 {subjectName}</CardTitle>
                    <Badge variant="secondary" className="rounded-full">
                      {items.length} practical{items.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>PDF</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {p.title}
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
                            <TableCell>
                              {p.file_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs"
                                  asChild
                                >
                                  <Link href={`/user/dashboard/viewer?url=${encodeURIComponent(p.file_url)}&title=${encodeURIComponent(p.title)}`} target="_blank">
                                    Open
                                  </Link>
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
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
                                onClick={() => openEditDialog(p)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-lg"
                                onClick={() => openDeleteDialog(p)}
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
