/**
 * @component BottomNav
 * @description Mobile bottom navigation bar docked at bottom-0.
 * Student: 5 tabs (Dashboard, Notes, Assignments, Practicals, More).
 *          Profile & merged Requests & Uploads live inside the More drop-up menu.
 * Admin:   5 symmetrical tabs (Dashboard, Manage drop-up, Center Upload FAB, User Requests, Profile).
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
  unreadCount?: number;
}

// ─── Admin "Manage" sub-items ─────────────────────────────────────────────────
const manageSubItems = [
  { href: "/admin/users",          label: "Manage Users",      icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { href: "/admin/access-requests",label: "Access Requests",   icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
  { href: "/admin/admin-requests", label: "Admin Requests",    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  { href: "/admin/messages",       label: "Contact Messages",  icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { href: "/admin/subjects",       label: "Subjects",          icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  { href: "/admin/sections",       label: "Sections",          superAdminOnly: true,  icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { href: "/admin/streams",        label: "Streams",           superAdminOnly: true,  icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
];

// ─── Admin "Upload" sub-items ─────────────────────────────────────────────────
const uploadSubItems = [
  { href: "/admin/notes",       label: "Notes",       icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { href: "/admin/assignments", label: "Assignments", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
  { href: "/admin/practicals",  label: "Practicals",  icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> },
  { href: "/admin/library",     label: "Library",     icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
];

// ─── Student "More" sub-items ─────────────────────────────────────────────────
const studentMoreItems = [
  { href: "/user/dashboard/library",      label: "Library",            desc: "Books & PDFs",       icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
  { href: "/user/dashboard/requests",     label: "Requests & Uploads", desc: "Submit or View Files",icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> },
  { href: "/user/dashboard/pending-work", label: "Pending Work",       desc: "Deadlines & Work",   icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

// ─── Shared drop-up popup menu component ──────────────────────────────────────
function PopupMenu({
  open,
  onClose,
  title,
  side,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-xs" onClick={onClose} />
      )}
      {open && (
        <div
          className={cn(
            "fixed bottom-16 mb-2 z-50 w-64 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl p-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200 md:hidden",
            side === "right" ? "right-3" : side === "center" ? "left-1/2 -translate-x-1/2" : "left-3"
          )}
        >
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-1.5 border-b border-border/40 mb-1">
            {title}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {children}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Individual nav tab ───────────────────────────────────────────────────────
function NavTab({
  active,
  label,
  icon,
  badge,
  onClick,
  href,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full py-1">
      <div
        className={cn(
          "relative flex items-center justify-center px-3 py-0.5 rounded-xl transition-all duration-200",
          active
            ? "bg-primary/15 text-primary scale-105"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="[&>svg]:h-[22px] [&>svg]:w-[22px] shrink-0">{icon}</span>
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1 leading-none shadow-sm animate-pulse">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium leading-none transition-colors truncate max-w-full px-0.5",
          active ? "text-primary font-semibold" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );

  const cls = "flex flex-col items-center justify-center flex-1 h-full relative transition-transform duration-100 active:scale-95";

  if (href) {
    return <Link href={href} className={cls}>{inner}</Link>;
  }
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function BottomNav({
  links,
  profileHref,
  userInitials,
  variant = "student",
  isSuperAdmin = false,
  unreadCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [moreOpen,   setMoreOpen]   = useState(false);

  const isProfileActive = pathname === profileHref;

  // ── ADMIN (2 - 1 - 2 Symmetrical Layout) ──────────────────────────────────
  if (variant === "admin") {
    const isUploadActive = ["/admin/notes","/admin/assignments","/admin/practicals","/admin/library"].some(p => pathname.startsWith(p));
    const isManageActive = ["/admin/users","/admin/access-requests","/admin/admin-requests","/admin/messages","/admin/subjects","/admin/sections","/admin/streams"].some(p => pathname.startsWith(p));
    const filteredManage = manageSubItems.filter(i => !i.superAdminOnly || isSuperAdmin);

    return (
      <>
        {/* Manage popup */}
        <PopupMenu open={manageOpen} onClose={() => setManageOpen(false)} title="Manage" side="left">
          {filteredManage.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setManageOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                pathname.startsWith(item.href) ? "bg-primary/15 text-primary font-semibold" : "text-foreground hover:bg-muted"
              )}
            >
              {item.icon}{item.label}
            </Link>
          ))}
        </PopupMenu>

        {/* Upload popup */}
        <PopupMenu open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Content" side="center">
          {uploadSubItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setUploadOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                pathname.startsWith(item.href) ? "bg-primary/15 text-primary font-semibold" : "text-foreground hover:bg-muted"
              )}
            >
              {item.icon}{item.label}
            </Link>
          ))}
        </PopupMenu>

        {/* Docked Navbar at bottom-0 */}
        <nav aria-label="Admin navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden safe-area-bottom">
          <div className="flex items-center justify-between h-16 px-2 max-w-md mx-auto">

            {/* 1. Dashboard */}
            <NavTab href="/admin" active={pathname === "/admin"} label="Dashboard"
              icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
            />

            {/* 2. Manage */}
            <NavTab active={isManageActive || manageOpen} label="Manage"
              onClick={() => { setManageOpen(!manageOpen); setUploadOpen(false); }}
              icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />

            {/* 3. Center Raised FAB (Upload) */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => { setUploadOpen(!uploadOpen); setManageOpen(false); }}
                className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center -mt-5 transition-transform duration-150 active:scale-90 border-2 border-background"
                aria-label="Upload Content"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* 4. User Requests */}
            <NavTab href="/admin/user-requests" active={pathname === "/admin/user-requests"} label="Requests"
              icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
            />

            {/* 5. Profile */}
            <NavTab href={profileHref} active={isProfileActive} label="Profile"
              badge={unreadCount > 0 ? unreadCount : undefined}
              icon={
                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border-[1.5px]", isProfileActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 text-muted-foreground")}>
                  {userInitials}
                </div>
              }
            />
          </div>
        </nav>
      </>
    );
  }

  // ── STUDENT (5 Tabs: Dashboard, Notes, Assignments, Practicals, More) ────────
  const mainItems = links.slice(0, 4); // Dashboard, Notes, Assignments, Practicals
  const isMoreActive = isProfileActive || studentMoreItems.some(i => pathname === i.href || pathname.startsWith(i.href));

  return (
    <>
      {/* More drop-up popup with Profile placed at the bottom */}
      <PopupMenu open={moreOpen} onClose={() => setMoreOpen(false)} title="More Options" side="right">
        {studentMoreItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMoreOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href) ? "bg-primary/15 text-primary font-semibold" : "text-foreground hover:bg-muted"
            )}
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <div className="flex flex-col text-left">
              <span>{item.label}</span>
              <span className="text-[10px] text-muted-foreground font-normal">{item.desc}</span>
            </div>
          </Link>
        ))}

        {/* Profile item placed at the bottom of the More menu */}
        <div className="border-t border-border/40 mt-1 pt-1">
          <Link
            href={profileHref}
            onClick={() => setMoreOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors",
              isProfileActive ? "bg-primary/15 text-primary font-semibold" : "text-foreground hover:bg-muted"
            )}
          >
            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border-[1.5px]", isProfileActive ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 text-muted-foreground")}>
              {userInitials}
            </div>
            <div className="flex flex-col text-left">
              <span>Profile & Settings</span>
              <span className="text-[10px] text-muted-foreground font-normal">Account, Theme & Prefs</span>
            </div>
          </Link>
        </div>
      </PopupMenu>

      {/* Docked Navbar at bottom-0 */}
      <nav aria-label="Student navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">

          {mainItems.map(link => {
            const isActive = pathname === link.href || (link.href !== "/user/dashboard" && pathname.startsWith(link.href));
            return (
              <NavTab
                key={link.href}
                href={link.href}
                active={isActive}
                label={link.label}
                badge={link.href === "/user/dashboard" && unreadCount > 0 ? unreadCount : undefined}
                icon={link.icon}
              />
            );
          })}

          {/* 5th Tab: More */}
          <NavTab
            active={isMoreActive || moreOpen}
            label="More"
            onClick={() => setMoreOpen(!moreOpen)}
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
          />
        </div>
      </nav>
    </>
  );
}
