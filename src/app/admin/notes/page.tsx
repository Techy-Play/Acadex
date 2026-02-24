"use client";

import { useEffect, useState } from "react";
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
}

interface Note {
  _id: string;
  title: string;
  file_url: string;
  uploadedAt: string;
  subject: { _id: string; name: string };
}

export default function ManageNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addFileUrl, setAddFileUrl] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
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

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
  }, []);

  // ─── Add Note ───────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          file_url: addFileUrl,
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
      setAddSubject("");
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
    setEditSubject(note.subject._id);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editNote) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/notes/${editNote._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          file_url: editFileUrl,
          subject: editSubject,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update note");
        return;
      }

      toast.success("Note updated successfully!");
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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Button
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Note"}
        </Button>
      </div>

      {/* Add Note Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-indigo-200 dark:border-indigo-800">
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
                  <Select value={addSubject} onValueChange={setAddSubject} required>
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
                    placeholder="e.g. Unit 1 — Introduction to AI"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addFileUrl">File URL</Label>
                <Input
                  id="addFileUrl"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={addFileUrl}
                  onChange={(e) => setAddFileUrl(e.target.value)}
                  required
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Use a shared Google Drive or Dropbox link so students can access it.
                </p>
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                disabled={addLoading || !addSubject}
              >
                {addLoading ? "Adding..." : "Add Note"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notes Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">All Notes</CardTitle>
          <CardDescription>
            Edit or delete notes. Students see these in their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No notes yet. Click &ldquo;+ Add Note&rdquo; above to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((note) => (
                    <TableRow key={note._id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {note.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {note.subject?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(note.uploadedAt).toLocaleDateString("en-IN", {
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
                          onClick={() => window.open(note.file_url, "_blank")}
                        >
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openEditDialog(note)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openDeleteDialog(note)}
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
              <Label>File URL</Label>
              <Input
                value={editFileUrl}
                onChange={(e) => setEditFileUrl(e.target.value)}
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
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
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
