"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchMeCached } from "@/lib/client-auth";
import { CheckCircle2, Eye, Download, Clock, Loader2 } from "lucide-react";

interface AssignmentItem {
  _id: string;
  title: string;
  deadline: string | null;
  file_url?: string;
  subject: { _id: string; name: string };
  section?: { _id: string; name: string } | null;
}

interface PracticalItem {
  _id: string;
  title: string;
  deadline?: string | null;
  file_url?: string;
  subject: { _id: string; name: string };
  section?: { _id: string; name: string } | null;
}

type TabType = "assignments" | "practicals";

export default function PendingWorkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabType) || "assignments";
  const selectedSubject = searchParams.get("subject") || "all";

  const [tab, setTab] = useState<TabType>(initialTab);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [practicals, setPracticals] = useState<PracticalItem[]>([]);
  const [assignmentCompletedIds, setAssignmentCompletedIds] = useState<Set<string>>(new Set());
  const [practicalCompletedIds, setPracticalCompletedIds] = useState<Set<string>>(new Set());
  const [userSubjectIds, setUserSubjectIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [referenceNow] = useState(() => Date.now());

  useEffect(() => {
    async function fetchData() {
      try {
        const [aRes, pRes, cRes, pcRes, meData] = await Promise.all([
          fetch("/api/assignments"),
          fetch("/api/practicals"),
          fetch("/api/completions"),
          fetch("/api/practical-completions"),
          fetchMeCached(),
        ]);

        const aData = await aRes.json();
        const pData = await pRes.json();
        const cData = cRes.ok ? await cRes.json() : { completedIds: [] };
        const pcData = pcRes.ok ? await pcRes.json() : { completedIds: [] };

        setAssignments(aData.assignments || []);
        setPracticals(pData.practicals || []);
        setAssignmentCompletedIds(new Set(cData.completedIds || []));
        setPracticalCompletedIds(new Set(pcData.completedIds || []));

        // Get allowed user stream subject IDs for filtering
        if (meData?.user?.stream?.subjects?.length) {
          const subjectIds = new Set<string>(
            meData.user.stream.subjects.map((s: { _id: string }) => s._id)
          );
          setUserSubjectIds(subjectIds);
        }
      } catch (err) {
        console.error("Error fetching pending work data:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  const pendingAssignments = useMemo(() => {
    const cutoff = referenceNow + 24 * 60 * 60 * 1000;
    return assignments
      .filter((a) => !assignmentCompletedIds.has(a._id))
      .filter((a) => (selectedSubject === "all" ? true : a.subject?._id === selectedSubject))
      .filter((a) => (userSubjectIds === null ? true : userSubjectIds.has(a.subject?._id)))
      .filter((a) => a.deadline && new Date(a.deadline).getTime() <= cutoff)
      .sort((x, y) => {
        const dx = x.deadline ? new Date(x.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const dy = y.deadline ? new Date(y.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return dx - dy;
      });
  }, [assignments, assignmentCompletedIds, selectedSubject, userSubjectIds, referenceNow]);

  const pendingPracticals = useMemo(() => {
    const cutoff = referenceNow + 24 * 60 * 60 * 1000;
    return practicals
      .filter((p) => !practicalCompletedIds.has(p._id))
      .filter((p) => (selectedSubject === "all" ? true : p.subject?._id === selectedSubject))
      .filter((p) => (userSubjectIds === null ? true : userSubjectIds.has(p.subject?._id)))
      .filter((p) => p.deadline && new Date(p.deadline).getTime() <= cutoff)
      .sort((x, y) => {
        const dx = x.deadline ? new Date(x.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const dy = y.deadline ? new Date(y.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return dx - dy;
      });
  }, [practicals, practicalCompletedIds, selectedSubject, userSubjectIds, referenceNow]);

  async function handleToggleComplete(id: string, isPractical: boolean) {
    setTogglingId(id);
    try {
      if (!isPractical) {
        const endpoint = "/api/completions";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: id, completed: true }),
        });
        if (res.ok) {
          setAssignmentCompletedIds((prev) => new Set([...prev, id]));
          toast.success("Assignment marked as complete! 🎉");
        } else {
          toast.error("Failed to update completion status.");
        }
      } else {
        const endpoint = "/api/practical-completions";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ practicalId: id, completed: true }),
        });
        if (res.ok) {
          setPracticalCompletedIds((prev) => new Set([...prev, id]));
          toast.success("Practical marked as complete! 🎉");
        } else {
          toast.error("Failed to update completion status.");
        }
      }
    } catch {
      toast.error("Network error updating status.");
    } finally {
      setTogglingId(null);
    }
  }

  function handleOpenViewer(fileUrl?: string, title?: string) {
    if (!fileUrl) {
      toast.error("No document attached to this item.");
      return;
    }
    router.push(`/user/dashboard/viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(title || "Document")}`);
  }

  function handleDownload(fileUrl?: string, title?: string) {
    if (!fileUrl) {
      toast.error("No document file available for download.");
      return;
    }
    const a = document.createElement("a");
    a.href = fileUrl;
    a.target = "_blank";
    a.download = `${title || "document"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started...");
  }

  function setTabWithUrl(nextTab: TabType) {
    setTab(nextTab);
    const q = new URLSearchParams(searchParams.toString());
    q.set("tab", nextTab);
    router.replace(`/user/dashboard/pending-work?${q.toString()}`);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pending Work</h1>
        <p className="text-muted-foreground">
          Incomplete tasks with approaching deadlines for your stream.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTabWithUrl("assignments")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
            tab === "assignments" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Assignments ({pendingAssignments.length})
        </button>
        <button
          onClick={() => setTabWithUrl("practicals")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
            tab === "practicals" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Practicals ({pendingPracticals.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardContent className="p-5">
                <div className="h-16 rounded-lg bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "assignments" ? (
        pendingAssignments.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-green-500/80 mx-auto mb-2" />
              No pending assignments with approaching deadlines!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingAssignments.map((item, i) => (
              <Card key={item._id} className="rounded-2xl overflow-hidden border transition-all hover:border-primary/40 animate-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0 gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>📖 <strong>Subject:</strong> {item.subject?.name || "General"}</span>
                    <span>⏰ <strong>Due:</strong> {item.deadline ? new Date(item.deadline).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "No deadline"}</span>
                  </div>

                  {/* Interactive Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 text-xs gap-1.5"
                      onClick={() => handleToggleComplete(item._id, false)}
                      disabled={togglingId === item._id}
                    >
                      {togglingId === item._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                      Mark Complete
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => handleOpenViewer(item.file_url, item.title)}
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      Open
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => handleDownload(item.file_url, item.title)}
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : pendingPracticals.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-green-500/80 mx-auto mb-2" />
            No pending practicals with approaching deadlines!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingPracticals.map((item, i) => (
            <Card key={item._id} className="rounded-2xl overflow-hidden border transition-all hover:border-primary/40 animate-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0 gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>🧪 <strong>Subject:</strong> {item.subject?.name || "General"}</span>
                  <span>⏰ <strong>Due:</strong> {item.deadline ? new Date(item.deadline).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "No deadline"}</span>
                </div>

                {/* Interactive Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 text-xs gap-1.5"
                    onClick={() => handleToggleComplete(item._id, true)}
                    disabled={togglingId === item._id}
                  >
                    {togglingId === item._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    Mark Complete
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => handleOpenViewer(item.file_url, item.title)}
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Open
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => handleDownload(item.file_url, item.title)}
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
