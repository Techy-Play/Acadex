"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AssignmentCard } from "@/components/assignment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  _id: string;
  name: string;
}

interface Practical {
  _id: string;
  title: string;
  description: string;
  file_url: string;
  createdAt: string;
  subject: { _id: string; name: string };
}

export default function PracticalsPage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "all";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streamSubjectIds, setStreamSubjectIds] = useState<Set<string> | null>(
    null
  );

  // Fetch completions from server
  useEffect(() => {
    async function fetchCompletions() {
      try {
        const res = await fetch("/api/practical-completions");
        if (res.ok) {
          const data = await res.json();
          setCompletedIds(new Set(data.completedIds || []));
        }
      } catch (error) {
        console.error("Failed to fetch practical completions:", error);
      }
    }
    fetchCompletions();
  }, []);

  const toggleComplete = useCallback(
    async (id: string) => {
      const isCompleted = completedIds.has(id);

      // Optimistic update
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });

      try {
        if (isCompleted) {
          await fetch(`/api/practical-completions?practicalId=${id}`, {
            method: "DELETE",
          });
        } else {
          await fetch("/api/practical-completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ practicalId: id }),
          });
        }
      } catch {
        // Revert on error
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (isCompleted) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [completedIds]
  );

  useEffect(() => {
    async function fetchInit() {
      try {
        const [subjectsRes, meRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/auth/me"),
        ]);
        const subjectsData = await subjectsRes.json();
        const meData = meRes.ok ? await meRes.json() : { user: {} };

        const allSubjects: Subject[] = subjectsData.subjects || [];

        if (meData.user?.stream?.subjects?.length) {
          const ssIds = new Set<string>(
            meData.user.stream.subjects.map((s: { _id: string }) => s._id)
          );
          setStreamSubjectIds(ssIds);
          setSubjects(allSubjects.filter((s) => ssIds.has(s._id)));
        } else {
          setSubjects(allSubjects);
        }
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchInit();
  }, []);

  useEffect(() => {
    async function fetchPracticals() {
      setLoading(true);
      try {
        const url =
          selectedSubject === "all"
            ? "/api/practicals"
            : `/api/practicals?subject=${selectedSubject}`;
        const res = await fetch(url);
        const data = await res.json();
        let allPracticals: Practical[] = data.practicals || [];

        // Filter by stream subjects if applicable and viewing "all"
        if (selectedSubject === "all" && streamSubjectIds) {
          allPracticals = allPracticals.filter(
            (p) => p.subject && streamSubjectIds.has(p.subject._id)
          );
        }

        setPracticals(allPracticals);
      } catch (error) {
        console.error("Failed to fetch practicals:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPracticals();
  }, [selectedSubject, streamSubjectIds]);

  // Filter by status then sort
  const sortedPracticals = useMemo(() => {
    const filtered = practicals.filter((p) => {
      if (statusFilter === "completed") return completedIds.has(p._id);
      if (statusFilter === "pending") return !completedIds.has(p._id);
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-az":
          return a.title.localeCompare(b.title);
        case "name-za":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [practicals, statusFilter, sortOrder, completedIds]);

  // Group practicals by subject
  const groupedPracticals = useMemo(() => {
    const grouped: Record<string, Practical[]> = {};
    for (const p of sortedPracticals) {
      const subjectName = p.subject?.name || "Unknown";
      if (!grouped[subjectName]) grouped[subjectName] = [];
      grouped[subjectName].push(p);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedPracticals]);

  const completedCount = practicals.filter((p) =>
    completedIds.has(p._id)
  ).length;
  const totalCount = practicals.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practicals</h1>
          <p className="text-muted-foreground">
            Track your practicals &mdash; check them off as you complete them
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-az">Name A-Z</SelectItem>
              <SelectItem value="name-za">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || sortOrder !== "newest" || selectedSubject !== "all") && (
            <button
              className="text-xs text-primary hover:underline whitespace-nowrap"
              onClick={() => {
                setStatusFilter("all");
                setSortOrder("newest");
                setSelectedSubject("all");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!loading && totalCount > 0 && (
        <Card className="rounded-2xl border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progress: {completedCount} / {totalCount} completed
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practicals Grouped by Subject */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 w-40 bg-muted rounded-lg" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-28 bg-muted rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : practicals.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
            🧪
          </div>
          <h3 className="font-semibold text-lg">No practicals yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Practicals will appear here once they are posted by admin.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedPracticals.map(([subjectName, subjectPracticals]) => (
            <Card key={subjectName} className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    🧪 {subjectName}
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {subjectPracticals.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjectPracticals.map((practical) => (
                    <AssignmentCard
                      key={practical._id}
                      id={practical._id}
                      title={practical.title}
                      description={practical.description}
                      subjectName={practical.subject?.name}
                      deadline={null}
                      fileUrl={practical.file_url}
                      createdAt={practical.createdAt}
                      completed={completedIds.has(practical._id)}
                      onToggleComplete={toggleComplete}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
