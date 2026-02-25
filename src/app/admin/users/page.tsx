"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";

interface StreamItem {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  college_id: string;
  role: string;
  stream: StreamItem | null;
  must_change_password: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Stream assign state
  const [streamDialogOpen, setStreamDialogOpen] = useState(false);
  const [streamUser, setStreamUser] = useState<User | null>(null);
  const [selectedStream, setSelectedStream] = useState("none");
  const [savingStream, setSavingStream] = useState(false);

  // Add student state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCollegeId, setAddCollegeId] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("student");
  const [addStream, setAddStream] = useState("none");

  const fetchUsers = async () => {
    try {
      const [usersRes, streamsRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/streams"),
      ]);
      const usersData = await usersRes.json();
      const streamsData = await streamsRes.json();

      if (usersRes.ok) setUsers(usersData.students || []);
      if (streamsRes.ok) setStreams(streamsData.streams || []);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          college_id: addCollegeId,
          password: addPassword,
          role: addRole,
          stream: addStream === "none" ? null : addStream,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add student");
        return;
      }

      toast.success(`${addName} added successfully!`);
      setAddName("");
      setAddCollegeId("");
      setAddPassword("");
      setAddRole("student");
      setAddStream("none");
      setShowAddForm(false);
      fetchUsers();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setResetting(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetUser._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        setResetDialogOpen(false);
        return;
      }

      setTempPassword(data.tempPassword);
      toast.success("Password reset successfully!");
      fetchUsers();
    } catch {
      toast.error("Something went wrong");
      setResetDialogOpen(false);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/students/${deleteUser._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success(`${deleteUser.name} has been removed`);
      setUsers(users.filter((u) => u._id !== deleteUser._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteUser(null);
    }
  };

  // ─── Stream Assignment ──────────────────────────
  const openStreamDialog = (user: User) => {
    setStreamUser(user);
    setSelectedStream(user.stream?._id || "none");
    setStreamDialogOpen(true);
  };

  const handleSaveStream = async () => {
    if (!streamUser) return;
    setSavingStream(true);

    try {
      const res = await fetch(`/api/admin/students/${streamUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream: selectedStream === "none" ? null : selectedStream,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update stream");
        return;
      }

      toast.success(`Stream updated for ${streamUser.name}!`);
      setStreamDialogOpen(false);
      fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingStream(false);
    }
  };

  const openResetDialog = (user: User) => {
    setResetUser(user);
    setTempPassword(null);
    setResetDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setDeleteUser(user);
    setDeleteDialogOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {showAddForm ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Student
            </span>
          )}
        </Button>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Add New Student</CardTitle>
            <CardDescription>
              The student will be required to change their password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStudent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="add_name">Full Name</Label>
                <Input
                  id="add_name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_college_id">College ID</Label>
                <Input
                  id="add_college_id"
                  type="text"
                  placeholder="e.g. 2024BCS001"
                  value={addCollegeId}
                  onChange={(e) => setAddCollegeId(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_password">Initial Password</Label>
                <Input
                  id="add_password"
                  type="text"
                  placeholder="Min 6 characters"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stream</Label>
                <Select value={addStream} onValueChange={setAddStream}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">No Stream</SelectItem>
                    {streams.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={addLoading}
                >
                  {addLoading ? "Adding..." : "Add Student"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            View, reset passwords, assign streams, and remove users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>College ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.college_id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                          className="rounded-full capitalize"
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.stream ? (
                          <Badge variant="outline" className="rounded-full text-xs">
                            🎓 {user.stream.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.must_change_password ? (
                          <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300">
                            Pending Password Change
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full text-green-600 border-green-300">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => openStreamDialog(user)}
                          >
                            Stream
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => openResetDialog(user)}
                          >
                            Reset Pwd
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => openDeleteDialog(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Assignment Dialog */}
      <Dialog open={streamDialogOpen} onOpenChange={setStreamDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign Stream</DialogTitle>
            <DialogDescription>
              Change the stream for{" "}
              <strong>{streamUser?.name}</strong> ({streamUser?.college_id}).
              This determines which subjects they can see.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Stream</Label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Stream (see all subjects)</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setStreamDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveStream}
              disabled={savingStream}
            >
              {savingStream ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {tempPassword
                ? "Password has been reset. Share this temporary password with the student."
                : `Reset password for ${resetUser?.name} (${resetUser?.college_id})?`}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Temporary Password
                </p>
                <p className="text-lg font-mono font-bold tracking-wider">
                  {tempPassword}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                The student will be required to change this on next login.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            {tempPassword ? (
              <Button
                className="rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  toast.success("Copied to clipboard!");
                }}
              >
                Copy & Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setResetDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleResetPassword}
                  disabled={resetting}
                >
                  {resetting ? "Resetting..." : "Reset Password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteUser?.name}</strong> ({deleteUser?.college_id})?
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
              {deleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
