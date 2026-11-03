/**
 * @page AdminDashboard (/admin)
 * @description Modern Admin Dashboard — quick statistics, priority alerts,
 * curated command center, and simple, real-time activity feed.
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  ClipboardList,
  FlaskConical,
  BookOpen,
  GraduationCap,
  School,
  Shield,
  Bell,
  Mail,
  ArrowUpRight,
  ArrowRight,
  Activity,
  LayoutGrid,
  ListFilter,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
} from "lucide-react";

type DashboardLayout = "overview" | "compact" | "analytics";

interface Stats {
  totalStudents: number;
  totalNotes: number;
  totalAssignments: number;
  totalPracticals: number;
  totalSubjects: number;
  totalStreams: number;
  totalSections: number;
}

interface DashStats {
  pendingRequests: number;
  unreadMessages: number;
}

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  user: { name: string; college_id: string } | null;
  createdAt: string;
}

const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
  USER_LOGIN: { label: "User Login", icon: "🔑", color: "text-blue-500" },
  LOGIN: { label: "User Login", icon: "🔑", color: "text-blue-500" },
  PASSWORD_CHANGED: { label: "Password Changed", icon: "🔐", color: "text-amber-500" },
  NOTE_CREATED: { label: "Note Added", icon: "📄", color: "text-indigo-500" },
  NOTE_ADDED: { label: "Note Added", icon: "📄", color: "text-indigo-500" },
  NOTE_UPDATED: { label: "Note Updated", icon: "📝", color: "text-indigo-400" },
  NOTE_DELETED: { label: "Note Deleted", icon: "🗑️", color: "text-red-400" },
  ASSIGNMENT_CREATED: { label: "Assignment Added", icon: "📝", color: "text-purple-500" },
  ASSIGNMENT_ADDED: { label: "Assignment Added", icon: "📝", color: "text-purple-500" },
  ASSIGNMENT_UPDATED: { label: "Assignment Updated", icon: "✏️", color: "text-purple-400" },
  ASSIGNMENT_DELETED: { label: "Assignment Deleted", icon: "🗑️", color: "text-red-400" },
  PRACTICAL_CREATED: { label: "Practical Added", icon: "🧪", color: "text-emerald-500" },
  PRACTICAL_ADDED: { label: "Practical Added", icon: "🧪", color: "text-emerald-500" },
  PRACTICAL_UPDATED: { label: "Practical Updated", icon: "🔬", color: "text-emerald-400" },
  PRACTICAL_DELETED: { label: "Practical Deleted", icon: "🗑️", color: "text-red-400" },
  ACCESS_REQUEST_APPROVED: { label: "Request Approved", icon: "✅", color: "text-green-500" },
  ACCESS_REQUEST_DENIED: { label: "Request Denied", icon: "❌", color: "text-red-500" },
  STUDENT_CREATED: { label: "Student Added", icon: "👤", color: "text-blue-500" },
  STUDENT_UPDATED: { label: "Student Updated", icon: "✏️", color: "text-blue-400" },
  STUDENT_DELETED: { label: "Student Deleted", icon: "🗑️", color: "text-red-400" },
  ADMIN_REQUEST_CREATED: { label: "Admin Request", icon: "🛡️", color: "text-purple-500" },
  ADMIN_REQUEST_APPROVED: { label: "Admin Request Approved", icon: "✅", color: "text-green-500" },
  ADMIN_REQUEST_DENIED: { label: "Admin Request Denied", icon: "❌", color: "text-red-500" },
  SUBJECT_CREATED: { label: "Subject Added", icon: "📚", color: "text-teal-500" },
};

function getActionInfo(action: string) {
  return actionLabels[action] || { label: action.replace(/_/g, " "), icon: "📋", color: "text-muted-foreground" };
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalNotes: 0,
    totalAssignments: 0,
    totalPracticals: 0,
    totalSubjects: 0,
    totalStreams: 0,
    totalSections: 0,
  });
  const [dashStats, setDashStats] = useState<DashStats>({
    pendingRequests: 0,
    unreadMessages: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [adminName, setAdminName] = useState("Administrator");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin-dashboard-layout") as DashboardLayout) || "overview";
    }
    return "overview";
  });

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          meRes,
          studentsRes,
          notesRes,
          assignmentsRes,
          practicalsRes,
          subjectsRes,
          streamsRes,
          sectionsRes,
          dashStatsRes,
          activityRes,
        ] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/students"),
          fetch("/api/notes"),
          fetch("/api/assignments"),
          fetch("/api/practicals"),
          fetch("/api/subjects"),
          fetch("/api/streams"),
          fetch("/api/sections"),
          fetch("/api/admin/dashboard-stats"),
          fetch("/api/admin/activity"),
        ]);

        const meData = meRes.ok ? await meRes.json() : null;
        if (meData?.user) {
          setIsSuperAdmin(Boolean(meData.user.isSuperAdmin));
          if (meData.user.name) setAdminName(meData.user.name);
        }

        const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] };
        const notesData = notesRes.ok ? await notesRes.json() : { notes: [] };
        const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : { assignments: [] };
        const practicalsData = practicalsRes.ok ? await practicalsRes.json() : { practicals: [] };
        const subjectsData = subjectsRes.ok ? await subjectsRes.json() : { subjects: [] };
        const streamsData = streamsRes.ok ? await streamsRes.json() : { streams: [] };
        const sectionsData = sectionsRes.ok ? await sectionsRes.json() : { sections: [] };
        const dashStatsData = dashStatsRes.ok ? await dashStatsRes.json() : { pendingRequests: 0, unreadMessages: 0 };
        const activityData = activityRes.ok ? await activityRes.json() : { activities: [] };

        setStats({
          totalStudents:
            studentsData.students?.filter((s: { role: string }) => s.role === "student").length || 0,
          totalNotes: notesData.notes?.length || 0,
          totalAssignments: assignmentsData.assignments?.length || 0,
          totalPracticals: practicalsData.practicals?.length || 0,
          totalSubjects: subjectsData.subjects?.length || 0,
          totalStreams: streamsData.streams?.length || 0,
          totalSections: sectionsData.sections?.length || 0,
        });
        setDashStats(dashStatsData);
        setActivities(activityData.activities || []);
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const handleLayoutChange = (l: DashboardLayout) => {
    setLayout(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin-dashboard-layout", l);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      sublabel: "Enrolled Learners",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      href: "/admin/users",
    },
    {
      title: "Active Notes",
      value: stats.totalNotes,
      sublabel: "Course Documents",
      icon: FileText,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      href: "/admin/notes",
    },
    {
      title: "Assignments",
      value: stats.totalAssignments,
      sublabel: "Tasks & Homework",
      icon: ClipboardList,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      href: "/admin/assignments",
    },
    {
      title: "Practicals",
      value: stats.totalPracticals,
      sublabel: "Lab Experiments",
      icon: FlaskConical,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      href: "/admin/practicals",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Subjects",
            value: stats.totalSubjects,
            sublabel: "Curriculum Units",
            icon: BookOpen,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            border: "border-teal-500/20",
            href: "/admin/subjects",
          },
          {
            title: "Streams",
            value: stats.totalStreams,
            sublabel: "Degree Tracks",
            icon: GraduationCap,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            href: "/admin/streams",
          },
          {
            title: "Sections",
            value: stats.totalSections,
            sublabel: "Class Batches",
            icon: School,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            href: "/admin/sections",
          },
        ]
      : []),
  ];

  const layoutOptions: { key: DashboardLayout; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "compact", label: "Compact", icon: ListFilter },
    { key: "analytics", label: "Activity", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero & Welcome Header Banner ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-card via-card to-primary/5 border border-border/80 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                System Active
              </span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground font-mono font-medium">Acadex Academic Suite</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {greeting}, {adminName}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Monitor active student cohorts, publish course resources, manage workflow authorizations, and review recent activities.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Layout Mode Segmented Control */}
            <div className="flex items-center gap-1 bg-muted/80 backdrop-blur-xs rounded-xl p-1 border border-border/60">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleLayoutChange(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    layout === opt.key
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Metric & Stats Cards Grid ─── */}
      <div
        className={`grid gap-3.5 sm:gap-4 ${
          layout === "compact"
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        }`}
      >
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group">
            <Card className="h-full rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} border ${stat.border} transition-transform group-hover:scale-105 duration-200`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="mt-3.5 space-y-0.5">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {loading ? (
                    <span className="inline-block h-8 w-12 bg-muted rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs font-semibold text-foreground truncate">{stat.title}</p>
                <p className="text-[11px] text-muted-foreground/80 truncate hidden sm:block">{stat.sublabel}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Dynamic Layout Content ─── */}
      {layout === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Recent Activity Feed (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed
              activities={activities.slice(0, 10)}
              loading={loading}
            />
          </div>

          {/* Right Column: Priority Alerts & Command Center (1/3 width) */}
          <div className="space-y-6">
            <PriorityAlertCards
              pendingRequests={dashStats.pendingRequests}
              unreadMessages={dashStats.unreadMessages}
              loading={loading}
            />
            <AdminCommandCenter isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      )}

      {layout === "compact" && (
        <div className="space-y-6">
          <PriorityAlertCards
            pendingRequests={dashStats.pendingRequests}
            unreadMessages={dashStats.unreadMessages}
            loading={loading}
            horizontal
          />
          <AdminCommandCenter isSuperAdmin={isSuperAdmin} grid />
          <ActivityFeed
            activities={activities.slice(0, 10)}
            loading={loading}
          />
        </div>
      )}

      {layout === "analytics" && (
        <div className="space-y-6">
          <PriorityAlertCards
            pendingRequests={dashStats.pendingRequests}
            unreadMessages={dashStats.unreadMessages}
            loading={loading}
            horizontal
          />
          <ActivityFeed
            activities={activities}
            loading={loading}
            expanded
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Sub-components: Priority Alerts, Command Center, Activity Feed
 * ───────────────────────────────────────────────────────────── */

function ActivityFeed({
  activities,
  loading,
  expanded,
}: {
  activities: ActivityItem[];
  loading: boolean;
  expanded?: boolean;
}) {
  return (
    <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-4.5 w-4.5 text-primary" />
            Recent Activity
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Latest moderation, uploads, and student activities across your sections.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {activities.length} recent
        </span>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="h-9 w-9 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className={`space-y-1.5 divide-y divide-border/40 ${expanded ? "max-h-none" : "max-h-[460px] overflow-y-auto pr-1"}`}>
            {activities.map((a) => {
              const info = getActionInfo(a.action);
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3.5 pt-2.5 first:pt-0 pb-1.5 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                >
                  <span className="text-xl mt-0.5 shrink-0 select-none">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${info.color}`}>{info.label}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
                    </div>
                    {a.details && (
                      <p className="text-xs text-foreground/90 font-medium truncate mt-0.5">
                        {a.details}
                      </p>
                    )}
                    {a.user && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        by <span className="text-foreground font-medium">{a.user.name}</span>
                        {a.user.college_id ? ` (${a.user.college_id})` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityAlertCards({
  pendingRequests,
  unreadMessages,
  loading,
  horizontal,
}: {
  pendingRequests: number;
  unreadMessages: number;
  loading: boolean;
  horizontal?: boolean;
}) {
  return (
    <div className={horizontal ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
      {/* Pending Access Requests */}
      <Link href="/admin/access-requests" className="group">
        <Card
          className={`rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            pendingRequests > 0
              ? "border-amber-500/40 bg-linear-to-r from-amber-500/5 to-transparent"
              : "border-border/80 bg-card"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                  pendingRequests > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Bell className="h-5 w-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {loading ? <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" /> : pendingRequests}
                  </p>
                  {pendingRequests > 0 && (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      Requires Action
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {pendingRequests === 1 ? "Pending Access Request" : "Pending Access Requests"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Student registration applications</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </CardContent>
        </Card>
      </Link>

      {/* Unread Contact Messages */}
      <Link href="/admin/messages" className="group">
        <Card
          className={`rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            unreadMessages > 0
              ? "border-blue-500/40 bg-linear-to-r from-blue-500/5 to-transparent"
              : "border-border/80 bg-card"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                  unreadMessages > 0
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {loading ? <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" /> : unreadMessages}
                  </p>
                  {unreadMessages > 0 && (
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {unreadMessages === 1 ? "Contact Message" : "Contact Messages"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Inquiries & student feedback</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function AdminCommandCenter({
  isSuperAdmin,
  grid,
}: {
  isSuperAdmin: boolean;
  grid?: boolean;
}) {
  const commandSections = [
    {
      category: "Course Materials",
      badge: "Academic",
      items: [
        { label: "Notes", href: "/admin/notes", icon: FileText, color: "text-blue-500", desc: "Lecture docs & PDFs" },
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList, color: "text-purple-500", desc: "Submissions & homework" },
        { label: "Practicals", href: "/admin/practicals", icon: FlaskConical, color: "text-emerald-500", desc: "Lab experiments" },
        { label: "Library", href: "/admin/library", icon: BookOpen, color: "text-indigo-500", desc: "Reference books & materials" },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            category: "Academic Structure",
            badge: "Super Admin",
            items: [
              { label: "Subjects", href: "/admin/subjects", icon: BookOpen, color: "text-teal-500", desc: "Syllabus & units" },
              { label: "Streams", href: "/admin/streams", icon: GraduationCap, color: "text-amber-500", desc: "Departments & degrees" },
              { label: "Sections", href: "/admin/sections", icon: School, color: "text-rose-500", desc: "Student batches" },
            ],
          },
        ]
      : []),
    {
      category: "User Management & Requests",
      badge: "Administration",
      items: [
        { label: "Students Directory", href: "/admin/users", icon: Users, color: "text-blue-500", desc: "Accounts & sections" },
        { label: "Access Requests", href: "/admin/access-requests", icon: Bell, color: "text-amber-500", desc: "New admissions" },
        ...(isSuperAdmin
          ? [{ label: "Admin Requests", href: "/admin/admin-requests", icon: Shield, color: "text-purple-500", desc: "Privilege requests" }]
          : []),
        { label: "Contact Inbox", href: "/admin/messages", icon: Mail, color: "text-emerald-500", desc: "Direct messages" },
      ],
    },
  ];

  return (
    <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Command Center
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            1-Click Navigation
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-4">
        {commandSections.map((section) => (
          <div key={section.category} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground/60">{section.badge}</span>
            </div>
            <div className={`grid gap-2 ${grid ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="group">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-150">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
