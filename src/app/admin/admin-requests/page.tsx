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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminRequestItem {
  _id: string;
  type: "create_admin" | "change_section_stream";
  requestedBy: { _id: string; name: string; college_id: string } | null;
  targetUser: {
    _id: string;
    name: string;
    college_id: string;
    role: string;
  } | null;
  data: Record<string, unknown>;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  _streamName: string | null;
  _sectionName: string | null;
  createdAt: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<AdminRequestItem | null>(
    null
  );
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    try {
      const [reqRes, meRes] = await Promise.all([
        fetch("/api/admin/admin-requests"),
        fetch("/api/auth/me"),
      ]);
      const reqData = await reqRes.json();
      if (reqRes.ok) setRequests(reqData.requests || []);

      if (meRes.ok) {
        const meData = await meRes.json();
        setIsSuperAdmin(!!meData.user?.isSuperAdmin);
      }
    } catch {
      toast.error("Failed to fetch admin requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (action: "approve" | "deny") => {
    if (!detailRequest) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/admin-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: detailRequest._id,
          action,
          admin_note: adminNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action} request`);
        return;
      }
      toast.success(
        action === "approve"
          ? "Request approved successfully!"
          : "Request denied."
      );
      setDetailOpen(false);
      setDetailRequest(null);
      setAdminNote("");
      fetchRequests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/admin-requests?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete request");
        return;
      }
      toast.success("Request deleted");
      setRequests(requests.filter((r) => r._id !== id));
      if (detailRequest?._id === id) {
        setDetailOpen(false);
        setDetailRequest(null);
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const openDetail = (req: AdminRequestItem) => {
    setDetailRequest(req);
    setAdminNote(req.admin_note || "");
    setDetailOpen(true);
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
            ⏳ Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            ✅ Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500/30">
            ❌ Denied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "create_admin":
        return (
          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30">
            👑 Create Admin
          </Badge>
        );
      case "change_section_stream":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
            🔄 Section/Stream
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Requests</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? "Review and approve admin-level requests"
              : "Track your admin requests"}
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-500 font-medium">
                ({pendingCount} pending)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`rounded-2xl cursor-pointer transition-colors ${
            filterStatus === "pending"
              ? "ring-2 ring-yellow-500/50"
              : "hover:bg-muted/50"
          }`}
          onClick={() =>
            setFilterStatus(filterStatus === "pending" ? "all" : "pending")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">
              {requests.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-colors ${
            filterStatus === "approved"
              ? "ring-2 ring-green-500/50"
              : "hover:bg-muted/50"
          }`}
          onClick={() =>
            setFilterStatus(filterStatus === "approved" ? "all" : "approved")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {requests.filter((r) => r.status === "approved").length}
            </p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card
          className={`rounded-2xl cursor-pointer transition-colors ${
            filterStatus === "denied"
              ? "ring-2 ring-red-500/50"
              : "hover:bg-muted/50"
          }`}
          onClick={() =>
            setFilterStatus(filterStatus === "denied" ? "all" : "denied")
          }
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {requests.filter((r) => r.status === "denied").length}
            </p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Requests</CardTitle>
              <CardDescription>
                {filteredRequests.length} of {requests.length} request
                {requests.length !== 1 ? "s" : ""} shown
                {filterStatus !== "all" && (
                  <button
                    className="ml-2 text-xs text-primary hover:underline"
                    onClick={() => setFilterStatus("all")}
                  >
                    Clear filter
                  </button>
                )}
              </CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 rounded-xl text-xs h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="approved">✅ Approved</SelectItem>
                <SelectItem value="denied">❌ Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-4xl mb-2">📋</p>
              <p>No admin requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow
                      key={req._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(req)}
                    >
                      <TableCell>{typeBadge(req.type)}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {req.requestedBy?.name || "Unknown"}
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {req.requestedBy?.college_id || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.type === "create_admin" ? (
                          <span className="text-sm">
                            Create admin: {(req.data.name as string) || "—"}
                            {req._sectionName && (
                              <span className="text-muted-foreground">
                                {" "}
                                ({req._sectionName})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm">
                            Change section/stream
                            {req.targetUser && (
                              <span className="text-muted-foreground">
                                {" "}
                                for {req.targetUser.name}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(req.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailRequest(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailRequest && typeBadge(detailRequest.type)}
              {detailRequest && statusBadge(detailRequest.status)}
            </DialogTitle>
            <DialogDescription>
              {detailRequest?.createdAt && formatDate(detailRequest.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {detailRequest && (
            <div className="space-y-4">
              {/* Requested By */}
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Requested By
                </p>
                <p className="font-medium">
                  {detailRequest.requestedBy?.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detailRequest.requestedBy?.college_id || ""}
                </p>
              </div>

              {/* Request Data */}
              {detailRequest.type === "create_admin" ? (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Admin to Create
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">
                        {detailRequest.data.name as string}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        College ID:
                      </span>{" "}
                      <span className="font-medium">
                        {detailRequest.data.college_id as string}
                      </span>
                    </div>
                    {detailRequest._sectionName && (
                      <div>
                        <span className="text-muted-foreground">Section:</span>{" "}
                        <span className="font-medium">
                          {detailRequest._sectionName}
                        </span>
                      </div>
                    )}
                    {detailRequest._streamName && (
                      <div>
                        <span className="text-muted-foreground">Stream:</span>{" "}
                        <span className="font-medium">
                          {detailRequest._streamName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Section/Stream Change
                  </p>
                  {detailRequest.targetUser && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">User:</span>{" "}
                      <span className="font-medium">
                        {detailRequest.targetUser.name} (
                        {detailRequest.targetUser.college_id})
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {detailRequest._sectionName && (
                      <div>
                        <span className="text-muted-foreground">
                          New Section:
                        </span>{" "}
                        <span className="font-medium">
                          {detailRequest._sectionName}
                        </span>
                      </div>
                    )}
                    {detailRequest._streamName && (
                      <div>
                        <span className="text-muted-foreground">
                          New Stream:
                        </span>{" "}
                        <span className="font-medium">
                          {detailRequest._streamName}
                        </span>
                      </div>
                    )}
                    {!detailRequest._sectionName &&
                      detailRequest.data.newSection === null && (
                        <div>
                          <span className="text-muted-foreground">
                            New Section:
                          </span>{" "}
                          <span className="font-medium italic">None</span>
                        </div>
                      )}
                    {!detailRequest._streamName &&
                      detailRequest.data.newStream === null && (
                        <div>
                          <span className="text-muted-foreground">
                            New Stream:
                          </span>{" "}
                          <span className="font-medium italic">None</span>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Admin Note (if already set) */}
              {detailRequest.admin_note &&
                detailRequest.status !== "pending" && (
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Admin Note
                    </p>
                    <p className="text-sm">{detailRequest.admin_note}</p>
                  </div>
                )}

              {/* Actions for super admin on pending requests */}
              {isSuperAdmin && detailRequest.status === "pending" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea
                      placeholder="Add a note for the requesting admin..."
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="rounded-xl"
                      maxLength={500}
                    />
                  </div>

                  <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleAction("deny")}
                      disabled={processing}
                      className="rounded-xl flex-1"
                    >
                      {processing ? "Processing..." : "❌ Deny"}
                    </Button>
                    <Button
                      onClick={() => handleAction("approve")}
                      disabled={processing}
                      className="rounded-xl flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing ? "Processing..." : "✅ Approve"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Delete button for super admin on non-pending */}
              {isSuperAdmin && detailRequest.status !== "pending" && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(detailRequest._id)}
                    className="rounded-xl"
                  >
                    🗑 Delete Request
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
