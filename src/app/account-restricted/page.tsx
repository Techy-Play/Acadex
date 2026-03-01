/**
 * @page AccountRestricted (/account-restricted)
 * @description Displayed when a user's account is banned or restricted.
 * Shows the restriction reason and a logout option.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountRestrictedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("restricted");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const userStatus = data.user?.status || "active";
          setUserName(data.user?.name || "");
          if (userStatus === "active") {
            router.replace("/user/dashboard");
            return;
          }
          setStatus(userStatus);
        }
      } catch {
        // ignore
      }
    }
    checkStatus();
  }, [router]);

  const isBanned = status === "banned";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto h-24 w-24 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <span className="text-5xl">{isBanned ? "🚫" : "⏸️"}</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Account {isBanned ? "Banned" : "Suspended"}
          </h1>
          {userName && (
            <p className="text-muted-foreground text-sm">
              Hey {userName}, your account has been {isBanned ? "banned" : "suspended"}.
            </p>
          )}
        </div>

        {/* Message Card */}
        <div className={`rounded-2xl border p-6 space-y-3 ${
          isBanned
            ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
            : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20"
        }`}>
          <p className={`text-sm font-medium ${
            isBanned
              ? "text-red-800 dark:text-red-300"
              : "text-amber-800 dark:text-amber-300"
          }`}>
            {isBanned
              ? "Your account has been permanently banned by an administrator. You can no longer access Acadex resources."
              : "Your account has been temporarily suspended by an administrator. This may be due to a policy violation or pending review."}
          </p>
          <p className={`text-xs ${
            isBanned
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          }`}>
            {isBanned
              ? "If you believe this is a mistake, please contact the administrator."
              : "Your access will be restored once the administrator lifts the suspension."}
          </p>
        </div>

        {/* Contact Info */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Need help? Contact the admin</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Reach out to your class admin or CR</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <span>Use the Contact Us page if you are logged out</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Log Out
          </button>
          <button
            onClick={() => router.push("/contact")}
            className="px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            Contact Us
          </button>
        </div>

        <p className="text-xs text-muted-foreground opacity-50">
          Acadex — Account Restricted
        </p>
      </div>
    </div>
  );
}
