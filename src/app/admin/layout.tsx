/** Admin dashboard shell — wraps children in the DashboardLayout (sidebar + nav). */
"use client";

import { DashboardLayout } from "@/components/dashboard-layout";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
