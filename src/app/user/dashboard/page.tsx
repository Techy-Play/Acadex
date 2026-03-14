/**
 * @page UserDashboard (/user/dashboard)
 * @description Student dashboard home — displays subjects, quick stats,
 * and per-subject note/assignment/practical counts.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectCard } from "@/components/subject-card";
import { fetchMeCached } from "@/lib/client-auth";

interface Subject {
  _id: string;
  name: string;
  type?: "theory" | "practical";
  semester?: number;
}

interface NoteItem {
  _id: string;
  subject: { _id: string; name: string };
}

interface AssignmentItem {
  _id: string;
  title: string;
  deadline: string | null;
  subject: { _id: string; name: string };
}

interface PracticalItem {
  _id: string;
  title: string;
  subject: { _id: string; name: string };
}

interface StreamData {
  id: string;
  name: string;
  subjects: Subject[];
}

interface SectionData {
  id: string;
  name: string;
}

interface StatsData {
  subjects: Subject[];
  notes: NoteItem[];
  assignments: AssignmentItem[];
  practicals: PracticalItem[];
}

type ViewMode = "grid" | "list" | "detail";

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<StatsData>({
    subjects: [],
    notes: [],
    assignments: [],
    practicals: [],
  });
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [practicalCompletedIds, setPracticalCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<StreamData | null>(null);
  const [section, setSection] = useState<SectionData | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [subjectPopup, setSubjectPopup] = useState<{ id: string; name: string; type: string } | null>(null);
  const [progressPopup, setProgressPopup] = useState<"assignments" | "practicals" | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const goToSubjectResources = (subject: Subject) => {
    const resourcePath = subject.type === "practical"
      ? "/user/dashboard/practicals"
      : "/user/dashboard/notes";
    router.push(`${resourcePath}?subject=${subject._id}`);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Persist to DB
    fetch("/api/profile/update-theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboardView: mode }),
    }).catch(() => {});
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const mePromise = fetchMeCached();
        const [subjectsRes, notesRes, assignmentsRes, completionsRes, practicalsRes, practicalCompletionsRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/notes"),
          fetch("/api/assignments"),
          fetch("/api/completions"),
          fetch("/api/practicals"),
          fetch("/api/practical-completions"),
        ]);

        const subjectsData = await subjectsRes.json();
        const notesData = await notesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const completionsData = completionsRes.ok ? await completionsRes.json() : { completedIds: [] };
        const practicalsData = await practicalsRes.json();
        const practicalCompletionsData = practicalCompletionsRes.ok ? await practicalCompletionsRes.json() : { completedIds: [] };
        const meData = await mePromise;

        // Redirect banned/suspended users
        if (meData.user?.status === "banned" || meData.user?.status === "suspended") {
          router.replace("/account-restricted");
          return;
        }

        // Set stream info
        if (meData.user?.stream) {
          setStream(meData.user.stream);
        }
        if (meData.user?.section) {
          setSection(meData.user.section);
        }
        setSemester(meData.user?.semester || null);

        // Set dashboard view preference from DB
        if (meData.user?.dashboardView) {
          setViewMode(meData.user.dashboardView as ViewMode);
        }

        // Get stream subject IDs for filtering
        const streamSubjectIds: Set<string> | null = meData.user?.stream?.subjects?.length
          ? new Set(meData.user.stream.subjects.map((s: Subject) => s._id))
          : null;

        // Filter subjects by stream (if assigned)
        const allSubjects: Subject[] = subjectsData.subjects || [];
        const userSemester: number | null = meData.user?.semester || null;
        const filteredSubjects = allSubjects.filter((s) => {
          // Filter by stream
          if (streamSubjectIds && !streamSubjectIds.has(s._id)) return false;
          // Filter by semester
          if (userSemester && s.semester && s.semester !== userSemester) return false;
          return true;
        });

        // Filter notes, assignments, and practicals by semester-aware subject IDs
        const allNotes: NoteItem[] = notesData.notes || [];
        const allAssignments: AssignmentItem[] = assignmentsData.assignments || [];
        const allPracticals: PracticalItem[] = practicalsData.practicals || [];

        const filteredSubjectIds = new Set(filteredSubjects.map((s) => s._id));

        const filteredNotes = allNotes.filter(
          (n) => n.subject && filteredSubjectIds.has(n.subject._id)
        );

        const filteredAssignments = allAssignments.filter(
          (a) => a.subject && filteredSubjectIds.has(a.subject._id)
        );

        const filteredPracticals = allPracticals.filter(
          (p) => p.subject && filteredSubjectIds.has(p.subject._id)
        );

        setData({
          subjects: filteredSubjects,
          notes: filteredNotes,
          assignments: filteredAssignments,
          practicals: filteredPracticals,
        });
        setCompletedIds(new Set(completionsData.completedIds || []));
        setPracticalCompletedIds(new Set(practicalCompletionsData.completedIds || []));
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute per-subject counts
  const noteCountBySubject: Record<string, number> = {};
  const assignmentCountBySubject: Record<string, number> = {};
  const completedBySubject: Record<string, number> = {};
  const practicalCountBySubject: Record<string, number> = {};
  const practicalCompletedBySubject: Record<string, number> = {};

  for (const note of data.notes) {
    const sid = note.subject?._id;
    if (sid) noteCountBySubject[sid] = (noteCountBySubject[sid] || 0) + 1;
  }
  for (const assignment of data.assignments) {
    const sid = assignment.subject?._id;
    if (sid) {
      assignmentCountBySubject[sid] = (assignmentCountBySubject[sid] || 0) + 1;
      if (completedIds.has(assignment._id)) {
        completedBySubject[sid] = (completedBySubject[sid] || 0) + 1;
      }
    }
  }
  for (const practical of data.practicals) {
    const sid = practical.subject?._id;
    if (sid) {
      practicalCountBySubject[sid] = (practicalCountBySubject[sid] || 0) + 1;
      if (practicalCompletedIds.has(practical._id)) {
        practicalCompletedBySubject[sid] = (practicalCompletedBySubject[sid] || 0) + 1;
      }
    }
  }

  // Overall progress (assignments)
  const totalAssignments = data.assignments.length;
  const totalCompleted = data.assignments.filter((a) =>
    completedIds.has(a._id)
  ).length;
  const overallPercent =
    totalAssignments > 0
      ? Math.round((totalCompleted / totalAssignments) * 100)
      : 0;

  // Overall progress (practicals)
  const totalPracticals = data.practicals.length;
  const totalPracticalsCompleted = data.practicals.filter((p) =>
    practicalCompletedIds.has(p._id)
  ).length;
  const practicalPercent =
    totalPracticals > 0
      ? Math.round((totalPracticalsCompleted / totalPracticals) * 100)
      : 0;

  // Upcoming deadlines (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcomingDeadlines = data.assignments.filter((a) => {
    if (!a.deadline || completedIds.has(a._id)) return false;
    const d = new Date(a.deadline);
    return d >= now && d <= weekFromNow;
  }).length;

  // Due within 24 hours (urgent)
  const dueSoonAssignments = data.assignments.filter((a) => {
    if (!a.deadline || completedIds.has(a._id)) return false;
    const d = new Date(a.deadline);
    return d > now && d <= oneDayFromNow;
  });

  const overdueCount = data.assignments.filter((a) => {
    if (!a.deadline || completedIds.has(a._id)) return false;
    return new Date(a.deadline) < now;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your academic hub...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Acadex</p>
        {(stream || semester || section) && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            🎓 {stream?.name || "No Stream"} - Section: {section?.name || "No Section"}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {/* Subjects */}
        <Card
          className="rounded-2xl border-0 bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => document.getElementById("section-subjects")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">Subjects</p>
                <p className="text-3xl font-bold mt-1">{data.subjects.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card
          className="rounded-2xl border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => document.getElementById("section-subjects")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-100">Notes</p>
                <p className="text-3xl font-bold mt-1">{data.notes.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card
          className="rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => router.push("/user/dashboard/assignments?highlight=true")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">Assignments</p>
                <p className="text-3xl font-bold mt-1">{data.assignments.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practicals */}
        <Card
          className="rounded-2xl border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => router.push("/user/dashboard/practicals?highlight=true")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-100">Practicals</p>
                <p className="text-3xl font-bold mt-1">{data.practicals.length}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card
          className="rounded-2xl border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => document.getElementById("section-progress")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-100">Completed</p>
                <p className="text-3xl font-bold mt-1">
                  {totalCompleted + totalPracticalsCompleted}
                  <span className="text-base font-normal text-amber-100">/{totalAssignments + totalPracticals}</span>
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Due-Soon Warning Banner */}
      {dueSoonAssignments.length > 0 && (
        <Card className="rounded-2xl border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 shadow-lg shadow-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  ⚠️ {dueSoonAssignments.length} assignment{dueSoonAssignments.length > 1 ? "s" : ""} due within 24 hours — complete them now!
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dueSoonAssignments.map((a) => (
                    <li key={a._id} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="font-medium">{a.title}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        — due {new Date(a.deadline!).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push("/user/dashboard/assignments")}
                  className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2"
                >
                  Go to Assignments →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Progress Section */}
      <div id="section-progress" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Your Progress
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setProgressPopup("assignments")}>
          <CardContent className="p-5 flex items-center gap-5">
            {/* SVG Gauge */}
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-purple-500"
                  strokeDasharray={`${overallPercent * 2.639} 263.9`}
                  style={{ transition: "stroke-dasharray 1s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{overallPercent}%</span>
                <span className="text-[10px] text-muted-foreground leading-none">done</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <svg className="h-4 w-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Assignments
              </h3>
              <p className="text-xs text-muted-foreground">{totalCompleted} of {totalAssignments} completed</p>
              <div className="text-2xl">
                {overallPercent === 100 ? "🎉" : overallPercent >= 50 ? "📈" : "💪"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practical Gauge */}
        <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => setProgressPopup("practicals")}>
          <CardContent className="p-5 flex items-center gap-5">
            {/* SVG Gauge */}
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-teal-500"
                  strokeDasharray={`${practicalPercent * 2.639} 263.9`}
                  style={{ transition: "stroke-dasharray 1s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{practicalPercent}%</span>
                <span className="text-[10px] text-muted-foreground leading-none">done</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <svg className="h-4 w-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Practicals
              </h3>
              <p className="text-xs text-muted-foreground">{totalPracticalsCompleted} of {totalPracticals} completed</p>
              <div className="text-2xl">
                {practicalPercent === 100 ? "🎉" : practicalPercent >= 50 ? "🧪" : "🔬"}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Quick Overview */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Upcoming */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{upcomingDeadlines} due this week</p>
                <p className="text-xs text-muted-foreground">Upcoming deadlines</p>
              </div>
            </div>

            {/* Overdue */}
            <div className={`flex items-center gap-3 p-3 rounded-xl ${overdueCount > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}`}>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${overdueCount > 0 ? "bg-red-100 dark:bg-red-900/50" : "bg-green-100 dark:bg-green-900/50"}`}>
                {overdueCount > 0 ? (
                  <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {overdueCount > 0 ? `${overdueCount} overdue` : "All caught up!"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {overdueCount > 0 ? "Past deadline" : "No overdue assignments"}
                </p>
              </div>
            </div>

            {/* Pending Assignments */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {totalAssignments - totalCompleted} pending
                </p>
                <p className="text-xs text-muted-foreground">Assignments remaining</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Grid — Grouped by Type */}
      <div id="section-subjects" className="scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-lg font-semibold">Your Subjects</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => handleViewChange("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"}`}
                title="Grid View"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => handleViewChange("list")}
                className={`p-2 transition-colors border-x ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"}`}
                title="List View"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => handleViewChange("detail")}
                className={`p-2 transition-colors ${viewMode === "detail" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"}`}
                title="Detail View"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                </svg>
              </button>
            </div>
            <div className="flex gap-3 text-sm">
              <button
                onClick={() => router.push("/user/dashboard/practicals")}
                className="text-teal-600 dark:text-teal-400 hover:underline font-medium whitespace-nowrap"
              >
                Practicals →
              </button>
              <button
                onClick={() => router.push("/user/dashboard/assignments")}
                className="text-primary hover:underline font-medium whitespace-nowrap"
              >
                Assignments →
              </button>
            </div>
          </div>
        </div>

        {/* Render subjects based on view mode */}
        {renderSubjectsByView(data.subjects.filter(s => s.type !== "practical"), "Theory", "📖")}
        {renderSubjectsByView(data.subjects.filter(s => s.type === "practical"), "Practical", "🧪")}
      </div>

      {/* Subject Popup */}
      {subjectPopup && (() => {
        const popupNotes = data.notes.filter(n => n.subject?._id === subjectPopup.id).length;
        const popupAssignTotal = data.assignments.filter(a => a.subject?._id === subjectPopup.id).length;
        const popupAssignDone = data.assignments.filter(a => a.subject?._id === subjectPopup.id && completedIds.has(a._id)).length;
        const popupAssignPct = popupAssignTotal > 0 ? Math.round((popupAssignDone / popupAssignTotal) * 100) : 0;
        const popupPracTotal = data.practicals.filter(p => p.subject?._id === subjectPopup.id).length;
        const popupPracDone = data.practicals.filter(p => p.subject?._id === subjectPopup.id && practicalCompletedIds.has(p._id)).length;
        const popupPracPct = popupPracTotal > 0 ? Math.round((popupPracDone / popupPracTotal) * 100) : 0;
        const isLab = subjectPopup.type === "practical";

        const emptyQuips = [
          "Nothing to see here... move along! 👀",
          "Tumbleweeds rolling through... 🌵",
          "Even the crickets left 🦗",
          "This is emptier than my motivation on Monday 😴",
          "Plot twist: there's nothing here 🎬",
          "404: Content not found... oh wait, wrong error 😅",
          "The content is on vacation 🏖️",
          "Looks like someone forgot to upload... 🤷",
        ];
        const getQuip = () => emptyQuips[Math.floor(Math.random() * emptyQuips.length)];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSubjectPopup(null)}>
            <div
              className="bg-card border rounded-2xl shadow-2xl p-6 w-[90vw] max-w-sm space-y-5 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold tracking-tight">{subjectPopup.name}</h3>
                <span className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {isLab ? "Lab" : "Theory"}
                </span>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {/* Notes */}
                <button
                  onClick={() => { router.push(`/user/dashboard/notes?subject=${subjectPopup.id}`); setSubjectPopup(null); }}
                  className="w-full flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3.5 text-left hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">Notes</p>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{popupNotes}</span>
                    </div>
                    {popupNotes === 0
                      ? <p className="text-xs text-muted-foreground italic">{getQuip()}</p>
                      : <p className="text-xs text-muted-foreground">{popupNotes} {popupNotes === 1 ? "note" : "notes"} uploaded</p>
                    }
                  </div>
                </button>

                {/* Assignments — only for theory subjects */}
                {!isLab && (
                  <button
                    onClick={() => { router.push(`/user/dashboard/assignments?subject=${subjectPopup.id}`); setSubjectPopup(null); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-4 py-3.5 text-left hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-white shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">Assignments</p>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{popupAssignDone}/{popupAssignTotal}</span>
                      </div>
                      {popupAssignTotal === 0
                        ? <p className="text-xs text-muted-foreground italic">{getQuip()}</p>
                        : <>
                            <div className="mt-1.5 w-full h-1.5 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${popupAssignPct === 100 ? "bg-emerald-500" : "bg-purple-500"}`}
                                style={{ width: `${popupAssignPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{popupAssignPct}% completed</p>
                          </>
                      }
                    </div>
                  </button>
                )}

                {/* Practicals — only for lab subjects */}
                {isLab && (
                  <button
                    onClick={() => { router.push(`/user/dashboard/practicals?subject=${subjectPopup.id}`); setSubjectPopup(null); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 px-4 py-3.5 text-left hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 text-white shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">Practicals</p>
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{popupPracDone}/{popupPracTotal}</span>
                      </div>
                      {popupPracTotal === 0
                        ? <p className="text-xs text-muted-foreground italic">{getQuip()}</p>
                        : <>
                            <div className="mt-1.5 w-full h-1.5 bg-teal-200 dark:bg-teal-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${popupPracPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-500"}`}
                                style={{ width: `${popupPracPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{popupPracPct}% completed</p>
                          </>
                      }
                    </div>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSubjectPopup(null)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Progress Details Popup */}
      {progressPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setProgressPopup(null)}
        >
          <div
            className="bg-card border rounded-2xl shadow-2xl p-6 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                {progressPopup === "assignments" ? (
                  <>
                    <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Assignment Progress
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Practical Progress
                  </>
                )}
              </h3>
              <button
                onClick={() => setProgressPopup(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Assignments by subject */}
            {progressPopup === "assignments" && (() => {
              const theoryWithAssign = data.subjects.filter(
                (s) => s.type !== "practical" && (assignmentCountBySubject[s._id] || 0) > 0
              );
              if (theoryWithAssign.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No assignments found.</p>;
              return (
                <div className="space-y-2.5">
                  {theoryWithAssign.map((s, i) => {
                    const total = assignmentCountBySubject[s._id] || 0;
                    const done = completedBySubject[s._id] || 0;
                    const remaining = total - done;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={s._id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <Link
                              href={`/user/dashboard/notes?subject=${s._id}`}
                              onClick={() => setProgressPopup(null)}
                              className="text-sm font-medium truncate hover:text-purple-500 hover:underline transition-colors"
                            >
                              {s.name}
                            </Link>
                            <span className={`text-xs font-semibold ml-2 shrink-0 ${pct === 100 ? "text-emerald-500" : "text-purple-600 dark:text-purple-400"}`}>
                              {done}/{total}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-purple-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Practicals by subject */}
            {progressPopup === "practicals" && (() => {
              const labWithPrac = data.subjects.filter(
                (s) => s.type === "practical" && (practicalCountBySubject[s._id] || 0) > 0
              );
              if (labWithPrac.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No practicals found.</p>;
              return (
                <div className="space-y-2.5">
                  {labWithPrac.map((s, i) => {
                    const total = practicalCountBySubject[s._id] || 0;
                    const done = practicalCompletedBySubject[s._id] || 0;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={s._id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <Link
                              href={`/user/dashboard/practicals?subject=${s._id}`}
                              onClick={() => setProgressPopup(null)}
                              className="text-sm font-medium truncate hover:text-teal-500 hover:underline transition-colors"
                            >
                              {s.name}
                            </Link>
                            <span className={`text-xs font-semibold ml-2 shrink-0 ${pct === 100 ? "text-emerald-500" : "text-teal-600 dark:text-teal-400"}`}>
                              {done}/{total}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <button
              onClick={() => setProgressPopup(null)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function renderSubjectsByView(subjects: Subject[], label: string, emoji: string) {
    if (subjects.length === 0) return null;
    const isTheory = label === "Theory";

    return (
      <div className={label === "Theory" ? "mb-6" : ""}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{emoji}</span>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</h3>
          <div className="flex-1 h-px bg-border" />
        </div>

        {viewMode === "grid" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const assignTotal = assignmentCountBySubject[subject._id] || 0;
              const assignDone = completedBySubject[subject._id] || 0;
              const pracTotal = practicalCountBySubject[subject._id] || 0;
              const pracDone = practicalCompletedBySubject[subject._id] || 0;
              return (
                <SubjectCard
                  key={subject._id}
                  name={subject.name}
                  noteCount={noteCountBySubject[subject._id] || 0}
                  assignmentCount={assignTotal}
                  completedCount={assignDone}
                  practicalCount={pracTotal}
                  practicalCompletedCount={pracDone}
                  onClick={() => goToSubjectResources(subject)}
                />
              );
            })}
          </div>
        )}

        {viewMode === "list" && (
          <>
            {/* Mobile: card-based list */}
            <div className="space-y-2 sm:hidden">
              {subjects.map((subject) => {
                const assignTotal = assignmentCountBySubject[subject._id] || 0;
                const assignDone = completedBySubject[subject._id] || 0;
                const pracTotal = practicalCountBySubject[subject._id] || 0;
                const pracDone = practicalCompletedBySubject[subject._id] || 0;
                const totalTasks = assignTotal + pracTotal;
                const totalDone = assignDone + pracDone;
                const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

                return (
                  <div
                    key={subject._id}
                    className="flex items-center gap-3 p-3 border rounded-xl hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => goToSubjectResources(subject)}
                  >
                    <span className="text-lg shrink-0">📚</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{subject.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">{noteCountBySubject[subject._id] || 0} notes</span>
                        {isTheory && (
                          <span className="text-purple-600 dark:text-purple-400">{assignDone}/{assignTotal} assign</span>
                        )}
                        {subject.type === "practical" && <span className="text-teal-600 dark:text-teal-400">{pracDone}/{pracTotal} prac</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-7 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="border rounded-xl overflow-hidden hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Subject</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Notes</th>
                    {isTheory && <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Assignments</th>}
                    {!isTheory && <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Practicals</th>}
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subjects.map((subject) => {
                    const assignTotal = assignmentCountBySubject[subject._id] || 0;
                    const assignDone = completedBySubject[subject._id] || 0;
                    const pracTotal = practicalCountBySubject[subject._id] || 0;
                    const pracDone = practicalCompletedBySubject[subject._id] || 0;
                    const totalTasks = assignTotal + pracTotal;
                    const totalDone = assignDone + pracDone;
                    const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

                    return (
                      <tr
                        key={subject._id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => goToSubjectResources(subject)}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📚</span>
                            {subject.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            {noteCountBySubject[subject._id] || 0}
                          </span>
                        </td>
                        {isTheory && (
                          <td className="px-4 py-3 text-center">
                            <span className="text-purple-600 dark:text-purple-400">{assignDone}/{assignTotal}</span>
                          </td>
                        )}
                        {!isTheory && (
                          <td className="px-4 py-3 text-center">
                            <span className="text-teal-600 dark:text-teal-400">{pracDone}/{pracTotal}</span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {viewMode === "detail" && (
          <div className="space-y-4">
            {subjects.map((subject) => {
              const notes = noteCountBySubject[subject._id] || 0;
              const assignTotal = assignmentCountBySubject[subject._id] || 0;
              const assignDone = completedBySubject[subject._id] || 0;
              const pracTotal = practicalCountBySubject[subject._id] || 0;
              const pracDone = practicalCompletedBySubject[subject._id] || 0;
              const assignPct = assignTotal > 0 ? Math.round((assignDone / assignTotal) * 100) : 0;
              const pracPct = pracTotal > 0 ? Math.round((pracDone / pracTotal) * 100) : 0;

              // Find upcoming deadlines for this subject
              const subjectDeadlines = data.assignments
                .filter((a) => a.subject?._id === subject._id && a.deadline && !completedIds.has(a._id) && new Date(a.deadline) >= now)
                .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
                .slice(0, 3);

              return (
                <Card
                  key={subject._id}
                  className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
                  onClick={() => goToSubjectResources(subject)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                          📚
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{subject.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{subject.type || "theory"} subject</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {notes} notes
                      </span>
                    </div>

                    <div className="grid gap-4">
                      {isTheory && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              Assignments
                            </span>
                            <span className="font-medium">{assignDone}/{assignTotal}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${assignPct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${assignPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {!isTheory && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                              </svg>
                              Practicals
                            </span>
                            <span className="font-medium">{pracDone}/{pracTotal}</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pracPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-500"}`}
                              style={{ width: `${pracPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upcoming Deadlines */}
                    {subjectDeadlines.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Upcoming Deadlines</p>
                        <div className="space-y-1.5">
                          {subjectDeadlines.map((a) => (
                            <div key={a._id} className="flex items-center justify-between text-xs">
                              <span className="font-medium truncate mr-2">{a.title}</span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(a.deadline!).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
