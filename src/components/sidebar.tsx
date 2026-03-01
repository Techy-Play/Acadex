/**
 * @component Sidebar
 * @description Desktop/mobile sidebar navigation. Supports configurable
 * `mobileMode` (slide / hidden / icons), active-link highlighting,
 * and an overlay backdrop for the mobile slide-out drawer.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
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
}

export function Sidebar({ links, open, onClose, children, mobileMode = "slide" }: SidebarProps) {
  const pathname = usePathname();

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
                    "flex items-center justify-center h-10 w-10 rounded-xl transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
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

      {/* === Full desktop sidebar (always visible on md+) + slide sidebar for "slide" mode on mobile === */}
      <aside
        className={cn(
          // Desktop: always visible full sidebar
          "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0 md:sticky md:top-14 md:z-0 flex flex-col",
          // Mobile behavior depends on mode
          mobileMode === "slide"
            ? (open ? "translate-x-0" : "-translate-x-full")
            : "-translate-x-full md:translate-x-0",
          // When icons mode, offset main sidebar start on mobile (but it's off-screen anyway)
          mobileMode === "icons" && "md:translate-x-0"
        )}
      >
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto scrollbar-thin">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" &&
                link.href !== "/user/dashboard" &&
                pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </aside>
    </>
  );
}
