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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AccessRequest {
  _id: string;
  name: string;
  college_id: string;
  email: string;
  stream: { _id: string; name: string } | null;
  reason: string;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  createdAt: string;
}

type FilterStatus = "all" | "pending" | "approved" | "denied";

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");

  // Action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "deny">("approve");
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<AccessRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Approval result
  const [approvalResult, setApprovalResult] = useState<{
    collegeId: string;
    tempPassword: string;
    email: string;
  } | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/access-requests");
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch {
      toast.error("Failed to fetch access requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  const openActionDialog = (request: AccessRequest, type: "approve" | "deny") => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNote("");
    setApprovalResult(null);
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/access-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          action: actionType,
          admin_note: adminNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `Failed to ${actionType} request`);
        return;
      }

      if (actionType === "approve" && data.tempPassword) {
        setApprovalResult({
          collegeId: selectedRequest.college_id,
          tempPassword: data.tempPassword,
          email: selectedRequest.email,
        });
        toast.success("Request approved! User account created.");
      } else {
        toast.success(`Request ${actionType === "approve" ? "approved" : "denied"}.`);
        setActionDialogOpen(false);
      }

      fetchRequests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRequest) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/access-requests?id=${deleteRequest._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete request");
        return;
      }

      toast.success("Request deleted");
      setRequests(requests.filter((r) => r._id !== deleteRequest._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteRequest(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
            ⏳ Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="rounded-full text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700">
            ✅ Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="outline" className="rounded-full text-red-600 border-red-300 dark:text-red-400 dark:border-red-700">
            ❌ Denied
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full">{status}</Badge>;
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access Requests</h1>
        <p className="text-muted-foreground">
          Review and manage account access requests from students
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-indigo-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{requests.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "pending" ? "ring-2 ring-amber-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("pending")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "approved" ? "ring-2 ring-emerald-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("approved")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-all ${filter === "denied" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
          onClick={() => setFilter("denied")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{deniedCount}</p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests
          </CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>College ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell className="font-medium">{req.name}</TableCell>
                      <TableCell>{req.college_id}</TableCell>
                      <TableCell className="text-xs">{req.email}</TableCell>
                      <TableCell>
                        {req.stream ? (
                          <Badge variant="outline" className="rounded-full text-xs">
                            🎓 {req.stream.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openActionDialog(req, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="rounded-lg text-xs"
                                onClick={() => openActionDialog(req, "deny")}
                              >
                                Deny
                              </Button>
                            </>
                          )}
                          {req.reason && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs"
                              onClick={() => {
                                toast.info(req.reason, { duration: 5000 });
                              }}
                              title="View reason"
                            >
                              💬
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => {
                              setDeleteRequest(req);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            🗑
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

      {/* Action Dialog (Approve/Deny) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {approvalResult
                ? "Account Created!"
                : actionType === "approve"
                  ? "Approve Request"
                  : "Deny Request"}
            </DialogTitle>
            <DialogDescription>
              {approvalResult
                ? "A new user account has been created and an email has been sent."
                : actionType === "approve"
                  ? `Approve access for ${selectedRequest?.name} (${selectedRequest?.college_id})? This will create their account and email them a temporary password.`
                  : `Deny access for ${selectedRequest?.name} (${selectedRequest?.college_id})? They will be notified via email.`}
            </DialogDescription>
          </DialogHeader>

          {approvalResult ? (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">College ID:</span>
                  <span className="font-mono font-medium">{approvalResult.collegeId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Temp Password:</span>
                  <span className="font-mono font-bold">{approvalResult.tempPassword}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email sent to:</span>
                  <span className="text-xs">{approvalResult.email}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                The student will be required to change their password on first login.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Admin Note <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder={
                    actionType === "approve"
                      ? "e.g. Welcome!"
                      : "e.g. Reason for denial..."
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {approvalResult ? (
              <Button
                className="rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(approvalResult.tempPassword);
                  toast.success("Password copied!");
                  setActionDialogOpen(false);
                }}
              >
                Copy Password & Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setActionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className={`rounded-xl text-white ${
                    actionType === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                  onClick={handleAction}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : actionType === "approve"
                      ? "Approve & Create Account"
                      : "Deny Request"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Delete the access request from <strong>{deleteRequest?.name}</strong> ({deleteRequest?.college_id})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
