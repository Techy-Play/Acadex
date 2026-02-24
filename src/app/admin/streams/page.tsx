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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Subject {
  _id: string;
  name: string;
}

interface StreamItem {
  _id: string;
  name: string;
  subjects: Subject[];
}

export default function ManageStreamsPage() {
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSubjects, setAddSubjects] = useState<string[]>([]);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStream, setEditStream] = useState<StreamItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStream, setDeleteStream] = useState<StreamItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [streamsRes, subjectsRes] = await Promise.all([
        fetch("/api/streams"),
        fetch("/api/subjects"),
      ]);
      const streamsData = await streamsRes.json();
      const subjectsData = await subjectsRes.json();

      if (streamsRes.ok) setStreams(streamsData.streams || []);
      if (subjectsRes.ok) setSubjects(subjectsData.subjects || []);
    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Add Stream ─────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), subjects: addSubjects }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add stream");
        return;
      }

      toast.success("Stream added successfully!");
      setAddName("");
      setAddSubjects([]);
      setShowAddForm(false);
      fetchData();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Edit Stream ────────────────────────────────
  const openEditDialog = (stream: StreamItem) => {
    setEditStream(stream);
    setEditName(stream.name);
    setEditSubjects(stream.subjects.map((s) => s._id));
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editStream) return;
    setEditLoading(true);

    try {
      const res = await fetch(`/api/streams/${editStream._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), subjects: editSubjects }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update stream");
        return;
      }

      toast.success("Stream updated!");
      setEditDialogOpen(false);
      setEditStream(null);
      fetchData();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Delete Stream ──────────────────────────────
  const openDeleteDialog = (stream: StreamItem) => {
    setDeleteStream(stream);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteStream) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/streams/${deleteStream._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete stream");
        return;
      }

      toast.success("Stream deleted!");
      setStreams(streams.filter((s) => s._id !== deleteStream._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteStream(null);
    }
  };

  // ─── Subject checkbox toggle helper ─────────────
  const toggleSubject = (
    subjectId: string,
    current: string[],
    setter: (val: string[]) => void
  ) => {
    if (current.includes(subjectId)) {
      setter(current.filter((id) => id !== subjectId));
    } else {
      setter([...current, subjectId]);
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
          <h1 className="text-2xl font-bold tracking-tight">Streams</h1>
          <p className="text-muted-foreground">
            {streams.length} stream{streams.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Stream"}
        </Button>
      </div>

      {/* Add Stream Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="text-lg">New Stream</CardTitle>
            <CardDescription>
              Create a stream and assign subjects to it. Students in this stream will see only these subjects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addName">Stream Name</Label>
                <Input
                  id="addName"
                  placeholder="e.g. Btech CSE"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Assign Subjects</Label>
                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No subjects available. Add subjects first.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-xl bg-muted/30">
                    {subjects.map((subject) => (
                      <label
                        key={subject._id}
                        className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={addSubjects.includes(subject._id)}
                          onCheckedChange={() =>
                            toggleSubject(subject._id, addSubjects, setAddSubjects)
                          }
                        />
                        {subject.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                disabled={addLoading || !addName.trim()}
              >
                {addLoading ? "Adding..." : "Add Stream"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Streams Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">All Streams</CardTitle>
          <CardDescription>
            Each stream defines which subjects its students can access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {streams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No streams yet. Click &ldquo;+ Add Stream&rdquo; above to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Stream Name</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streams.map((stream, index) => (
                    <TableRow key={stream._id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge
                          variant="secondary"
                          className="rounded-full text-sm px-3 py-1"
                        >
                          🎓 {stream.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {stream.subjects.length > 0 ? (
                            stream.subjects.map((s) => (
                              <Badge
                                key={s._id}
                                variant="outline"
                                className="rounded-full text-xs"
                              >
                                {s.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No subjects assigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openEditDialog(stream)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openDeleteDialog(stream)}
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

      {/* Edit Stream Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Stream</DialogTitle>
            <DialogDescription>
              Update the stream name and its assigned subjects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Stream Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-xl bg-muted/30 max-h-60 overflow-y-auto">
                {subjects.map((subject) => (
                  <label
                    key={subject._id}
                    className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={editSubjects.includes(subject._id)}
                      onCheckedChange={() =>
                        toggleSubject(subject._id, editSubjects, setEditSubjects)
                      }
                    />
                    {subject.name}
                  </label>
                ))}
              </div>
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
              disabled={editLoading || !editName.trim()}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Delete Stream
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteStream?.name}&rdquo;?
              This will only work if no students are currently assigned to this stream.
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
              {deleting ? "Deleting..." : "Delete Stream"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
