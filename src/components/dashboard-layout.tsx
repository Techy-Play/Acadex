/**
 * @component DashboardLayout
 * @description Shell layout for all dashboard pages. Composes Navbar,
 * Sidebar, and BottomNav. Handles auth session fetching, sidebar
 * toggle state, and role-based navigation link generation.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { useAccentColor } from "@/components/theme-toggle";
import { fetchMeCached } from "@/lib/client-auth";

// Icons as inline SVGs
const icons = {
  home: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  notes: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  assignments: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  addUser: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  addNote: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  subjects: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  streams: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  practicals: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  sections: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  messages: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  library: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  upload: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
};

const studentLinks = [
  { href: "/user/dashboard", label: "Dashboard", icon: icons.home },
  { href: "/user/dashboard/notes", label: "Notes", icon: icons.notes },
  { href: "/user/dashboard/assignments", label: "Assignments", icon: icons.assignments },
  { href: "/user/dashboard/practicals", label: "Practicals", icon: icons.practicals },
  { href: "/user/dashboard/requests", label: "My Requests", icon: icons.upload },
  { href: "/user/dashboard/library", label: "Library", icon: icons.library },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: icons.home },
  { href: "/admin/users", label: "Manage Users", icon: icons.users },
  { href: "/admin/access-requests", label: "Access Requests", icon: icons.addUser },
  { href: "/admin/admin-requests", label: "Admin Requests", icon: icons.shield },
  { href: "/admin/messages", label: "Contact Messages", icon: icons.messages },
  { href: "/admin/notes", label: "Notes", icon: icons.notes },
  { href: "/admin/assignments", label: "Assignments", icon: icons.assignments },
  { href: "/admin/practicals", label: "Practicals", icon: icons.practicals },
  { href: "/admin/subjects", label: "Subjects", icon: icons.subjects },
  { href: "/admin/streams", label: "Streams", icon: icons.streams },
  { href: "/admin/sections", label: "Sections", icon: icons.sections },
  { href: "/admin/user-requests", label: "User Requests", icon: icons.upload },
  { href: "/admin/library", label: "Library", icon: icons.library },
];

interface UserData {
  id: string;
  name: string;
  adminAlias?: string | null;
  college_id: string;
  role: "admin" | "student";
  profileImage?: string | null;
  isSuperAdmin?: boolean;
  isAdminSubject?: boolean;
  isAdminStream?: boolean;
  isAdminSection?: boolean;
  section?: { id: string; name: string } | null;
  must_change_password: boolean;
  theme?: string;
  accentColor?: string;
  mobileNavPosition?: "top" | "bottom" | "left";
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { initFromServer } = useAccentColor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine view based on current path
  const isOnAdminRoute = pathname.startsWith("/admin");

  const hasInitializedThemeRef = useRef(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await fetchMeCached();
        setUser(data.user);

        // Apply server-saved theme preferences once on initial mount
        if (!hasInitializedThemeRef.current) {
          hasInitializedThemeRef.current = true;
          if (data.user.theme) {
            setTheme(data.user.theme);
          }
          if (data.user.accentColor) {
            initFromServer(data.user.accentColor);
          }
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router, setTheme, initFromServer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const showingAdminView = isAdmin && isOnAdminRoute;

  // Build admin links dynamically based on permissions
  const links = showingAdminView
    ? adminLinks.filter((link) => {
        if (link.href === "/admin/subjects") return user.isAdminSubject;
        if (link.href === "/admin/streams") return user.isAdminStream;
        if (link.href === "/admin/sections") return user.isAdminSection;
        return true;
      })
    : studentLinks;

  // Admin always gets bottom nav on mobile; student uses their preference
  const mobileNav = isOnAdminRoute ? "bottom" : (user.mobileNavPosition || "bottom");

  // For bottom nav: no hamburger on mobile, show bottom tab bar
  // For left nav: always-visible icon sidebar on mobile, no hamburger
  // For top nav: current behavior (hamburger + slide-in sidebar)

  const initials = (showingAdminView && user.adminAlias ? user.adminAlias : user.name)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileHref = isOnAdminRoute ? "/admin/profile" : "/user/dashboard/profile";

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        userName={showingAdminView && user.adminAlias ? user.adminAlias : user.name}
        userRole={user.role}
        profileImage={user.profileImage}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        isAdmin={isAdmin}
        isOnAdminRoute={isOnAdminRoute}
        onViewToggle={() => {
          setSidebarOpen(false);
          router.push(isOnAdminRoute ? "/user/dashboard" : "/admin");
        }}
        mobileNavPosition={mobileNav}
      />
      <div className="flex">
        {/* Left nav: always-visible icon sidebar on mobile */}
        {mobileNav === "left" ? (
          <Sidebar
            links={links}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            mobileMode="icons"
          />
        ) : (
          <Sidebar
            links={links}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            mobileMode={mobileNav === "bottom" ? "hidden" : "slide"}
          />
        )}
        <main
          className={`flex-1 min-w-0 overflow-x-hidden p-4 md:p-6 lg:p-8 min-h-[calc(100vh-3.5rem)] ${
            mobileNav === "bottom" ? "pb-20 md:pb-6 lg:pb-8" : ""
          } ${
            mobileNav === "left" ? "ml-14 md:ml-0" : ""
          }`}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav - mobile only */}
      {mobileNav === "bottom" && (
        <BottomNav
          links={links}
          profileHref={profileHref}
          userInitials={initials}
          variant={isOnAdminRoute ? "admin" : "student"}
          isSuperAdmin={user.isSuperAdmin}
        />
      )}
    </div>
  );
}
