/**
 * @page AdminDashboard (/admin)
 * @description Modernized Admin Command Center — executive hero section,
 * mobile-optimized layout, priority action center, 1-click resource preview,
 * and categorized activity feed.
 */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminLightbox } from "@/context/admin-lightbox-context";
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
  ChevronRight,
  Clock,
  Search,
  Plus,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Sunrise,
  Sun,
  Moon,
  Calendar,
  BarChart3,
  UserPlus,
  Compass,
  Layers,
  FileUp,
  SlidersHorizontal,
} from "lucide-react";

type DashboardLayout = "overview" | "compact" | "analytics";
type ActivityCategory = "all" | "uploads" | "requests" | "users";

interface Stats {
  totalStudents: number;
  totalNotes: number;
  totalAssignments: number;
  totalPracticals: number;
  totalLibrary: number;
  totalSubjects: number;
  totalStreams: number;
  totalSections: number;
}

interface PendingQueues {
  accessRequests: number;
  adminRequests: number;
  userRequests: number;
  unreadMessages: number;
  total: number;
}

interface RecentUpload {
  id: string;
  type: "note" | "assignment" | "practical" | "library";
  title: string;
  fileUrl: string;
  subjectName: string;
  sectionName?: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  sectionName?: string | null;
  user: { name: string; college_id: string } | null;
  createdAt: string;
}

const actionLabels: Record<string, { label: string; icon: string; color: string; category: ActivityCategory }> = {
  USER_LOGIN: { label: "User Login", icon: "🔑", color: "text-blue-500", category: "users" },
  LOGIN: { label: "User Login", icon: "🔑", color: "text-blue-500", category: "users" },
  PASSWORD_CHANGED: { label: "Password Changed", icon: "🔐", color: "text-amber-500", category: "users" },
  NOTE_CREATED: { label: "Note Added", icon: "📄", color: "text-indigo-500", category: "uploads" },
  NOTE_ADDED: { label: "Note Added", icon: "📄", color: "text-indigo-500", category: "uploads" },
  NOTE_UPDATED: { label: "Note Updated", icon: "📝", color: "text-indigo-400", category: "uploads" },
  NOTE_DELETED: { label: "Note Deleted", icon: "🗑️", color: "text-red-400", category: "uploads" },
  ASSIGNMENT_CREATED: { label: "Assignment Added", icon: "📝", color: "text-purple-500", category: "uploads" },
  ASSIGNMENT_ADDED: { label: "Assignment Added", icon: "📝", color: "text-purple-500", category: "uploads" },
  ASSIGNMENT_UPDATED: { label: "Assignment Updated", icon: "✏️", color: "text-purple-400", category: "uploads" },
  ASSIGNMENT_DELETED: { label: "Assignment Deleted", icon: "🗑️", color: "text-red-400", category: "uploads" },
  PRACTICAL_CREATED: { label: "Practical Added", icon: "🧪", color: "text-emerald-500", category: "uploads" },
  PRACTICAL_ADDED: { label: "Practical Added", icon: "🧪", color: "text-emerald-500", category: "uploads" },
  PRACTICAL_UPDATED: { label: "Practical Updated", icon: "🔬", color: "text-emerald-400", category: "uploads" },
  PRACTICAL_DELETED: { label: "Practical Deleted", icon: "🗑️", color: "text-red-400", category: "uploads" },
  ACCESS_REQUEST_APPROVED: { label: "Request Approved", icon: "✅", color: "text-green-500", category: "requests" },
  ACCESS_REQUEST_DENIED: { label: "Request Denied", icon: "❌", color: "text-red-500", category: "requests" },
  STUDENT_CREATED: { label: "Student Added", icon: "👤", color: "text-blue-500", category: "users" },
  STUDENT_UPDATED: { label: "Student Updated", icon: "✏️", color: "text-blue-400", category: "users" },
  STUDENT_DELETED: { label: "Student Deleted", icon: "🗑️", color: "text-red-400", category: "users" },
  ADMIN_REQUEST_CREATED: { label: "Admin Request", icon: "🛡️", color: "text-purple-500", category: "requests" },
  ADMIN_REQUEST_APPROVED: { label: "Admin Request Approved", icon: "✅", color: "text-green-500", category: "requests" },
  ADMIN_REQUEST_DENIED: { label: "Admin Request Denied", icon: "❌", color: "text-red-500", category: "requests" },
  SUBJECT_CREATED: { label: "Subject Added", icon: "📚", color: "text-teal-500", category: "uploads" },
};

