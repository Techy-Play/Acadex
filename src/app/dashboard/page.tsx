"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectCard } from "@/components/subject-card";

interface Subject {
  _id: string;
  name: string;
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

interface StatsData {
  subjects: Subject[];
  notes: NoteItem[];
  assignments: AssignmentItem[];
  practicals: PracticalItem[];
}

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

  useEffect(() => {
    async function fetchData() {
      try {
        const [subjectsRes, notesRes, assignmentsRes, completionsRes, practicalsRes, practicalCompletionsRes, meRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/notes"),
          fetch("/api/assignments"),
          fetch("/api/completions"),
          fetch("/api/practicals"),
          fetch("/api/practical-completions"),
          fetch("/api/auth/me"),
        ]);

        const subjectsData = await subjectsRes.json();
        const notesData = await notesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const completionsData = completionsRes.ok ? await completionsRes.json() : { completedIds: [] };
        const practicalsData = await practicalsRes.json();
        const practicalCompletionsData = practicalCompletionsRes.ok ? await practicalCompletionsRes.json() : { completedIds: [] };
        const meData = meRes.ok ? await meRes.json() : { user: {} };

        // Set stream info
        if (meData.user?.stream) {
          setStream(meData.user.stream);
        }

        // Get stream subject IDs for filtering
        const streamSubjectIds: Set<string> | null = meData.user?.stream?.subjects?.length
          ? new Set(meData.user.stream.subjects.map((s: Subject) => s._id))
          : null;

        // Filter subjects by stream (if assigned)
        const allSubjects: Subject[] = subjectsData.subjects || [];
        const filteredSubjects = streamSubjectIds
          ? allSubjects.filter((s) => streamSubjectIds.has(s._id))
          : allSubjects;

        // Filter notes, assignments, and practicals by stream subjects
        const allNotes: NoteItem[] = notesData.notes || [];
        const allAssignments: AssignmentItem[] = assignmentsData.assignments || [];
        const allPracticals: PracticalItem[] = practicalsData.practicals || [];

        const filteredNotes = streamSubjectIds
          ? allNotes.filter((n) => n.subject && streamSubjectIds.has(n.subject._id))
          : allNotes;

        const filteredAssignments = streamSubjectIds
          ? allAssignments.filter((a) => a.subject && streamSubjectIds.has(a.subject._id))
          : allAssignments;

        const filteredPracticals = streamSubjectIds
          ? allPracticals.filter((p) => p.subject && streamSubjectIds.has(p.subject._id))
          : allPracticals;

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
        <p className="text-muted-foreground">Welcome to Section C Hub</p>
        {stream && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            🎓 {stream.name}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {/* Subjects */}
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-100">Subjects</p>
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
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
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
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/20">
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
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20">
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
        <Card className="rounded-2xl border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
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
                  onClick={() => router.push("/dashboard/assignments")}
                  className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2"
                >
                  Go to Assignments →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress + Alerts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Overall Assignment Progress */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Assignment Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {overallPercent}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCompleted} of {totalAssignments} assignments done
                </p>
              </div>
              <div className="text-4xl">
                {overallPercent === 100 ? "🎉" : overallPercent >= 50 ? "📈" : "💪"}
              </div>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Overall Practical Progress */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Practical Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  {practicalPercent}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalPracticalsCompleted} of {totalPracticals} practicals done
                </p>
              </div>
              <div className="text-4xl">
                {practicalPercent === 100 ? "🎉" : practicalPercent >= 50 ? "🧪" : "🔬"}
              </div>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${practicalPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
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

      {/* Subjects Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Subjects</h2>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard/practicals")}
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              View all practicals →
            </button>
            <button
              onClick={() => router.push("/dashboard/assignments")}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              View all assignments →
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.subjects.map((subject) => {
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
                onClick={() =>
                  router.push(`/dashboard/notes?subject=${subject._id}`)
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
