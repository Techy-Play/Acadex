/** Metadata-only layout for the Dashboard page (title + Open Graph). */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Acadex dashboard entry point. Sign in to access your academic resources, subjects, assignments, and practicals.",
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
  openGraph: {
    title: "Dashboard | Acadex",
    description:
      "Acadex dashboard entry point. Sign in to access your academic resources, subjects, assignments, and practicals.",
    url: "https://au-acadex.com/dashboard",
    images: [
      {
        url: "https://au-acadex.com/images/site-logo.png",
        width: 512,
        height: 512,
        alt: "Acadex Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Dashboard | Acadex",
    description:
      "Acadex dashboard entry point. Sign in to access your academic resources, subjects, assignments, and practicals.",
    images: {
      url: "https://au-acadex.com/images/site-logo.png",
      alt: "Acadex Logo",
    },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
