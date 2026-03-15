"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function StudentMessagesPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const messages = (data.notifications || []).filter(
        (n: NotificationItem) => n.type === "admin_message"
      );
      setItems(messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMessages();
    const timer = setInterval(() => {
      void fetchMessages();
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      toast.error("Failed to mark message as read");
    }
  }

  async function dismiss(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "DELETE" });
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to dismiss message");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl animate-pulse">
            <CardContent className="p-5">
              <div className="h-20 rounded-xl bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Announcements and messages from admins</p>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {unreadCount} unread
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No admin messages yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card
              key={item.id}
              className={`rounded-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${
                item.read ? "opacity-90" : "border-primary/30 bg-primary/5"
              }`}
              style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{item.title}</span>
                  {!item.read && <span className="text-[10px] uppercase text-primary">New</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{item.message}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {!item.read && (
                      <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                        Mark read
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => dismiss(item.id)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
