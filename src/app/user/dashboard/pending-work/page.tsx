"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AssignmentItem {
  _id: string;
  title: string;
  deadline: string | null;
  subject: { _id: string; name: string };
}

interface PracticalItem {
  _id: string;
  title: string;
  deadline?: string | null;
  subject: { _id: string; name: string };
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
  const [loading, setLoading] = useState(true);
  const [referenceNow] = useState(() => Date.now());

  useEffect(() => {
    async function fetchData() {
      try {
        const [aRes, pRes, cRes, pcRes] = await Promise.all([
          fetch("/api/assignments"),
          fetch("/api/practicals"),
          fetch("/api/completions"),
          fetch("/api/practical-completions"),
        ]);

        const aData = await aRes.json();
        const pData = await pRes.json();
        const cData = cRes.ok ? await cRes.json() : { completedIds: [] };
        const pcData = pcRes.ok ? await pcRes.json() : { completedIds: [] };

        setAssignments(aData.assignments || []);
        setPracticals(pData.practicals || []);
        setAssignmentCompletedIds(new Set(cData.completedIds || []));
        setPracticalCompletedIds(new Set(pcData.completedIds || []));
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
      .filter((a) => a.deadline && new Date(a.deadline).getTime() <= cutoff)
      .sort((x, y) => {
        const dx = x.deadline ? new Date(x.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const dy = y.deadline ? new Date(y.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return dx - dy;
      });
  }, [assignments, assignmentCompletedIds, selectedSubject, referenceNow]);

  const pendingPracticals = useMemo(() => {
    const cutoff = referenceNow + 24 * 60 * 60 * 1000;
    return practicals
      .filter((p) => !practicalCompletedIds.has(p._id))
      .filter((p) => (selectedSubject === "all" ? true : p.subject?._id === selectedSubject))
      .filter((p) => p.deadline && new Date(p.deadline).getTime() <= cutoff)
      .sort((x, y) => {
        const dx = x.deadline ? new Date(x.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const dy = y.deadline ? new Date(y.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return dx - dy;
      });
  }, [practicals, practicalCompletedIds, selectedSubject, referenceNow]);

  function setTabWithUrl(nextTab: TabType) {
    setTab(nextTab);
    const q = new URLSearchParams(searchParams.toString());
    q.set("tab", nextTab);
    router.replace(`/user/dashboard/pending-work?${q.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pending Work</h1>
        <p className="text-muted-foreground">
          Incomplete items with approaching deadlines.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border p-1 w-fit">
        <button
          onClick={() => setTabWithUrl("assignments")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === "assignments" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          Assignments
        </button>
        <button
          onClick={() => setTabWithUrl("practicals")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            tab === "practicals" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          Practicals
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardContent className="p-5">
                <div className="h-14 rounded-lg bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "assignments" ? (
        pendingAssignments.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No pending assignments with near deadlines.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pendingAssignments.map((item, i) => (
              <Card key={item._id} className="rounded-2xl animate-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Subject: {item.subject?.name || "Unknown"}</p>
                  <p>
                    Due: {item.deadline ? new Date(item.deadline).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "No deadline"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : pendingPracticals.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No pending practicals with near deadlines.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pendingPracticals.map((item, i) => (
            <Card key={item._id} className="rounded-2xl animate-in slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Subject: {item.subject?.name || "Unknown"}</p>
                <p>
                  Due: {item.deadline ? new Date(item.deadline).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "No deadline"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
