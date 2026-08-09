/** User dashboard shell — wraps children in the DashboardLayout (sidebar + nav) and UserProvider for shared session. */
import type { Metadata } from "next";

import { DashboardLayout } from "@/components/dashboard-layout";
import { PushInit } from "@/components/push-init";
import { UserProvider } from "@/context/user-context";

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
    <UserProvider>
      <DashboardLayout>
        <PushInit />
        {children}
      </DashboardLayout>
    </UserProvider>
  );
}
