/**
 * @page AdminDashboard (/admin)
 * @description Modernized Admin Dashboard — quick statistics, priority alerts,
 * curated command center, and integrated audit logging.
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditLogTable } from "@/components/audit-log-table";
import {
  Users,
  FileText,
  ClipboardList,
  FlaskConical,
  BookOpen,
  GraduationCap,
  School,
  Shield,
  ShieldAlert,
  Bell,
  Mail,
  ArrowUpRight,
  ArrowRight,
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  ListFilter,
  Sparkles,
  FolderArchive,
  Layers,
  ChevronRight,
  ExternalLink,
  Clock,
  Database,
  Lock,
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
  pendingAdminRequests?: number;
  latestAdminRequest?: {
    id: string;
    type: string;
    requestedByName: string;
    targetUserName?: string | null;
    adminNote?: string;
    createdAt?: string;
  } | null;
  latestMessage?: {
    id: string;
    name: string;
    email: string;
    subject: string;
    snippet: string;
    createdAt?: string;
  } | null;
  securityAlertCount?: number;
  latestSecurityAlert?: {
    id: string;
    action: string;
    description: string;
    actorName: string;
    createdAt?: string;
  } | null;
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
    localStorage.setItem("admin-dashboard-layout", l);
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Modern Stat Cards with Lucide icons & distinct accents
  const statCards = [
    {
      title: "Students",
      value: stats.totalStudents,
      sublabel: "Enrolled Learners",
      icon: Users,
      href: "/admin/users",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Notes",
      value: stats.totalNotes,
      sublabel: "Course Documents",
      icon: FileText,
      href: "/admin/notes",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Assignments",
      value: stats.totalAssignments,
      sublabel: "Tasks & Homework",
      icon: ClipboardList,
      href: "/admin/assignments",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: "Practicals",
      value: stats.totalPracticals,
      sublabel: "Lab Experiments",
      icon: FlaskConical,
      href: "/admin/practicals",
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Subjects",
            value: stats.totalSubjects,
            sublabel: "Academic Courses",
            icon: BookOpen,
            href: "/admin/subjects",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
          },
          {
            title: "Streams",
            value: stats.totalStreams,
            sublabel: "Departments",
            icon: GraduationCap,
            href: "/admin/streams",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
          },
          {
            title: "Sections",
            value: stats.totalSections,
            sublabel: "Batches & Cohorts",
            icon: School,
            href: "/admin/sections",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
          },
        ]
      : []),
  ];

  const layoutOptions: { key: DashboardLayout; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "compact", label: "Compact", icon: ListFilter },
    { key: "analytics", label: "Audit Feed", icon: Activity },
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
              Monitor active student cohorts, publish course resources, manage workflow authorizations, and inspect high-integrity audit activity.
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

            {/* Quick Action to Dedicated Audit Logs Page */}
            <Link href="/admin/activity">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5 h-9 font-medium shadow-xs hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              >
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Audit Logs</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Super Admin Priority Red Alert Section ─── */}
      {isSuperAdmin && ((dashStats.pendingAdminRequests && dashStats.pendingAdminRequests > 0) || (dashStats.securityAlertCount && dashStats.securityAlertCount > 0)) && (
        <div className="space-y-3">
          {dashStats.pendingAdminRequests && dashStats.pendingAdminRequests > 0 && (
            <div className="rounded-2xl border-2 border-red-500/60 bg-linear-to-r from-red-500/15 via-red-500/10 to-transparent p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Critical Super Admin Alert
                      </span>
                      <Badge className="bg-red-600 text-white text-[10px] font-bold">
                        {dashStats.pendingAdminRequests} Pending
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {dashStats.latestAdminRequest?.requestedByName || "Sub-Admin"} requested:{" "}
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        {dashStats.latestAdminRequest?.type === "create_admin"
                          ? "New Admin Account Authorization"
                          : "Section / Stream Privilege Escalation"}
                      </span>
                      {dashStats.latestAdminRequest?.targetUserName && ` for ${dashStats.latestAdminRequest.targetUserName}`}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dashStats.latestAdminRequest?.adminNote
                        ? `Message: "${dashStats.latestAdminRequest.adminNote}"`
                        : "Sub-admins cannot proceed with these system alterations without your Super Admin approval."}
                    </p>
                  </div>
                </div>
                <Link href="/admin/admin-requests" className="shrink-0 self-end sm:self-auto">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold gap-1.5 h-9 shadow-xs">
                    <span>Review & Authorize</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {dashStats.securityAlertCount && dashStats.securityAlertCount > 0 && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold text-red-600 dark:text-red-400 mr-2">
                    Security Notice ({dashStats.securityAlertCount} failed events):
                  </span>
                  <span className="text-foreground">
                    {dashStats.latestSecurityAlert?.description || "Authentication or authorization failure recorded in audit log."}
                  </span>
                </div>
              </div>
              <Link href="/admin/activity?status=failure" className="shrink-0">
                <Button variant="outline" size="sm" className="border-red-500/40 text-red-600 hover:bg-red-500/10 rounded-lg text-xs h-8">
                  Inspect Security Log →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

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
          {/* Left Column: Interactive Audit Activity Table (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <AuditActivitySection expanded={false} />
          </div>

          {/* Right Column: Workflow Action Cards & Command Center (1/3 width) */}
          <div className="space-y-6">
            <PriorityAlertCards
              dashStats={dashStats}
              loading={loading}
            />
            <AdminCommandCenter isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      )}

      {layout === "compact" && (
        <div className="space-y-6">
          <PriorityAlertCards
            dashStats={dashStats}
            loading={loading}
            horizontal
          />
          <AdminCommandCenter isSuperAdmin={isSuperAdmin} grid />
          <AuditActivitySection expanded={false} />
        </div>
      )}

      {layout === "analytics" && (
        <div className="space-y-6">
          <PriorityAlertCards
            dashStats={dashStats}
            loading={loading}
            horizontal
          />
          <AuditActivitySection expanded={true} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Sub-components: Priority Alerts, Command Center, Audit Table
 * ───────────────────────────────────────────────────────────── */

function AuditActivitySection({ expanded }: { expanded: boolean }) {
  return (
    <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Audit & Activity Logs
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Real-time high-integrity audit trail with before/after comparisons and actor identities.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[11px] gap-1 font-mono py-0.5 px-2 bg-muted/40">
            <Lock className="h-3 w-3 text-emerald-500" />
            Strict 500 Global Limit
          </Badge>
          <Link href="/admin/activity">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1 text-primary hover:text-primary">
              Full View
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <AuditLogTable initialLimit={expanded ? 15 : 8} />
      </CardContent>
    </Card>
  );
}

function PriorityAlertCards({
  dashStats,
  loading,
  horizontal,
}: {
  dashStats: DashStats;
  loading: boolean;
  horizontal?: boolean;
}) {
  const pendingRequests = dashStats.pendingRequests;
  const unreadMessages = dashStats.unreadMessages;
  const latestMessage = dashStats.latestMessage;
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
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {latestMessage ? (
                    <>
                      <strong className="text-foreground">{latestMessage.name}:</strong> &quot;{latestMessage.snippet || latestMessage.subject}&quot;
                    </>
                  ) : (
                    "Inquiries & student feedback"
                  )}
                </p>
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
  const sections = [
    {
      title: "Course Materials",
      items: [
        { label: "Notes", href: "/admin/notes", icon: FileText, color: "text-emerald-500", desc: "Lecture docs & PDFs" },
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList, color: "text-purple-500", desc: "Submissions & homework" },
        { label: "Practicals", href: "/admin/practicals", icon: FlaskConical, color: "text-teal-500", desc: "Lab experiments" },
        { label: "Library", href: "/admin/library", icon: FolderArchive, color: "text-blue-500", desc: "Reference books & materials" },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Academic Structure",
            items: [
              { label: "Subjects", href: "/admin/subjects", icon: BookOpen, color: "text-amber-500", desc: "Courses & syllabus" },
              { label: "Streams", href: "/admin/streams", icon: GraduationCap, color: "text-rose-500", desc: "Degree departments" },
              { label: "Sections", href: "/admin/sections", icon: School, color: "text-indigo-500", desc: "Student cohorts" },
            ],
          },
        ]
      : []),
    {
      title: "User Management & Requests",
      items: [
        { label: "Students Directory", href: "/admin/users", icon: Users, color: "text-blue-500", desc: "Accounts & sections" },
        { label: "Access Requests", href: "/admin/access-requests", icon: Bell, color: "text-amber-500", desc: "New admissions" },
        ...(isSuperAdmin
          ? [{ label: "Admin Requests", href: "/admin/admin-requests", icon: Shield, color: "text-purple-500", desc: "Privilege requests" }]
          : []),
        { label: "Contact Inbox", href: "/admin/messages", icon: Mail, color: "text-cyan-500", desc: "Direct messages" },
      ],
    },
  ];

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Navigation
          </span>
          <span className="text-[11px] text-muted-foreground font-normal">Command Center</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              {sec.title}
            </p>
            <div className={grid ? "grid gap-1.5 sm:grid-cols-2" : "space-y-1"}>
              {sec.items.map((item) => (
                <Link key={item.href} href={item.href} className="group block">
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg bg-muted/80 ${item.color} shrink-0`}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
