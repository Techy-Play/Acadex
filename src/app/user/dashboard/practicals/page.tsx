/**
 * @page UserPracticals (/user/dashboard/practicals)
 * @description Lists practicals with subject/search filters and completion toggles.
 */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
  semester?: number;
}

interface SectionItem {
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
  section?: { _id: string; name: string } | null;
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
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [userSectionId, setUserSectionId] = useState<string | null>(null);
  const [userSectionName, setUserSectionName] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("my-section");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);
  const highlightTriggeredRef = useRef(false);

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
        const [subjectsRes, meRes, sectionsRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/auth/me"),
          fetch("/api/sections"),
        ]);
        const subjectsData = await subjectsRes.json();
        const meData = meRes.ok ? await meRes.json() : { user: {} };
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
    async function fetchPracticals() {
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

        const url = params.toString() ? `/api/practicals?${params}` : "/api/practicals";
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
  }, [selectedSubject, streamSubjectIds, selectedSection]);

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
    const grouped: Record<string, { subjectId: string; subjectName: string; practicals: Practical[] }> = {};
    for (const p of sortedPracticals) {
      const subjectId = p.subject?._id || "unknown";
      const subjectName = p.subject?.name || "Unknown";
      if (!grouped[subjectId]) {
        grouped[subjectId] = { subjectId, subjectName, practicals: [] };
      }
      grouped[subjectId].practicals.push(p);
    }
    return Object.values(grouped).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [sortedPracticals]);

  // Auto-expand selected subject when a specific subject filter is applied.
  useEffect(() => {
    if (selectedSubject === "all") {
      setExpandedSubjectId(null);
      return;
    }
    const exists = groupedPracticals.some((g) => g.subjectId === selectedSubject);
    setExpandedSubjectId(exists ? selectedSubject : null);
  }, [selectedSubject, groupedPracticals]);

  // Highlight subject groups when navigated from dashboard with ?highlight=true
  useEffect(() => {
    if (
      !loading &&
      searchParams.get("highlight") === "true" &&
      groupedPracticals.length > 0 &&
      !highlightTriggeredRef.current
    ) {
      highlightTriggeredRef.current = true;
      document.getElementById("practical-subject-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setShouldHighlight(true);
      const timer = setTimeout(() => setShouldHighlight(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [loading, searchParams, groupedPracticals.length]);

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
        <div className="space-y-3 scroll-mt-4" id="practical-subject-list">
          {groupedPracticals.map((group) => {
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
                        🧪
                      </span>
                      <CardTitle className="text-sm font-medium truncate">
                        {group.subjectName}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-xs flex-shrink-0"
                      >
                        {group.practicals.length}
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
                        {group.practicals.map((practical) => (
                          <AssignmentCard
                            key={practical._id}
                            id={practical._id}
                            title={practical.title}
                            description={practical.description}
                            subjectName={practical.subject?.name}
                            subjectId={practical.subject?._id}
                            deadline={null}
                            fileUrl={practical.file_url}
                            createdAt={practical.createdAt}
                            completed={completedIds.has(practical._id)}
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