function getActionInfo(action: string) {
  return actionLabels[action] || {
    label: action.replace(/_/g, " "),
    icon: "📋",
    color: "text-muted-foreground",
    category: "users" as ActivityCategory,
  };
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
  const { openLightbox } = useAdminLightbox();

  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalNotes: 0,
    totalAssignments: 0,
    totalPracticals: 0,
    totalLibrary: 0,
    totalSubjects: 0,
    totalStreams: 0,
    totalSections: 0,
  });

  const [pending, setPending] = useState<PendingQueues>({
    accessRequests: 0,
    adminRequests: 0,
    userRequests: 0,
    unreadMessages: 0,
    total: 0,
  });

  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>("all");
  const [adminName, setAdminName] = useState("Administrator");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);

  const [layout, setLayout] = useState<DashboardLayout>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin-dashboard-layout") as DashboardLayout) || "overview";
    }
    return "overview";
  });

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [meRes, statsRes, activityRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/dashboard-stats"),
        fetch("/api/admin/activity"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user) {
          setIsSuperAdmin(Boolean(meData.user.isSuperAdmin));
          if (meData.user.name) setAdminName(meData.user.name);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.counts) {
          setStats({
            totalStudents: statsData.counts.students || 0,
            totalNotes: statsData.counts.notes || 0,
            totalAssignments: statsData.counts.assignments || 0,
            totalPracticals: statsData.counts.practicals || 0,
            totalLibrary: statsData.counts.library || 0,
            totalSubjects: statsData.counts.subjects || 0,
            totalStreams: statsData.counts.streams || 0,
            totalSections: statsData.counts.sections || 0,
          });
        }
        if (statsData.pending) {
          setPending(statsData.pending);
        } else {
          const acc = statsData.pendingRequests || 0;
          const msg = statsData.unreadMessages || 0;
          setPending({
            accessRequests: acc,
            adminRequests: 0,
            userRequests: 0,
            unreadMessages: msg,
            total: acc + msg,
          });
        }
        if (Array.isArray(statsData.recentUploads)) {
          setRecentUploads(statsData.recentUploads);
        }
      }

      if (activityRes.ok) {
        const actData = await activityRes.json();
        if (Array.isArray(actData.activities)) {
          setActivities(actData.activities);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLayoutChange = (l: DashboardLayout) => {
    setLayout(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin-dashboard-layout", l);
    }
  };

  const { greeting, GreetingIcon } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", GreetingIcon: Sunrise };
    if (hour < 18) return { greeting: "Good afternoon", GreetingIcon: Sun };
    return { greeting: "Good evening", GreetingIcon: Moon };
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Primary Metrics Grid Cards
  const statCards = [
    {
      title: "Students",
      value: stats.totalStudents,
      sublabel: "Enrolled",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      href: "/admin/users",
    },
    {
      title: "Notes",
      value: stats.totalNotes,
      sublabel: "Lectures",
      icon: FileText,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      href: "/admin/notes",
    },
    {
      title: "Assignments",
      value: stats.totalAssignments,
      sublabel: "Tasks",
      icon: ClipboardList,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      href: "/admin/assignments",
    },
    {
      title: "Practicals",
      value: stats.totalPracticals,
      sublabel: "Lab Guides",
      icon: FlaskConical,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      href: "/admin/practicals",
    },
    {
      title: "Library",
      value: stats.totalLibrary,
      sublabel: "Books",
      icon: BookOpen,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      href: "/admin/library",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Subjects",
            value: stats.totalSubjects,
            sublabel: "Units",
            icon: Layers,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            border: "border-teal-500/20",
            href: "/admin/subjects",
          },
          {
            title: "Streams",
            value: stats.totalStreams,
            sublabel: "Degrees",
            icon: GraduationCap,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            href: "/admin/streams",
          },
          {
            title: "Sections",
            value: stats.totalSections,
            sublabel: "Batches",
            icon: School,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            href: "/admin/sections",
          },
        ]
      : []),
  ];

  // Quick Command Finder list
  const allCommands = useMemo(() => {
    return [
      { label: "Notes & Lectures", href: "/admin/notes", icon: FileText, category: "Academic Content", desc: "Upload & publish lecture documents" },
      { label: "Assignments & Deadlines", href: "/admin/assignments", icon: ClipboardList, category: "Academic Content", desc: "Manage student tasks & due dates" },
      { label: "Practicals & Lab Guides", href: "/admin/practicals", icon: FlaskConical, category: "Academic Content", desc: "Lab manuals and code references" },
      { label: "Digital Library", href: "/admin/library", icon: BookOpen, category: "Academic Content", desc: "Reference books & syllabus material" },
      { label: "Students Directory", href: "/admin/users", icon: Users, category: "User Governance", desc: "Accounts, status, and section rosters" },
      { label: "Enroll Student", href: "/admin/add-student", icon: UserPlus, category: "User Governance", desc: "Create a new student credential" },
      { label: "Access Requests Queue", href: "/admin/access-requests", icon: Bell, category: "Review Queues", desc: "Student registration approvals", badge: pending.accessRequests > 0 ? `${pending.accessRequests} Pending` : undefined },
      { label: "Student Resource Submissions", href: "/admin/user-requests", icon: Inbox, category: "Review Queues", desc: "Review student uploaded notes", badge: pending.userRequests > 0 ? `${pending.userRequests} Pending` : undefined },
      ...(isSuperAdmin
        ? [
            { label: "Admin Privilege Requests", href: "/admin/admin-requests", icon: Shield, category: "Review Queues", desc: "Faculty section permission requests", badge: pending.adminRequests > 0 ? `${pending.adminRequests} Pending` : undefined },
            { label: "Subjects Catalog", href: "/admin/subjects", icon: Layers, category: "Curriculum", desc: "Manage degree subjects & credits" },
            { label: "Streams & Departments", href: "/admin/streams", icon: GraduationCap, category: "Curriculum", desc: "Academic branches and programs" },
            { label: "Sections & Batches", href: "/admin/sections", icon: School, category: "Curriculum", desc: "Class cohorts and section groups" },
          ]
        : []),
      { label: "Contact Messages Inbox", href: "/admin/messages", icon: Mail, category: "Review Queues", desc: "Student feedback and inquiries", badge: pending.unreadMessages > 0 ? `${pending.unreadMessages} Unread` : undefined },
    ];
  }, [isSuperAdmin, pending]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return allCommands;
    const q = searchQuery.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q)
    );
  }, [allCommands, searchQuery]);

  // Filter activities by category
  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter((a) => {
      const info = getActionInfo(a.action);
      return info.category === activityFilter;
    });
  }, [activities, activityFilter]);

  // Academic Content Breakdown calculation
  const totalAcademicResources = stats.totalNotes + stats.totalAssignments + stats.totalPracticals + stats.totalLibrary;
  const contentDistribution = useMemo(() => {
    if (totalAcademicResources === 0) return { notes: 25, assignments: 25, practicals: 25, library: 25 };
    return {
      notes: Math.round((stats.totalNotes / totalAcademicResources) * 100),
      assignments: Math.round((stats.totalAssignments / totalAcademicResources) * 100),
      practicals: Math.round((stats.totalPracticals / totalAcademicResources) * 100),
      library: Math.round((stats.totalLibrary / totalAcademicResources) * 100),
    };
  }, [stats, totalAcademicResources]);

  const layoutOptions: { key: DashboardLayout; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "compact", label: "Compact", icon: ListFilter },
    { key: "analytics", label: "Activity", icon: Activity },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Redesigned Hero Header Section ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-card via-card/95 to-primary/10 border border-border/80 p-4 sm:p-6 md:p-8 shadow-xs">
        {/* Subtle Ambient Glow Background Orbs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 sm:h-80 w-64 sm:w-80 rounded-full bg-primary/10 blur-3xl opacity-60 dark:opacity-40" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 sm:h-72 w-56 sm:w-72 rounded-full bg-indigo-500/10 blur-3xl opacity-50 dark:opacity-30" />

        <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
          {/* Top Status & Context Pill Strip */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
              {/* Live Status Indicator */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>

              {/* Date Pill */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-[10px] sm:text-[11px] font-medium">
                <Calendar className="h-3 w-3" />
                <span>{todayFormatted}</span>
              </span>

              {/* Role Badge */}
              {isSuperAdmin && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/5 py-0.5 px-2">
                  Super Admin
                </Badge>
              )}

              {/* Action alert pill if items are pending */}
              {pending.total > 0 && (
                <Link href="/admin/access-requests" className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] sm:text-[11px] font-semibold hover:bg-amber-500/20 transition-colors">
                  <Bell className="h-3 w-3" />
                  <span>{pending.total} Pending</span>
                </Link>
              )}
            </div>

            {/* Layout Switcher & Refresh (Compact on Mobile) */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {/* Segmented Layout Toggle */}
              <div className="flex items-center gap-0.5 bg-muted/70 backdrop-blur-xs rounded-xl p-0.5 sm:p-1 border border-border/60">
                {layoutOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleLayoutChange(opt.key)}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      layout === opt.key
                        ? "bg-card text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={`Switch to ${opt.label} View`}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="rounded-xl h-8 w-8 sm:h-8 sm:w-8 p-0"
                title="Refresh Live Statistics"
              >
                <RotateCw className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Main Hero Title & Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1 sm:space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <GreetingIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {greeting}, {adminName}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Welcome to your Acadex portal. Coordinate courseware, approve student enrollments, and manage cohort resources.
              </p>
            </div>

            {/* Mobile-Friendly Quick 1-Tap Action Pill Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
              <Link href="/admin/notes">
                <Button size="sm" variant="outline" className="h-8 sm:h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:border-indigo-500/40 hover:text-indigo-600 transition-all">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>+ Note</span>
                </Button>
              </Link>

              <Link href="/admin/assignments">
                <Button size="sm" variant="outline" className="h-8 sm:h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:border-purple-500/40 hover:text-purple-600 transition-all">
                  <ClipboardList className="h-3.5 w-3.5 text-purple-500" />
                  <span>+ Task</span>
                </Button>
              </Link>

              <Link href="/admin/practicals" className="hidden min-[480px]:inline-flex">
                <Button size="sm" variant="outline" className="h-8 sm:h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:border-emerald-500/40 hover:text-emerald-600 transition-all">
                  <FlaskConical className="h-3.5 w-3.5 text-emerald-500" />
                  <span>+ Lab</span>
                </Button>
              </Link>

              {/* Quick Action Popover */}
              <div className="relative">
                <Button
                  size="sm"
                  className="h-8 sm:h-8 px-3 rounded-xl gap-1 text-xs font-semibold shadow-xs"
                  onClick={() => setShowQuickActionMenu((prev) => !prev)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </Button>

                {showQuickActionMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowQuickActionMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Publish Material
                      </div>
                      <Link
                        href="/admin/notes"
                        onClick={() => setShowQuickActionMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span>Upload Lecture Notes</span>
                      </Link>
                      <Link
                        href="/admin/assignments"
                        onClick={() => setShowQuickActionMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <ClipboardList className="h-4 w-4 text-purple-500" />
                        <span>Post Assignment</span>
                      </Link>
                      <Link
                        href="/admin/practicals"
                        onClick={() => setShowQuickActionMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <FlaskConical className="h-4 w-4 text-emerald-500" />
                        <span>Upload Lab Guide</span>
                      </Link>
                      <Link
                        href="/admin/library"
                        onClick={() => setShowQuickActionMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <BookOpen className="h-4 w-4 text-sky-500" />
                        <span>Add Library Document</span>
                      </Link>
                      <div className="my-1 border-t border-border/60" />
                      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Enrollments
                      </div>
                      <Link
                        href="/admin/add-student"
                        onClick={() => setShowQuickActionMenu(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <UserPlus className="h-4 w-4 text-blue-500" />
                        <span>Enroll Single Student</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Metrics KPI Cards Grid (Mobile-Optimized) ─── */}
      <div className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3.5">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group">
            <Card className="h-full rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-1">
                <div className={`p-1.5 sm:p-2 rounded-xl ${stat.bg} ${stat.color} border ${stat.border} transition-transform group-hover:scale-105 duration-200`}>
                  <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="mt-2.5 space-y-0.5">
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {loading ? (
                    <span className="inline-block h-6 sm:h-7 w-10 sm:w-12 bg-muted rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs font-semibold text-foreground truncate">{stat.title}</p>
                <p className="text-[10px] text-muted-foreground truncate hidden min-[400px]:block">{stat.sublabel}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Priority Action Center (Review Queues) ─── */}
      <PriorityActionCenter pending={pending} loading={loading} isSuperAdmin={isSuperAdmin} />

      {/* ─── Dynamic Layout Content ─── */}
      {layout === "overview" && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column (2/3): Recent Uploads & Activity Feed */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Quick Command Finder */}
            <CommandFinder
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              commands={filteredCommands}
            />

            {/* Recent Uploads Showcase with 1-Click Lightbox Preview */}
            <RecentUploadsShowcase
              uploads={recentUploads}
              loading={loading}
              onPreview={(url, title) => openLightbox(url, title)}
            />

            {/* Activity Stream with Category Filters */}
            <ActivityFeed
              activities={filteredActivities}
              filter={activityFilter}
              onFilterChange={setActivityFilter}
              loading={loading}
            />
          </div>

          {/* Right Column (1/3): Academic Health & Command Center */}
          <div className="space-y-4 sm:space-y-6">
            <AcademicHealthCard
              distribution={contentDistribution}
              total={totalAcademicResources}
              stats={stats}
            />
            <AdminCommandCenter isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      )}

      {layout === "compact" && (
        <div className="space-y-4 sm:space-y-6">
          <CommandFinder
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            commands={filteredCommands}
          />
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <RecentUploadsShowcase
              uploads={recentUploads}
              loading={loading}
              onPreview={(url, title) => openLightbox(url, title)}
            />
            <AcademicHealthCard
              distribution={contentDistribution}
              total={totalAcademicResources}
              stats={stats}
            />
          </div>
          <AdminCommandCenter isSuperAdmin={isSuperAdmin} grid />
          <ActivityFeed
            activities={filteredActivities}
            filter={activityFilter}
            onFilterChange={setActivityFilter}
            loading={loading}
          />
        </div>
      )}

      {layout === "analytics" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityFeed
                activities={filteredActivities}
                filter={activityFilter}
                onFilterChange={setActivityFilter}
                loading={loading}
                expanded
              />
            </div>
            <div className="space-y-4 sm:space-y-6">
              <AcademicHealthCard
                distribution={contentDistribution}
                total={totalAcademicResources}
                stats={stats}
              />
              <RecentUploadsShowcase
                uploads={recentUploads}
                loading={loading}
                onPreview={(url, title) => openLightbox(url, title)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Sub-components: Priority Center, Uploads, Activity, Commands
 * ───────────────────────────────────────────────────────────── */

function PriorityActionCenter({
  pending,
  loading,
  isSuperAdmin,
}: {
  pending: PendingQueues;
  loading: boolean;
  isSuperAdmin: boolean;
}) {
  const cards = [
    {
      title: "Access Requests",
      count: pending.accessRequests,
      sublabel: "New student registrations awaiting verification",
      href: "/admin/access-requests",
      icon: Bell,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      activeText: "Review Admissions",
    },
    {
      title: "Student Uploads",
      count: pending.userRequests,
      sublabel: "Student submitted notes & materials pending review",
      href: "/admin/user-requests",
      icon: Inbox,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      activeText: "Review Submissions",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Admin Requests",
            count: pending.adminRequests,
            sublabel: "Faculty privilege and section change proposals",
            href: "/admin/admin-requests",
            icon: Shield,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/30",
            activeText: "Review Permissions",
          },
        ]
      : []),
    {
      title: "Contact Messages",
      count: pending.unreadMessages,
      sublabel: "Direct student queries and website feedback",
      href: "/admin/messages",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      activeText: "View Inquiries",
    },
  ];

  if (!loading && pending.total === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-foreground">Priority Queues Clear</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground">No pending access requests, student uploads, or unread messages requiring attention.</p>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
          All Caught Up
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Priority Action Queues
          </span>
        </div>
        {pending.total > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {pending.total} items pending
          </span>
        )}
      </div>

      <div className="grid gap-2.5 sm:gap-3.5 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => {
          const ItemIcon = item.icon;
          const hasPending = item.count > 0;
          return (
            <Link key={item.title} href={item.href} className="group">
              <Card
                className={`h-full rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  hasPending
                    ? `${item.border} bg-card hover:bg-muted/40`
                    : "border-border/80 bg-card hover:border-border"
                }`}
              >
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full gap-2.5 sm:gap-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                          {loading ? <span className="inline-block h-6 w-8 bg-muted rounded animate-pulse" /> : item.count}
                        </span>
                        {hasPending && (
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 ${item.bg} ${item.color} ${item.border}`}>
                            Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.sublabel}</p>
                    </div>
                    <div className={`p-2 sm:p-2.5 rounded-xl ${item.bg} ${item.color} shrink-0`}>
                      <ItemIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="truncate">{hasPending ? item.activeText : "Open Queue"}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CommandFinder({
  searchQuery,
  setSearchQuery,
  commands,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  commands: Array<{ label: string; href: string; icon: any; category: string; desc: string; badge?: string }>;
}) {
  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardContent className="p-3.5 sm:p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search commands, modules, or actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 pr-9 sm:pr-10 rounded-xl sm:rounded-2xl h-10 sm:h-11 bg-muted/40 border-border/80 text-xs sm:text-sm focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {searchQuery ? (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Matching Shortcuts ({commands.length})
            </p>
            {commands.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No matching admin modules found.</p>
            ) : (
              commands.map((cmd) => {
                const IconComponent = cmd.icon;
                return (
                  <Link
                    key={cmd.href}
                    href={cmd.href}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{cmd.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">({cmd.category})</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{cmd.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cmd.badge && (
                        <Badge variant="outline" className="text-[10px] font-semibold text-amber-600 border-amber-500/30 bg-amber-500/10">
                          {cmd.badge}
                        </Badge>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground shrink-0">Jumps:</span>
            <Link href="/admin/notes" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              📄 Notes
            </Link>
            <Link href="/admin/assignments" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              📝 Tasks
            </Link>
            <Link href="/admin/practicals" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              🧪 Labs
            </Link>
            <Link href="/admin/users" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              👥 Students
            </Link>
            <Link href="/admin/access-requests" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              🔔 Admissions
            </Link>
            <Link href="/admin/library" className="text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium shrink-0">
              📚 Library
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentUploadsShowcase({
  uploads,
  loading,
  onPreview,
}: {
  uploads: RecentUpload[];
  loading: boolean;
  onPreview: (url: string, title: string) => void;
}) {
  const typeBadgeConfig: Record<string, { label: string; color: string }> = {
    note: { label: "Note", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
    assignment: { label: "Assignment", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
    practical: { label: "Practical", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    library: { label: "Library", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  };

  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Recent Resource Uploads
          </CardTitle>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Latest published documents with instant modal review.
          </p>
        </div>
        <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
          Live
        </span>
      </CardHeader>
      <CardContent className="p-3 sm:p-5">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-9 w-9 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/3 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <FileText className="h-7 w-7 text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">No recent uploads recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map((item) => {
              const cfg = typeBadgeConfig[item.type] || { label: item.type, color: "bg-muted text-muted-foreground" };
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-border/60 bg-card hover:bg-muted/30 transition-all gap-2.5 sm:gap-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      {item.type === "note" && <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {item.type === "assignment" && <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {item.type === "practical" && <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      {item.type === "library" && <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[170px] min-[400px]:max-w-[220px] sm:max-w-xs" title={item.title}>
                          {item.title}
                        </span>
                        <Badge variant="outline" className={`text-[9px] sm:text-[10px] font-semibold py-0 px-1.5 ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground flex-wrap">
                        <span className="text-foreground/80 font-medium truncate max-w-[120px] sm:max-w-none">{item.subjectName}</span>
                        {item.sectionName && (
                          <>
                            <span>•</span>
                            <span>{item.sectionName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{timeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPreview(item.fileUrl, item.title)}
                        className="rounded-xl h-7 sm:h-8 px-2 sm:px-2.5 gap-1 sm:gap-1.5 text-xs font-medium"
                        title="Instant Lightbox Preview"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden min-[480px]:inline">Preview</span>
                      </Button>
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

function AcademicHealthCard({
  distribution,
  total,
  stats,
}: {
  distribution: { notes: number; assignments: number; practicals: number; library: number };
  total: number;
  stats: Stats;
}) {
  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
            <BarChart3 className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />
            Content Balance
          </CardTitle>
          <span className="text-xs font-semibold text-muted-foreground font-mono">
            {total} items
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Multi-segment progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden flex">
            <div style={{ width: `${distribution.notes}%` }} className="bg-indigo-500 h-full transition-all" title={`Notes: ${distribution.notes}%`} />
            <div style={{ width: `${distribution.assignments}%` }} className="bg-purple-500 h-full transition-all" title={`Assignments: ${distribution.assignments}%`} />
            <div style={{ width: `${distribution.practicals}%` }} className="bg-emerald-500 h-full transition-all" title={`Practicals: ${distribution.practicals}%`} />
            <div style={{ width: `${distribution.library}%` }} className="bg-sky-500 h-full transition-all" title={`Library: ${distribution.library}%`} />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground text-right">Distribution across formats</p>
        </div>

        {/* Legend pills */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="font-medium text-foreground text-[11px] sm:text-xs">Notes</span>
            </div>
            <span className="font-mono font-semibold text-muted-foreground text-[11px] sm:text-xs">{stats.totalNotes}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
              <span className="font-medium text-foreground text-[11px] sm:text-xs">Tasks</span>
            </div>
            <span className="font-mono font-semibold text-muted-foreground text-[11px] sm:text-xs">{stats.totalAssignments}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium text-foreground text-[11px] sm:text-xs">Labs</span>
            </div>
            <span className="font-mono font-semibold text-muted-foreground text-[11px] sm:text-xs">{stats.totalPracticals}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span className="font-medium text-foreground text-[11px] sm:text-xs">Library</span>
            </div>
            <span className="font-mono font-semibold text-muted-foreground text-[11px] sm:text-xs">{stats.totalLibrary}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({
  activities,
  filter,
  onFilterChange,
  loading,
  expanded,
}: {
  activities: ActivityItem[];
  filter: ActivityCategory;
  onFilterChange: (f: ActivityCategory) => void;
  loading: boolean;
  expanded?: boolean;
}) {
  const filterOptions: { key: ActivityCategory; label: string }[] = [
    { key: "all", label: "All" },
    { key: "uploads", label: "Uploads" },
    { key: "requests", label: "Approvals" },
    { key: "users", label: "Users" },
  ];

  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="space-y-0.5">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />
            Activity Stream
          </CardTitle>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Live administrative and moderation log.
          </p>
        </div>

        {/* Category Tabs (Horizontally scrollable on small mobile) */}
        <div className="flex items-center gap-1 bg-muted/80 rounded-xl p-0.5 sm:p-1 border border-border/60 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onFilterChange(opt.key)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
                filter === opt.key
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Clock className="h-7 w-7 text-muted-foreground/40 mx-auto" />
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">No activities found in this filter</p>
          </div>
        ) : (
          <div className={`space-y-1.5 divide-y divide-border/40 ${expanded ? "max-h-none" : "max-h-[460px] overflow-y-auto pr-1"}`}>
            {activities.map((a) => {
              const info = getActionInfo(a.action);
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-2.5 sm:gap-3.5 pt-2.5 first:pt-0 pb-1.5 hover:bg-muted/30 px-1.5 sm:px-2 rounded-xl transition-colors"
                >
                  <span className="text-lg sm:text-xl mt-0.5 shrink-0 select-none">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`text-[11px] sm:text-xs font-semibold ${info.color}`}>{info.label}</span>
                        {a.sectionName && (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
                            {a.sectionName}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
                    </div>
                    {a.details && (
                      <p className="text-[11px] sm:text-xs text-foreground/90 font-medium truncate mt-0.5">
                        {a.details}
                      </p>
                    )}
                    {a.user && (
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
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

function AdminCommandCenter({
  isSuperAdmin,
  grid,
}: {
  isSuperAdmin: boolean;
  grid?: boolean;
}) {
  const commandSections = [
    {
      category: "Academic Content",
      badge: "Materials",
      items: [
        { label: "Notes", href: "/admin/notes", icon: FileText, color: "text-blue-500", desc: "Lecture docs & PDFs" },
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList, color: "text-purple-500", desc: "Coursework & deadlines" },
        { label: "Practicals", href: "/admin/practicals", icon: FlaskConical, color: "text-emerald-500", desc: "Lab manuals & guides" },
        { label: "Digital Library", href: "/admin/library", icon: BookOpen, color: "text-sky-500", desc: "Reference books & materials" },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            category: "Curriculum Structure",
            badge: "Super Admin",
            items: [
              { label: "Subjects", href: "/admin/subjects", icon: Layers, color: "text-teal-500", desc: "Syllabus units & credits" },
              { label: "Streams", href: "/admin/streams", icon: GraduationCap, color: "text-amber-500", desc: "Academic departments" },
              { label: "Sections", href: "/admin/sections", icon: School, color: "text-rose-500", desc: "Class cohorts & batches" },
            ],
          },
        ]
      : []),
    {
      category: "User Governance",
      badge: "Administration",
      items: [
        { label: "Students Directory", href: "/admin/users", icon: Users, color: "text-blue-500", desc: "Manage accounts & sections" },
        { label: "Enroll Student", href: "/admin/add-student", icon: UserPlus, color: "text-indigo-500", desc: "Create a new student credential" },
        { label: "Access Requests", href: "/admin/access-requests", icon: Bell, color: "text-amber-500", desc: "Student registration approvals" },
        { label: "Student Submissions", href: "/admin/user-requests", icon: Inbox, color: "text-purple-500", desc: "Review student uploaded content" },
        ...(isSuperAdmin
          ? [{ label: "Admin Requests", href: "/admin/admin-requests", icon: Shield, color: "text-purple-500", desc: "Faculty privilege proposals" }]
          : []),
        { label: "Contact Messages", href: "/admin/messages", icon: Mail, color: "text-emerald-500", desc: "Student inquiries & feedback" },
      ],
    },
  ];

  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-foreground">
            <Compass className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />
            Navigation Hub
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            1-Click Control
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5 space-y-3.5 sm:space-y-4">
        {commandSections.map((section) => (
          <div key={section.category} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/60">{section.badge}</span>
            </div>
            <div className={`grid gap-2 ${grid ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="group">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-150">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
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
