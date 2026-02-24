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

interface Assignment {
  _id: string;
  title: string;
  description: string;
  file_url: string;
  deadline: string | null;
  createdAt: string;
  subject: { _id: string; name: string };
}

export default function ManageAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSubject, setAddSubject] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addFileUrl, setAddFileUrl] = useState("");
  const [addDeadline, setAddDeadline] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
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

  useEffect(() => {
    fetchAssignments();
    fetchSubjects();
  }, []);

  // ─── Add Assignment ─────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: addSubject,
          title: addTitle,
          description: addDescription || undefined,
          file_url: addFileUrl || undefined,
          deadline: addDeadline || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add assignment");
        return;
      }

      toast.success("Assignment added successfully!");
      setAddTitle("");
      setAddDescription("");
      setAddFileUrl("");
      setAddDeadline("");
      setAddSubject("");
      setShowAddForm(false);
      fetchAssignments();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Edit Assignment ────────────────────────────
  const openEditDialog = (a: Assignment) => {
    setEditAssignment(a);
    setEditTitle(a.title);
    setEditDescription(a.description || "");
    setEditFileUrl(a.file_url || "");
    setEditSubject(a.subject._id);
    setEditDeadline(
      a.deadline ? new Date(a.deadline).toISOString().slice(0, 16) : ""
    );
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editAssignment) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/assignments/${editAssignment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          file_url: editFileUrl,
          subject: editSubject,
          deadline: editDeadline || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update assignment");
        return;
      }

      toast.success("Assignment updated successfully!");
      setEditDialogOpen(false);
      fetchAssignments();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Button
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Assignment"}
        </Button>
      </div>

      {/* Add Assignment Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-indigo-200 dark:border-indigo-800">
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
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                disabled={addLoading || !addSubject}
              >
                {addLoading ? "Adding..." : "Add Assignment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assignments Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">All Assignments</CardTitle>
          <CardDescription>
            Edit or delete assignments. Students see these in their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No assignments yet. Click &ldquo;+ Add Assignment&rdquo; above to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>PDF</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const isOverdue = a.deadline
                      ? new Date(a.deadline) < new Date()
                      : false;
                    return (
                      <TableRow key={a._id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {a.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {a.subject?.name}
                          </Badge>
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
                              })}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.file_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs"
                              onClick={() => window.open(a.file_url, "_blank")}
                            >
                              Open
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openEditDialog(a)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => openDeleteDialog(a)}
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
          )}
        </CardContent>
      </Card>

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
              <Label>Deadline</Label>
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
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
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
    </div>
  );
}
