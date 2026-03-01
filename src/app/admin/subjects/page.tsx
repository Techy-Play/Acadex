/**
 * @page AdminSubjects (/admin/subjects)
 * @description Admin CRUD for subjects (create, edit, delete with password confirmation).
 */
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
  type: "theory" | "practical";
  semester: number;
}

export default function ManageSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"theory" | "practical">("theory");
  const [addSemester, setAddSemester] = useState("");

  // Edit semester state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editSemester, setEditSemester] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      if (res.ok) setSubjects(data.subjects || []);
    } catch {
      toast.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok) setIsSuperAdmin(Boolean(data.user?.isSuperAdmin));
    } catch {
      setIsSuperAdmin(false);
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditSubject(subject);
    setEditSemester(String(subject.semester));
    setEditDialogOpen(true);
  };

  const handleEditSemester = async () => {
    if (!editSubject || !editSemester) return;
    setEditLoading(true);

    try {
      const res = await fetch(`/api/subjects/${editSubject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semester: Number(editSemester) }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update semester");
        return;
      }

      setSubjects((prev) =>
        prev.map((s) =>
          s._id === editSubject._id ? { ...s, semester: Number(editSemester) } : s
        )
      );
      toast.success("Semester updated successfully");
      setEditDialogOpen(false);
      setEditSubject(null);
      setEditSemester("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Add Subject ────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), type: addType, semester: Number(addSemester) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add subject");
        return;
      }

      toast.success("Subject added successfully!");
      setAddName("");
      setAddType("theory");
      setAddSemester("");
      setShowAddForm(false);
      fetchSubjects();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Delete Subject ─────────────────────────────
  const openDeleteDialog = (subject: Subject) => {
    setDeleteSubject(subject);
    setDeletePassword("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteSubject || !deletePassword) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/subjects/${deleteSubject._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete subject");
        return;
      }

      toast.success("Subject deleted!");
      setSubjects(subjects.filter((s) => s._id !== deleteSubject._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteSubject(null);
      setDeletePassword("");
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
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "+ Add Subject"}
        </Button>
      </div>

      {/* Add Subject Form (collapsible) */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Subject</CardTitle>
            <CardDescription>
              Add a new subject. Notes and assignments can then be linked to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="addName">Subject Name</Label>
                  <Input
                    id="addName"
                    placeholder="e.g. Database Management Systems"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={addType} onValueChange={(v) => setAddType(v as "theory" | "practical")}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="theory">📖 Theory</SelectItem>
                      <SelectItem value="practical">🧪 Practical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={addSemester} onValueChange={setAddSemester} required>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="submit"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={addLoading || !addName.trim() || !addSemester}
              >
                {addLoading ? "Adding..." : "Add Subject"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Subjects Grouped by Type */}
      {subjects.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No subjects yet. Click &ldquo;+ Add Subject&rdquo; above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Theory Subjects */}
          {(() => {
            const theorySubjects = subjects.filter(s => s.type !== "practical");
            if (theorySubjects.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📖</span>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Theory</h3>
                  <Badge variant="secondary" className="rounded-full text-xs">{theorySubjects.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Card className="rounded-2xl">
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Subject Name</TableHead>
                            <TableHead>Semester</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {theorySubjects.map((subject, index) => (
                            <TableRow key={subject._id}>
                              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="rounded-full text-sm px-3 py-1">
                                  📚 {subject.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full text-xs">
                                  Sem {subject.semester}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <button
                                  onClick={async () => {
                                    const newType = "practical";
                                    try {
                                      const res = await fetch(`/api/subjects/${subject._id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ type: newType }),
                                      });
                                      if (res.ok) {
                                        setSubjects(subjects.map(s =>
                                          s._id === subject._id ? { ...s, type: newType } : s
                                        ));
                                        toast.success(`Changed to ${newType}`);
                                      }
                                    } catch { toast.error("Failed to update type"); }
                                  }}
                                  className="text-xs"
                                >
                                  <Badge variant="outline" className="rounded-full cursor-pointer hover:opacity-80 transition-opacity">
                                    📖 Theory
                                  </Badge>
                                </button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSuperAdmin && (
                                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEditDialog(subject)}>
                                      Edit Semester
                                    </Button>
                                  )}
                                  <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => openDeleteDialog(subject)}>
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Practical/Lab Subjects */}
          {(() => {
            const practicalSubjects = subjects.filter(s => s.type === "practical");
            if (practicalSubjects.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🧪</span>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Practical / Lab</h3>
                  <Badge variant="secondary" className="rounded-full text-xs">{practicalSubjects.length}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Card className="rounded-2xl">
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Subject Name</TableHead>
                            <TableHead>Semester</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {practicalSubjects.map((subject, index) => (
                            <TableRow key={subject._id}>
                              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="rounded-full text-sm px-3 py-1">
                                  🧪 {subject.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full text-xs">
                                  Sem {subject.semester}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <button
                                  onClick={async () => {
                                    const newType = "theory";
                                    try {
                                      const res = await fetch(`/api/subjects/${subject._id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ type: newType }),
                                      });
                                      if (res.ok) {
                                        setSubjects(subjects.map(s =>
                                          s._id === subject._id ? { ...s, type: newType } : s
                                        ));
                                        toast.success(`Changed to ${newType}`);
                                      }
                                    } catch { toast.error("Failed to update type"); }
                                  }}
                                  className="text-xs"
                                >
                                  <Badge variant="default" className="rounded-full cursor-pointer hover:opacity-80 transition-opacity">
                                    🧪 Practical
                                  </Badge>
                                </button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSuperAdmin && (
                                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEditDialog(subject)}>
                                      Edit Semester
                                    </Button>
                                  )}
                                  <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => openDeleteDialog(subject)}>
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </>
      )}

      {/* Delete Confirmation Dialog with Password */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject Semester</DialogTitle>
            <DialogDescription>
              Update semester for &ldquo;{editSubject?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Semester</Label>
            <Select value={editSemester} onValueChange={setEditSemester}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Semester {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleEditSemester}
              disabled={editLoading || !editSemester}
            >
              {editLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Password */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Delete Subject
            </DialogTitle>
            <DialogDescription>
              You are about to delete &ldquo;{deleteSubject?.name}&rdquo;.
              This will only work if the subject has no notes or assignments linked to it.
              <br />
              <span className="font-semibold text-red-500 dark:text-red-400">
                Enter your admin password to confirm this action.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Admin Password</Label>
              <Input
                id="deletePassword"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="rounded-xl"
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletePassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDelete}
              disabled={deleting || !deletePassword}
            >
              {deleting ? "Deleting..." : "Delete Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
