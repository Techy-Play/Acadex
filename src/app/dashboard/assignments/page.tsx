"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AssignmentCard } from "@/components/assignment-card";
import { Card, CardContent } from "@/components/ui/card";
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

interface Assignment {
  _id: string;
  title: string;
  description: string;
  file_url: string;
  deadline: string | null;
  createdAt: string;
  subject: { _id: string; name: string };
}

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "all";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Fetch completions from server
  useEffect(() => {
    async function fetchCompletions() {
      try {
        const res = await fetch("/api/completions");
        if (res.ok) {
          const data = await res.json();
          setCompletedIds(new Set(data.completedIds || []));
        }
      } catch (error) {
        console.error("Failed to fetch completions:", error);
      }
    }
    fetchCompletions();
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
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
        await fetch(`/api/completions?assignmentId=${id}`, { method: "DELETE" });
      } else {
        await fetch("/api/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: id }),
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
  }, [completedIds]);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        setSubjects(data.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchSubjects();
  }, []);

  useEffect(() => {
    async function fetchAssignments() {
      setLoading(true);
      try {
        const url =
          selectedSubject === "all"
            ? "/api/assignments"
            : `/api/assignments?subject=${selectedSubject}`;
        const res = await fetch(url);
        const data = await res.json();
        setAssignments(data.assignments || []);
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, [selectedSubject]);

  // Sort assignments
  const sortedAssignments = [...assignments].sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "deadline":
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return 0;
    }
  });

  const completedCount = assignments.filter((a) => completedIds.has(a._id)).length;
  const totalCount = assignments.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Due-soon warnings (within 24 hours)
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueSoonAssignments = assignments.filter((a) => {
    if (!a.deadline || completedIds.has(a._id)) return false;
    const d = new Date(a.deadline);
    return d > now && d <= oneDayFromNow;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            Track your assignments &mdash; check them off as you complete them
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="deadline">Deadline (soonest)</SelectItem>
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
        </div>
      </div>

      {/* Due-soon warning banner */}
      {dueSoonAssignments.length > 0 && (
        <Card className="rounded-2xl border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  ⚠️ {dueSoonAssignments.length} assignment{dueSoonAssignments.length > 1 ? "s" : ""} due within 24 hours!
                </p>
                <ul className="mt-1.5 space-y-1">
                  {dueSoonAssignments.map((a) => (
                    <li key={a._id} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="font-medium">{a.title}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        &mdash; due {new Date(a.deadline!).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  Complete them now to stay on track!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      {!loading && totalCount > 0 && (
        <Card className="rounded-2xl border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progress: {completedCount} / {totalCount} completed
              </span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border p-6 animate-pulse"
            >
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
            📝
          </div>
          <h3 className="font-semibold text-lg">No assignments yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Assignments will appear here once they are posted by admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment._id}
              id={assignment._id}
              title={assignment.title}
              description={assignment.description}
              subjectName={assignment.subject?.name}
              deadline={assignment.deadline}
              fileUrl={assignment.file_url}
              createdAt={assignment.createdAt}
              completed={completedIds.has(assignment._id)}
              onToggleComplete={toggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
