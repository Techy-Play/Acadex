/**
 * @page AdminUsers (/admin/users)
 * @description Admin user management — list, search, edit, ban, and delete student accounts.
 */
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
import { Textarea } from "@/components/ui/textarea";

interface StreamItem {
  _id: string;
  name: string;
}

interface SectionItem {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  college_id: string;
  email?: string | null;
  role: string;
  isSuperAdmin?: boolean;
  adminAlias?: string | null;
  stream: StreamItem | null;
  section: SectionItem | null;
  semester: number | null;
  must_change_password: boolean;
  status: "active" | "banned" | "suspended";
  createdAt: string;
}

interface UserDetails {
  _id: string;
  name: string;
  college_id: string;
  email: string | null;
  role: string;
  isSuperAdmin: boolean;
  adminAlias: string | null;
  stream: StreamItem | null;
  section: SectionItem | null;
  semester: number | null;
  must_change_password: boolean;
  status: "active" | "banned" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIsSuperAdmin, setCurrentIsSuperAdmin] = useState(false);

  // Reset password state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Stream/Section assign state
  const [streamDialogOpen, setStreamDialogOpen] = useState(false);
  const [streamUser, setStreamUser] = useState<User | null>(null);
  const [selectedStream, setSelectedStream] = useState("none");
  const [selectedSection, setSelectedSection] = useState("none");
  const [selectedSemester, setSelectedSemester] = useState("none");
  const [savingStream, setSavingStream] = useState(false);

  // Add student state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCollegeId, setAddCollegeId] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("student");
  const [addStream, setAddStream] = useState("none");
  const [addSection, setAddSection] = useState("none");
  const [addSemester, setAddSemester] = useState("none");

  // User details dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Notification send state (inside detail popup)
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStream, setFilterStream] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "college_id" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchUsers = async () => {
    try {
      const [usersRes, streamsRes, sectionsRes, meRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/streams"),
        fetch("/api/sections"),
        fetch("/api/auth/me"),
      ]);
      const usersData = await usersRes.json();
      const streamsData = await streamsRes.json();
      const sectionsData = await sectionsRes.json();

      if (usersRes.ok) setUsers(usersData.students || []);
      if (streamsRes.ok) setStreams(streamsData.streams || []);
      if (sectionsRes.ok) setSections(sectionsData.sections || []);
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentIsSuperAdmin(!!meData.user?.isSuperAdmin);
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
          email: addEmail.trim() || null,
          password: addPassword,
          role: addRole,
          stream: addStream === "none" ? null : addStream,
          section: addSection === "none" ? null : addSection,
          semester: addSemester === "none" ? null : Number(addSemester),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add student");
        return;
      }

      if (data.pending) {
        toast.success(data.message || "Request sent to super admin for approval.");
      } else {
        toast.success(`${addName} added successfully!`);
      }
      setAddName("");
      setAddCollegeId("");
      setAddEmail("");
      setAddPassword("");
      setAddRole("student");
      setAddStream("none");
      setAddSection("none");
      setAddSemester("none");
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

  // ─── Stream/Section Assignment ────────────────────────
  const openStreamDialog = (user: User) => {
    setStreamUser(user);
    setSelectedStream(user.stream?._id || "none");
    setSelectedSection(user.section?._id || "none");
    setSelectedSemester(user.semester ? String(user.semester) : "none");
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
          section: selectedSection === "none" ? null : selectedSection,
          semester: selectedSemester === "none" ? null : Number(selectedSemester),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update stream");
        return;
      }

      if (data.pending) {
        toast.success(data.message || "Change request sent to super admin for approval.");
      } else {
        toast.success(`Stream updated for ${streamUser.name}!`);
      }
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
    setResetConfirmText("");
    setResetDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setDeleteUser(user);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const openDetailDialog = async (user: User) => {
    setDetailDialogOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/students/${user._id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailUser(data.user);
      } else {
        toast.error("Failed to load user details");
        setDetailDialogOpen(false);
      }
    } catch {
      toast.error("Failed to load user details");
      setDetailDialogOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/students/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success(`Status updated to ${newStatus}`);
      if (detailUser) setDetailUser({ ...detailUser, status: newStatus as "active" | "banned" | "suspended" });
      fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendNotification = async () => {
    if (!detailUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: detailUser._id,
          title: notifTitle,
          message: notifMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send notification");
        return;
      }
      toast.success(`Notification sent to ${detailUser.name}!`);
      setNotifDialogOpen(false);
      setNotifTitle("");
      setNotifMessage("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSendingNotif(false);
    }
  };

  // ─── Filtered & Sorted Users ────────────────────
  const filteredUsers = users
    .filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
        if (!u.name.toLowerCase().includes(q) && !u.college_id.toLowerCase().includes(q) && !emailMatch) return false;
      }
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterStatus !== "all") {
        const userStatus = u.status || "active";
        if (filterStatus === "pending" && !u.must_change_password) return false;
        if (filterStatus !== "pending" && userStatus !== filterStatus) return false;
      }
      if (filterStream !== "all") {
        if (filterStream === "none" && u.stream) return false;
        if (filterStream !== "none" && u.stream?._id !== filterStream) return false;
      }
      if (filterSection !== "all") {
        if (filterSection === "none" && u.section) return false;
        if (filterSection !== "none" && u.section?._id !== filterSection) return false;
      }
      if (currentIsSuperAdmin && filterSemester !== "all") {
        if (filterSemester === "none" && u.semester) return false;
        if (filterSemester !== "none" && String(u.semester || "") !== filterSemester) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "college_id") cmp = a.college_id.localeCompare(b.college_id);
      else if (sortBy === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? cmp : -cmp;
    });

  const activeFilters = [
    filterRole,
    filterStatus,
    filterStream,
    filterSection,
    ...(currentIsSuperAdmin ? [filterSemester] : []),
  ].filter(f => f !== "all").length + (searchQuery ? 1 : 0) + (sortBy !== "name" || sortOrder !== "asc" ? 1 : 0);

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
                  placeholder="e.g. Deepak Negi"
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
                  placeholder="e.g. 241...."
                  value={addCollegeId}
                  onChange={(e) => setAddCollegeId(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_email">Email</Label>
                <Input
                  id="add_email"
                  type="email"
                  placeholder="e.g. student@gmail.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
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
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={addSection} onValueChange={setAddSection}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">No Section</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={addSemester} onValueChange={setAddSemester}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">No Semester</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} of {users.length} user{users.length !== 1 ? "s" : ""} shown
                {activeFilters > 0 && (
                  <button
                    className="ml-2 text-xs text-primary hover:underline"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterRole("all");
                      setFilterStatus("all");
                      setFilterStream("all");
                      setFilterSection("all");
                      setFilterSemester("all");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Filters Bar */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder="Search by name, college ID, or email..."
                className="rounded-xl pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {/* Role Filter */}
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">👑 Admin</SelectItem>
                  <SelectItem value="student">🎓 Student</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="suspended">⏸ Suspended</SelectItem>
                  <SelectItem value="banned">🚫 Banned</SelectItem>
                  <SelectItem value="pending">🔑 Pending Password</SelectItem>
                </SelectContent>
              </Select>

              {/* Stream Filter */}
              <Select value={filterStream} onValueChange={setFilterStream}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Stream" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Streams</SelectItem>
                  <SelectItem value="none">No Stream</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Section Filter */}
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="none">No Section</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Semester Filter (super admin only) */}
              {currentIsSuperAdmin && (
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Semesters</SelectItem>
                    <SelectItem value="none">No Semester</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [by, order] = v.split("-") as ["name" | "college_id" | "date", "asc" | "desc"];
                  setSortBy(by);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="name-asc">Name A→Z</SelectItem>
                  <SelectItem value="name-desc">Name Z→A</SelectItem>
                  <SelectItem value="college_id-asc">ID A→Z</SelectItem>
                  <SelectItem value="college_id-desc">ID Z→A</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {activeFilters > 0 && (
              <button
                className="text-xs text-primary hover:underline whitespace-nowrap"
                onClick={() => {
                  setSearchQuery("");
                  setFilterRole("all");
                  setFilterStatus("all");
                  setFilterStream("all");
                  setFilterSection("all");
                  setFilterSemester("all");
                  setSortBy("name");
                  setSortOrder("asc");
                }}
              >
                Reset all filters
              </button>
            )}
          </div>

          {/* Table */}
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {users.length === 0 ? "No users found." : "No users match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>College ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <TableRow key={user._id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openDetailDialog(user)}>
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">{index + 1}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="font-mono text-xs">{user.college_id}</TableCell>
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
                        {user.section ? (
                          <Badge variant="outline" className="rounded-full text-xs">
                            🏫 {user.section.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.semester ? (
                          <Badge variant="outline" className="rounded-full text-xs">
                            📅 Sem {user.semester}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(user.status === "banned") ? (
                          <Badge variant="outline" className="rounded-full text-red-600 border-red-300 text-xs">
                            🚫 Banned
                          </Badge>
                        ) : (user.status === "suspended") ? (
                          <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300 text-xs">
                            ⏸ Suspended
                          </Badge>
                        ) : user.must_change_password ? (
                          <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300 text-xs">
                            🔑 Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full text-green-600 border-green-300 text-xs">
                            ✅ Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream/Section Assignment Dialog */}
      <Dialog open={streamDialogOpen} onOpenChange={setStreamDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign Stream & Section</DialogTitle>
            <DialogDescription>
              Change the stream and section for{" "}
              <strong>{streamUser?.name}</strong> ({streamUser?.college_id}).
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
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Section</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Semester</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
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
          ) : (
            <div className="space-y-2">
              <Label className="text-sm">Type <span className="font-mono font-bold text-primary">reset-password</span> to confirm</Label>
              <Input
                className="rounded-xl font-mono"
                placeholder="reset-password"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

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
                  disabled={resetting || resetConfirmText !== "reset-password"}
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
          <div className="space-y-2">
            <Label className="text-sm">Type <span className="font-mono font-bold text-destructive">delete</span> to confirm</Label>
            <Input
              className="rounded-xl font-mono"
              placeholder="delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
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
              disabled={deleting || deleteConfirmText !== "delete"}
            >
              {deleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setDetailUser(null); }}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Full profile information & actions
            </DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailUser ? (
            <div className="space-y-4">
              {/* Avatar & name */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {detailUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{detailUser.name}</h3>
                  {detailUser.adminAlias && (
                    <p className="text-sm text-primary">aka {detailUser.adminAlias}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant={detailUser.role === "admin" ? "default" : "secondary"} className="rounded-full capitalize text-xs">
                      {detailUser.isSuperAdmin ? "Super Admin" : detailUser.role}
                    </Badge>
                    {(detailUser.status === "banned") ? (
                      <Badge variant="outline" className="rounded-full text-red-600 border-red-300 text-xs">Banned</Badge>
                    ) : (detailUser.status === "suspended") ? (
                      <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300 text-xs">Suspended</Badge>
                    ) : detailUser.must_change_password ? (
                      <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300 text-xs">Pending Password Change</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full text-green-600 border-green-300 text-xs">Active</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground">College ID</p>
                  <p className="text-sm font-medium font-mono">{detailUser.college_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{detailUser.email || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Section</p>
                  <p className="text-sm font-medium">
                    {detailUser.section ? `🏫 ${detailUser.section.name}` : "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stream</p>
                  <p className="text-sm font-medium">
                    {detailUser.stream ? `🎓 ${detailUser.stream.name}` : "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Semester</p>
                  <p className="text-sm font-medium">
                    {detailUser.semester ? `📅 Semester ${detailUser.semester}` : "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {new Date(detailUser.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date(detailUser.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* ── Actions Section ── */}
              {!detailUser.isSuperAdmin && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>

                  {/* Status */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Status</Label>
                    <Select
                      value={detailUser.status || "active"}
                      onValueChange={(val) => handleStatusChange(detailUser._id, val)}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="w-40 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="active">✅ Active</SelectItem>
                        <SelectItem value="suspended">⏸ Suspended</SelectItem>
                        <SelectItem value="banned">🚫 Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setTimeout(() => openStreamDialog({
                          _id: detailUser._id,
                          name: detailUser.name,
                          college_id: detailUser.college_id,
                          role: detailUser.role,
                          stream: detailUser.stream,
                          section: detailUser.section,
                          semester: detailUser.semester,
                          must_change_password: detailUser.must_change_password,
                          status: detailUser.status,
                          createdAt: detailUser.createdAt,
                        }), 150);
                      }}
                    >
                      🎓 Assign Stream/Section
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setTimeout(() => openResetDialog({
                          _id: detailUser._id,
                          name: detailUser.name,
                          college_id: detailUser.college_id,
                          role: detailUser.role,
                          stream: detailUser.stream,
                          section: detailUser.section,
                          semester: detailUser.semester,
                          must_change_password: detailUser.must_change_password,
                          status: detailUser.status,
                          createdAt: detailUser.createdAt,
                        }), 150);
                      }}
                    >
                      🔑 Reset Password
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => {
                        setNotifTitle("");
                        setNotifMessage("");
                        setNotifDialogOpen(true);
                      }}
                    >
                      🔔 Send Notification
                    </Button>
                    {(currentIsSuperAdmin || detailUser.role !== "admin") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-xl text-xs"
                        onClick={() => {
                          setDetailDialogOpen(false);
                          setTimeout(() => openDeleteDialog({
                            _id: detailUser._id,
                            name: detailUser.name,
                            college_id: detailUser.college_id,
                            role: detailUser.role,
                            stream: detailUser.stream,
                            section: detailUser.section,
                            semester: detailUser.semester,
                            must_change_password: detailUser.must_change_password,
                            status: detailUser.status,
                            createdAt: detailUser.createdAt,
                          }), 150);
                        }}
                      >
                        🗑 Delete User
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDetailDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to <strong>{detailUser?.name}</strong> ({detailUser?.college_id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                className="rounded-xl"
                placeholder="e.g. Important Update"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                className="rounded-xl resize-none"
                placeholder="Write your message here..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setNotifDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSendNotification}
              disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
            >
              {sendingNotif ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
