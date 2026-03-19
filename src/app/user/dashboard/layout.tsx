/** User dashboard shell — wraps children in the DashboardLayout (sidebar + nav). */
import type { Metadata } from "next";

import { DashboardLayout } from "@/components/dashboard-layout";

export const metadata: Metadata = {
  title: {
    default: "User Dashboard",
    template: "%s | Acadex",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
