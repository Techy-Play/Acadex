"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface User {
  _id: string;
  name: string;
  college_id: string;
  role: string;
  must_change_password: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
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

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.students || []);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          {users.length} registered user{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            View, reset passwords, and remove users from the platform.
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
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openResetDialog(user)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openDeleteDialog(user)}
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
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
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
