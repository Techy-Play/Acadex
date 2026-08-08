/**
 * @component Navbar
 * @description Top navigation bar. Includes logo, notification bell
 * (polls `/api/notifications` with unread badge), user avatar dropdown
 * (profile, logout), admin/student view toggle, and ThemeToggle.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NavbarProps {
  userName: string;
  userRole: "admin" | "student";
  profileImage?: string | null;
  onMenuToggle?: () => void;
  isAdmin?: boolean;
  isOnAdminRoute?: boolean;
  onViewToggle?: () => void;
  mobileNavPosition?: "top" | "bottom" | "left";
}

export function Navbar({ userName, userRole, profileImage, onMenuToggle, isAdmin, isOnAdminRoute, onViewToggle, mobileNavPosition = "top" }: NavbarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element once on client
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification-alert.wav");
    audioRef.current.volume = 0.5;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const notifRes = await fetch("/api/notifications");
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);

        // Play sound when new unread notifications arrive
        if (
          prevUnreadRef.current !== null &&
          data.unreadCount > prevUnreadRef.current &&
          audioRef.current
        ) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        prevUnreadRef.current = data.unreadCount;
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void fetchData();
    }, 0);
    pollRef.current = setInterval(fetchData, 60000);
    return () => {
      clearTimeout(initialTimer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Notification actions
  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const handleDismissNotification = async (
    e: React.MouseEvent,
    notifId: string
  ) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: "DELETE" });
      setNotifications((prev) => {
        const wasUnread = prev.find((n) => n.id === notifId && !n.read);
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== notifId);
      });
    } catch {
      toast.error("Failed to dismiss notification");
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: "POST" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    }
    if (notif.link) {
      router.push(notif.link);
      setNotifOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Clear any cached client-side data
      localStorage.removeItem("acadex-accent");
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to logout");
    }
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileHref =
    isOnAdminRoute ? "/admin/profile" : "/user/dashboard/profile";

  const notifIcon: Record<string, string> = {
    new_note: "📄",
    new_assignment: "📝",
    new_practical: "🧪",
    deadline_alert: "⏰",
    new_access_request: "🔔",
    contact_message: "📬",
    profile_update: "🔐",
    admin_message: "💬",
    request_approved: "✅",
    request_denied: "❌",
  };

  function timeAgo(dateStr: string) {
    const diff = nowMs - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button — only shown for "top" nav position */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 ${mobileNavPosition === "top" ? "md:hidden" : "hidden md:hidden"}`}
            onClick={onMenuToggle}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>

          <Link
            href={isOnAdminRoute ? "/admin" : "/user/dashboard"}
            className="flex items-center gap-2"
          >
            <Image src="/images/logo.svg" alt="Acadex" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-semibold text-sm tracking-tight hidden sm:inline">
              Acadex
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Admin ↔ Student view toggle */}
          {isAdmin && onViewToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onViewToggle}
              title={isOnAdminRoute ? "Switch to Student View" : "Switch to Admin View"}
            >
              {isOnAdminRoute ? (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </Button>
          )}

          <ThemeToggle />

          {/* Unified Notification Bell */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[calc(100vw-2rem)] sm:w-[360px] max-h-[70vh] sm:max-h-[520px] overflow-hidden rounded-2xl p-0 shadow-lg"
            >
              {/* Header */}
              {(unreadCount > 0 || notifications.length > 0) && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                  <span className="text-sm font-medium">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <>
                        <span className="text-muted-foreground/30 text-[10px]">|</span>
                        <button
                          onClick={handleClearAll}
                          className="text-[11px] text-destructive hover:underline font-medium"
                        >
                          Clear all
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="overflow-y-auto max-h-[420px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <svg
                      className="h-8 w-8 mb-2 opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <p className="text-xs">All caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`group relative w-full text-left px-4 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer ${
                        !notif.read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5 shrink-0">
                          {notifIcon[notif.type] || "🔔"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm truncate ${
                                !notif.read
                                  ? "font-semibold"
                                  : "font-medium"
                              }`}
                            >
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) =>
                            handleDismissNotification(e, notif.id)
                          }
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Dismiss"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
              >
                <Avatar className="h-9 w-9 border border-border">
                  {profileImage && (
                    <AvatarImage src={profileImage} alt={userName} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl" sideOffset={8}>
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(profileHref)}
                className="cursor-pointer"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 cursor-pointer"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
