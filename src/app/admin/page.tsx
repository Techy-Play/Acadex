/**
 * @page AdminDashboard (/admin)
 * @description Admin dashboard home — shows quick stats, pending counts,
 * and switchable layout views (overview / compact / analytics).
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  PASSWORD_CHANGED: { label: "Password Changed", icon: "🔐", color: "text-amber-500" },
  NOTE_CREATED: { label: "Note Added", icon: "📄", color: "text-indigo-500" },
  NOTE_UPDATED: { label: "Note Updated", icon: "📝", color: "text-indigo-400" },
  NOTE_DELETED: { label: "Note Deleted", icon: "🗑️", color: "text-red-400" },
  ASSIGNMENT_CREATED: { label: "Assignment Added", icon: "📝", color: "text-purple-500" },
  ASSIGNMENT_UPDATED: { label: "Assignment Updated", icon: "✏️", color: "text-purple-400" },
  ASSIGNMENT_DELETED: { label: "Assignment Deleted", icon: "🗑️", color: "text-red-400" },
  PRACTICAL_CREATED: { label: "Practical Added", icon: "🧪", color: "text-emerald-500" },
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
};

function getActionInfo(action: string) {
  return actionLabels[action] || { label: action, icon: "📋", color: "text-muted-foreground" };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
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
        const [studentsRes, notesRes, assignmentsRes, practicalsRes, subjectsRes, streamsRes, sectionsRes, dashStatsRes, activityRes] =
          await Promise.all([
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

        const studentsData = await studentsRes.json();
        const notesData = await notesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const practicalsData = await practicalsRes.json();
        const subjectsData = await subjectsRes.json();
        const streamsData = await streamsRes.json();
        const sectionsData = await sectionsRes.json();
        const dashStatsData = dashStatsRes.ok ? await dashStatsRes.json() : { pendingRequests: 0, unreadMessages: 0 };
        const activityData = activityRes.ok ? await activityRes.json() : { activities: [] };

        setStats({
          totalStudents: studentsData.students?.filter(
            (s: { role: string }) => s.role === "student"
          ).length || 0,
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
        console.error("Failed to fetch stats:", error);
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

  const statCards = [
    { title: "Students", value: stats.totalStudents, icon: "👥", href: "/admin/users" },
    { title: "Notes", value: stats.totalNotes, icon: "📄", href: "/admin/notes" },
    { title: "Assignments", value: stats.totalAssignments, icon: "📝", href: "/admin/assignments" },
    { title: "Practicals", value: stats.totalPracticals, icon: "🧪", href: "/admin/practicals" },
    { title: "Subjects", value: stats.totalSubjects, icon: "📚", href: "/admin/subjects" },
    { title: "Streams", value: stats.totalStreams, icon: "🎓", href: "/admin/streams" },
    { title: "Sections", value: stats.totalSections, icon: "🏫", href: "/admin/sections" },
  ];

  const quickLinks = [
    { label: "Users", href: "/admin/users", icon: "👥" },
    { label: "Notes", href: "/admin/notes", icon: "📄" },
    { label: "Assignments", href: "/admin/assignments", icon: "📝" },
    { label: "Practicals", href: "/admin/practicals", icon: "🧪" },
    { label: "Subjects", href: "/admin/subjects", icon: "📚" },
    { label: "Streams", href: "/admin/streams", icon: "🎓" },
    { label: "Sections", href: "/admin/sections", icon: "🏫" },
    { label: "Access Requests", href: "/admin/access-requests", icon: "🔔" },
    { label: "Admin Requests", href: "/admin/admin-requests", icon: "🛡️" },
    { label: "Messages", href: "/admin/messages", icon: "📬" },
  ];

  const layoutOptions: { key: DashboardLayout; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "compact", label: "Compact", icon: "📋" },
    { key: "analytics", label: "Activity", icon: "📈" },
  ];

  const activityLimit = layout === "analytics" ? 20 : 8;

  return (
    <div className="space-y-6">
      {/* Header with layout toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of Acadex</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {layoutOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleLayoutChange(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                layout === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid — always shown */}
      <div className={`grid gap-4 ${layout === "compact" ? "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"}`}>
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  {stat.title}
                  <span className="text-lg">{stat.icon}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? (
                    <span className="inline-block h-8 w-16 bg-muted rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Layout-specific content */}
      {layout === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Activity Feed (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed
              activities={activities.slice(0, activityLimit)}
              loading={loading}
            />
          </div>

          {/* Right: Alerts + Quick Links (1/3 width) */}
          <div className="space-y-6">
            <AlertCards
              pendingRequests={dashStats.pendingRequests}
              unreadMessages={dashStats.unreadMessages}
              loading={loading}
            />
            <QuickLinksCard links={quickLinks} />
          </div>
        </div>
      )}

      {layout === "compact" && (
        <div className="space-y-6">
          <AlertCards
            pendingRequests={dashStats.pendingRequests}
            unreadMessages={dashStats.unreadMessages}
            loading={loading}
            horizontal
          />
          <QuickLinksCard links={quickLinks} grid />
        </div>
      )}

      {layout === "analytics" && (
        <div className="space-y-6">
          <AlertCards
            pendingRequests={dashStats.pendingRequests}
            unreadMessages={dashStats.unreadMessages}
            loading={loading}
            horizontal
          />
          <ActivityFeed
            activities={activities.slice(0, activityLimit)}
            loading={loading}
            expanded
          />
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

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
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
        ) : (
          <div className={`space-y-1 ${expanded ? "max-h-none" : "max-h-[400px] overflow-y-auto"}`}>
            {activities.map((a) => {
              const info = getActionInfo(a.action);
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-base mt-0.5 shrink-0">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                    </div>
                    {a.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {a.details}
                      </p>
                    )}
                    {a.user && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        by {a.user.name}
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

function AlertCards({
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
      <Link href="/admin/access-requests">
        <Card className={`rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer ${
          pendingRequests > 0 ? "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20" : ""
        }`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              pendingRequests > 0
                ? "bg-amber-100 dark:bg-amber-900/50"
                : "bg-muted"
            }`}>
              <svg className={`h-6 w-6 ${pendingRequests > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block h-7 w-10 bg-muted rounded animate-pulse" />
                ) : (
                  pendingRequests
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingRequests === 1 ? "Pending Request" : "Pending Requests"}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Unread Messages */}
      <Link href="/admin/messages">
        <Card className={`rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer ${
          unreadMessages > 0 ? "border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20" : ""
        }`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              unreadMessages > 0
                ? "bg-blue-100 dark:bg-blue-900/50"
                : "bg-muted"
            }`}>
              <svg className={`h-6 w-6 ${unreadMessages > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? (
                  <span className="inline-block h-7 w-10 bg-muted rounded animate-pulse" />
                ) : (
                  unreadMessages
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {unreadMessages === 1 ? "Unread Message" : "Unread Messages"}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function QuickLinksCard({
  links,
  grid,
}: {
  links: { label: string; href: string; icon: string }[];
  grid?: boolean;
}) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>("resources");

  const groupedLinks = [
    {
      id: "resources",
      icon: "📚",
      title: "Resource Panels",
      items: links.filter((l) => ["/admin/notes", "/admin/assignments", "/admin/practicals", "/admin/library"].includes(l.href)),
    },
    {
      id: "academic",
      icon: "🏫",
      title: "Academic Setup",
      items: links.filter((l) => ["/admin/subjects", "/admin/streams", "/admin/sections"].includes(l.href)),
    },
    {
      id: "people",
      icon: "👥",
      title: "People & Requests",
      items: links.filter((l) => ["/admin/users", "/admin/access-requests", "/admin/admin-requests", "/admin/messages"].includes(l.href)),
    },
    {
      id: "other",
      icon: "⚙️",
      title: "Other Panels",
      items: links.filter((l) => ![
        "/admin/notes",
        "/admin/assignments",
        "/admin/practicals",
        "/admin/library",
        "/admin/subjects",
        "/admin/streams",
        "/admin/sections",
        "/admin/users",
        "/admin/access-requests",
        "/admin/admin-requests",
        "/admin/messages",
      ].includes(l.href)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <Card className="rounded-2xl overflow-hidden py-0 gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Quick Links
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-3">
        <div className="space-y-2 px-3">
          {groupedLinks.map((group) => {
            const isExpanded = expandedGroupId === group.id;

            return (
              <Card key={group.id} className="rounded-xl overflow-hidden py-0 gap-0">
                <CardHeader className="p-0">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/40"
                    onClick={() => setExpandedGroupId((prev) => (prev === group.id ? null : group.id))}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-muted text-xs">
                        {group.icon}
                      </span>
                      <CardTitle className="text-sm font-medium truncate">{group.title}</CardTitle>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        {group.items.length}
                      </span>
                    </div>
                    <svg
                      className={`flex-shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </CardHeader>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <CardContent className={`pt-0 ${grid ? "pb-3" : "pb-2"}`}>
                      <div className={grid ? "grid gap-2 sm:grid-cols-2" : "space-y-1.5"}>
                        {group.items.map((link) => (
                          <Link key={link.href} href={link.href}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-between rounded-xl px-3 ${grid ? "h-11" : "h-10"}`}
                            >
                              <span className="flex items-center gap-2.5 text-sm font-medium">
                                <span>{link.icon}</span>
                                {link.label}
                              </span>
                              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
