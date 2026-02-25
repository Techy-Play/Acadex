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
}

export function Sidebar({ links, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" &&
                link.href !== "/dashboard" &&
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
      </aside>
    </>
  );
}
