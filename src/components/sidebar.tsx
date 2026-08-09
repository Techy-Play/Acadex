/**
 * @component Sidebar
 * @description Desktop/mobile sidebar navigation. Supports configurable
 * `mobileMode` (slide / hidden / icons), active-link highlighting,
 * collapsible desktop mode, grouped admin sections, and filled active pill.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

interface SidebarProps {
  links: SidebarLink[];
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  /** Mobile display mode:
   * "slide" = current hamburger behavior (default)
   * "hidden" = completely hidden on mobile (for bottom nav)
   * "icons" = always-visible icon-only strip on mobile (for left nav)
   */
  mobileMode?: "slide" | "hidden" | "icons";
  /** Whether this is the admin sidebar (enables grouped sections) */
  isAdmin?: boolean;
}

const COLLAPSED_KEY = "acadex-sidebar-collapsed";

export function Sidebar({ links, open, onClose, children, mobileMode = "slide", isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Load persisted collapse state
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch {}
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && href !== "/user/dashboard" && pathname.startsWith(href));

  // Admin link groups
  const adminGroups = [
    { label: "Overview", hrefs: ["/admin"] },
    { label: "Content", hrefs: ["/admin/notes", "/admin/assignments", "/admin/practicals", "/admin/library"] },
    { label: "Manage", hrefs: ["/admin/users", "/admin/access-requests", "/admin/admin-requests", "/admin/messages", "/admin/user-requests"] },
    { label: "Configure", hrefs: ["/admin/subjects", "/admin/streams", "/admin/sections"] },
  ];

  const renderLink = (link: SidebarLink, iconOnly = false) => {
    const active = isActive(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClose}
        title={iconOnly || collapsed ? link.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          collapsed && !iconOnly ? "justify-center px-2" : "",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="shrink-0 [&>svg]:h-4.5 [&>svg]:w-4.5">{link.icon}</span>
        {!collapsed && !iconOnly && (
          <span className="truncate">{link.label}</span>
        )}
      </Link>
    );
  };

  const renderGroupedLinks = () => {
    if (!isAdmin) {
      return links.map((link) => renderLink(link));
    }

    return adminGroups.map((group) => {
      const groupLinks = links.filter((l) => group.hrefs.includes(l.href));
      if (groupLinks.length === 0) return null;
      return (
        <div key={group.label} className="mb-1">
          {!collapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
          )}
          {groupLinks.map((link) => renderLink(link))}
        </div>
      );
    });
  };

  return (
    <>
      {/* Mobile overlay — only for slide mode */}
      {mobileMode === "slide" && open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* === Icon-only sidebar for mobile (left nav mode) === */}
      {mobileMode === "icons" && (
        <aside className="fixed top-14 left-0 z-20 h-[calc(100vh-3.5rem)] w-14 border-r bg-background flex flex-col md:hidden overflow-hidden">
          <nav className="flex flex-col items-center gap-1 py-3 flex-1 overflow-y-auto scrollbar-thin">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-xl transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={link.label}
                >
                  <span className="[&>svg]:h-5 [&>svg]:w-5">{link.icon}</span>
                </Link>
              );
            })}
          </nav>
          {children}
        </aside>
      )}

      {/* === Full desktop sidebar (always visible on md+) + slide for mobile === */}
      <aside
        className={cn(
          "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-200 ease-in-out md:translate-x-0 md:sticky md:top-14 md:z-0 flex flex-col",
          // Collapsed width on desktop
          collapsed ? "md:w-[60px]" : "md:w-64",
          // Full width on mobile slide-in
          "w-64",
          // Mobile visibility
          mobileMode === "slide"
            ? (open ? "translate-x-0" : "-translate-x-full")
            : "-translate-x-full md:translate-x-0",
          mobileMode === "icons" && "md:translate-x-0"
        )}
      >
        <nav className={cn(
          "flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto scrollbar-thin",
          collapsed && "items-center"
        )}>
          {renderGroupedLinks()}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="hidden md:flex border-t p-2 justify-end">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg
              className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {children}
      </aside>
    </>
  );
}
