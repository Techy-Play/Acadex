"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  replied: boolean;
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "replied">("all");

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/contact");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/contact/${id}/read`, { method: "PATCH" });
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, read: true } : m))
      );
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleReply = async (id: string, email: string, name: string, subject: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/contact/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText, email, name, subject }),
      });
      if (res.ok) {
        toast.success(`Reply sent to ${email}`);
        setReplyingTo(null);
        setReplyText("");
        setMessages((prev) =>
          prev.map((m) =>
            m._id === id
              ? { ...m, replied: true, read: true, adminReply: replyText, repliedAt: new Date().toISOString() }
              : m
          )
        );
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send reply");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/contact/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== id));
        toast.success("Message deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filter === "unread") return !m.read;
    if (filter === "replied") return m.replied;
    return true;
  });

  const unreadCount = messages.filter((m) => !m.read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardContent className="p-6"><div className="h-24 bg-muted rounded-xl" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Messages
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Contact messages from visitors — reply via email
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "unread", "replied"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-xs">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
            📬
          </div>
          <h3 className="font-semibold text-lg">
            {filter === "all" ? "No messages yet" : `No ${filter} messages`}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Messages from the contact form will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => (
            <Card
              key={msg._id}
              className={`rounded-2xl transition-all ${
                !msg.read ? "border-primary/30 bg-primary/5 shadow-md" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!msg.read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <CardTitle className="text-base font-semibold truncate">
                        {msg.subject}
                      </CardTitle>
                      {msg.replied && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                          ✓ Replied
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{msg.name}</span>
                      <span>·</span>
                      <a href={`mailto:${msg.email}`} className="hover:underline text-primary">
                        {msg.email}
                      </a>
                      <span>·</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!msg.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(msg._id)}
                        className="text-xs"
                      >
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMessage(msg._id)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-xl p-3">
                  {msg.message}
                </p>

                {/* Previous reply */}
                {msg.replied && msg.adminReply && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                      Your Reply {msg.repliedAt && `· ${new Date(msg.repliedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">
                      {msg.adminReply}
                    </p>
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === msg._id ? (
                  <div className="space-y-3 pt-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${msg.name}...`}
                      className="w-full h-28 p-3 text-sm rounded-xl border bg-background resize-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(msg._id, msg.email, msg.name, msg.subject)}
                        disabled={sending || !replyText.trim()}
                        className="rounded-lg"
                      >
                        {sending ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send Reply
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setReplyingTo(null); setReplyText(""); }}
                        className="rounded-lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(msg._id);
                      setReplyText("");
                      if (!msg.read) markAsRead(msg._id);
                    }}
                    className="rounded-lg"
                  >
                    <svg className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    {msg.replied ? "Reply Again" : "Reply"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
