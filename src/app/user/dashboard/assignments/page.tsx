/**
 * @page UserAssignments (/user/dashboard/assignments)
 * @description Lists assignments with subject/search filters and completion toggles.
 */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { AssignmentCard } from "@/components/assignment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMeCached } from "@/lib/client-auth";
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
  type?: "theory" | "practical";
  semester?: number;
}

interface SectionItem {
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
  section?: { _id: string; name: string } | null;
}

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "all";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streamSubjectIds, setStreamSubjectIds] = useState<Set<string> | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [userSectionId, setUserSectionId] = useState<string | null>(null);
  const [userSectionName, setUserSectionName] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("my-section");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);
  const highlightTriggeredRef = useRef(false);

  const assignmentFilterSubjects = useMemo(
    () => subjects.filter((s) => s.type !== "practical"),
    [subjects]
  );

  // Keep subject filter in sync when navigating to this page with a query subject.
  useEffect(() => {
    const querySubject = searchParams.get("subject") || "all";
    setSelectedSubject((prev) => (prev === querySubject ? prev : querySubject));
  }, [searchParams]);

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
    async function fetchInit() {
      try {
        const mePromise = fetchMeCached();
        const [subjectsRes, sectionsRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/sections"),
        ]);
        const subjectsData = await subjectsRes.json();
        const meData = await mePromise;
        const sectionsData = sectionsRes.ok ? await sectionsRes.json() : { sections: [] };

        setSections(sectionsData.sections || []);

        // Set user's section
        if (meData.user?.section?.id) {
          setUserSectionId(meData.user.section.id);
          setUserSectionName(meData.user.section.name);
        }

        const allSubjects: Subject[] = subjectsData.subjects || [];

        // Filter subjects by user's semester (super admin gets all subjects from API)
        const userSemester: number | null = meData.user?.semester || null;
        const semesterSubjects = allSubjects.filter((s) => {
          if (userSemester && s.semester && s.semester !== userSemester) return false;
          return true;
        });

        const visibleSubjectIds = new Set(semesterSubjects.map((s) => s._id));
        setStreamSubjectIds(visibleSubjectIds);
        setSubjects(semesterSubjects);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchInit();
  }, []);

  useEffect(() => {
    async function fetchAssignments() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSubject !== "all") params.set("subject", selectedSubject);

        // Section filter
        if (selectedSection === "all") {
          params.set("section", "all");
        } else if (selectedSection !== "my-section" && selectedSection) {
          params.set("section", selectedSection);
        }

        const url = params.toString() ? `/api/assignments?${params}` : "/api/assignments";
        const res = await fetch(url);
        const data = await res.json();
        let allAssignments: Assignment[] = data.assignments || [];

        // Filter by stream subjects if applicable and viewing "all"
        if (selectedSubject === "all" && streamSubjectIds) {
          allAssignments = allAssignments.filter((a) => a.subject && streamSubjectIds.has(a.subject._id));
        }

        setAssignments(allAssignments);
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, [selectedSubject, streamSubjectIds, selectedSection]);

  useEffect(() => {
    if (selectedSubject === "all") return;
    if (assignmentFilterSubjects.length === 0) return;
    const exists = assignmentFilterSubjects.some((s) => s._id === selectedSubject);
    if (!exists) setSelectedSubject("all");
  }, [assignmentFilterSubjects, selectedSubject]);

  // Filter by status then sort
  const sortedAssignments = useMemo(() => {
    const filtered = assignments.filter((a) => {
      if (statusFilter === "completed") return completedIds.has(a._id);
      if (statusFilter === "pending") return !completedIds.has(a._id);
      return true;
    });
    return [...filtered].sort((a, b) => {
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
      case "name-az":
        return a.title.localeCompare(b.title);
      case "name-za":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });
  }, [assignments, statusFilter, sortOrder, completedIds]);

  // Group assignments by subject
  const groupedAssignments = useMemo(() => {
    const grouped: Record<string, { subjectId: string; subjectName: string; assignments: Assignment[] }> = {};
    for (const a of sortedAssignments) {
      const subjectId = a.subject?._id || "unknown";
      const subjectName = a.subject?.name || "Unknown";
      if (!grouped[subjectId]) {
        grouped[subjectId] = { subjectId, subjectName, assignments: [] };
      }
      grouped[subjectId].assignments.push(a);
    }
    return Object.values(grouped).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [sortedAssignments]);

  // Auto-expand selected subject when a specific subject filter is applied.
  useEffect(() => {
    if (selectedSubject === "all") return;
    const exists = groupedAssignments.some((g) => g.subjectId === selectedSubject);
    setExpandedSubjectId(exists ? selectedSubject : null);
  }, [selectedSubject, groupedAssignments]);

  // Highlight subject groups when navigated from dashboard with ?highlight=true
  useEffect(() => {
    if (
      !loading &&
      searchParams.get("highlight") === "true" &&
      groupedAssignments.length > 0 &&
      !highlightTriggeredRef.current
    ) {
      highlightTriggeredRef.current = true;
      document.getElementById("assignment-subject-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setShouldHighlight(true);
      const timer = setTimeout(() => setShouldHighlight(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams, groupedAssignments.length]);

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
              <SelectItem value="deadline">Deadline (soonest)</SelectItem>
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
              {assignmentFilterSubjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="my-section">
                🏫 {userSectionName || "My Section"}
              </SelectItem>
              <SelectItem value="all">All Sections</SelectItem>
              {sections
                .filter((s) => s._id !== userSectionId)
                .map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    🏫 {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || sortOrder !== "newest" || selectedSubject !== "all" || selectedSection !== "my-section") && (
            <button
              className="text-xs text-primary hover:underline whitespace-nowrap"
              onClick={() => {
                setStatusFilter("all");
                setSortOrder("newest");
                setSelectedSubject("all");
                setSelectedSection("my-section");
              }}
            >
              Reset filters
            </button>
          )}
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
              <span className="text-sm font-bold text-primary">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments Grouped by Subject */}
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
        <div className="space-y-3 scroll-mt-4" id="assignment-subject-list">
          {groupedAssignments.map((group) => {
            const isExpanded =
              selectedSubject === "all"
                ? expandedSubjectId === group.subjectId
                : group.subjectId === selectedSubject;

            return (
              <Card
                key={group.subjectId}
                className={`rounded-2xl overflow-hidden ${
                  shouldHighlight ? "animate-subject-highlight" : ""
                } py-0 gap-0`}
              >
                <CardHeader className="p-0">
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted/50 ${
                      selectedSubject !== "all" ? "cursor-default" : "cursor-pointer"
                    }`}
                    onClick={() => {
                      if (selectedSubject !== "all") return;
                      setExpandedSubjectId((prev) =>
                        prev === group.subjectId ? null : group.subjectId
                      );
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-muted text-xs">
                        📝
                      </span>
                      <CardTitle className="text-sm font-medium truncate">
                        {group.subjectName}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-xs flex-shrink-0"
                      >
                        {group.assignments.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={`flex-shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CardHeader>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <CardContent className="pt-2 pb-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.assignments.map((assignment) => (
                          <AssignmentCard
                            key={assignment._id}
                            id={assignment._id}
                            title={assignment.title}
                            description={assignment.description}
                            subjectName={assignment.subject?.name}
                            subjectId={assignment.subject?._id}
                            deadline={assignment.deadline}
                            fileUrl={assignment.file_url}
                            createdAt={assignment.createdAt}
                            completed={completedIds.has(assignment._id)}
                            onToggleComplete={toggleComplete}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
