/**
 * @component BottomNav
 * @description Mobile bottom navigation bar with role-aware links
 * (student vs admin). Admins get an expandable “Manage” sub-menu.
 * Includes profile avatar shortcut.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface BottomNavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  links: BottomNavLink[];
  profileHref: string;
  userInitials: string;
  variant?: "student" | "admin";
  isSuperAdmin?: boolean;
}

// Admin-specific bottom nav items
const adminBottomItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
];

const manageSubItems = [
  {
    href: "/admin/users",
    label: "Manage Users",
    superAdminOnly: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/access-requests",
    label: "Access Requests",
    superAdminOnly: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    href: "/admin/messages",
    label: "Messages",
    superAdminOnly: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/user-requests",
    label: "User Requests",
    superAdminOnly: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    superAdminOnly: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/admin/sections",
    label: "Sections",
    superAdminOnly: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/admin/streams",
    label: "Streams",
    superAdminOnly: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const uploadSubItems = [
  {
    href: "/admin/notes",
    label: "Notes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/assignments",
    label: "Assignments",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/admin/practicals",
    label: "Practicals",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
];

export function BottomNav({ links, profileHref, userInitials, variant = "student", isSuperAdmin = false }: BottomNavProps) {
  const pathname = usePathname();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const isProfileActive = pathname === profileHref;

  // For admin, use admin-specific items
  if (variant === "admin") {
    const isUploadActive =
      pathname.startsWith("/admin/notes") ||
      pathname.startsWith("/admin/assignments") ||
      pathname.startsWith("/admin/practicals");

    const isManageActive =
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/access-requests") ||
      pathname.startsWith("/admin/user-requests") ||
      pathname.startsWith("/admin/messages") ||
      pathname.startsWith("/admin/subjects") ||
      pathname.startsWith("/admin/sections") ||
      pathname.startsWith("/admin/streams");

    const filteredManageItems = manageSubItems.filter(
      (item) => !item.superAdminOnly || isSuperAdmin
    );

    return (
      <>
        {/* Popup overlays */}
        {(uploadOpen || manageOpen) && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => { setUploadOpen(false); setManageOpen(false); }}
          />
        )}

        <nav aria-label="Admin navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden">
          {/* Manage sub-menu popup */}
          {manageOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-52 rounded-2xl border bg-background shadow-xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Manage
              </div>
              {filteredManageItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setManageOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Upload sub-menu popup */}
          {uploadOpen && (
            <div className="absolute bottom-full right-4 mb-2 w-48 rounded-2xl border bg-background shadow-xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Upload Content
              </div>
              {uploadSubItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setUploadOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center justify-around h-14 px-1">
            {adminBottomItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                  {item.icon}
                  <span className="text-xs font-medium leading-none">{item.label}</span>
                </Link>
              );
            })}

            {/* Manage button with popup */}
            <button
              onClick={() => { setManageOpen(!manageOpen); setUploadOpen(false); }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isManageActive || manageOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              {(isManageActive || manageOpen) && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
              )}
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium leading-none">Manage</span>
            </button>

            {/* Upload button with popup */}
            <button
              onClick={() => { setUploadOpen(!uploadOpen); setManageOpen(false); }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isUploadActive || uploadOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              {(isUploadActive || uploadOpen) && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
              )}
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium leading-none">Upload</span>
            </button>

            {/* Profile tab */}
            <Link
              href={profileHref}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isProfileActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isProfileActive && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
              )}
              <div
                className={cn(
                  "h-[22px] w-[22px] rounded-full flex items-center justify-center text-[9px] font-bold border-[1.5px]",
                  isProfileActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50 text-muted-foreground"
                )}
              >
                {userInitials}
              </div>
              <span className="text-xs font-medium leading-none">Profile</span>
            </Link>
          </div>
        </nav>
      </>
    );
  }

  // ─── Student bottom nav ───
  const navItems = links.slice(0, 4);

  return (
    <nav aria-label="Student navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/user/dashboard" &&
              pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
              )}
              <span className="[&>svg]:h-[22px] [&>svg]:w-[22px]">
                {link.icon}
              </span>
              <span className="text-xs font-medium leading-none">
                {link.label}
              </span>
            </Link>
          );
        })}

        {/* Profile tab */}
        <Link
          href={profileHref}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
            isProfileActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isProfileActive && (
            <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
          )}
          <div
            className={cn(
              "h-[22px] w-[22px] rounded-full flex items-center justify-center text-[9px] font-bold border-[1.5px]",
              isProfileActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/50 text-muted-foreground"
            )}
          >
            {userInitials}
          </div>
          <span className="text-xs font-medium leading-none">
            Profile
          </span>
        </Link>
      </div>
    </nav>
  );
}
