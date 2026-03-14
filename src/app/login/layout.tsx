/** Metadata-only layout for the Login page (title + Open Graph). */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to your Acadex account to access academic resources, notes, assignments, and practicals.",
  alternates: {
    canonical: "/login",
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
  openGraph: {
    title: "Login | Acadex",
    description:
      "Sign in to your Acadex account to access academic resources, notes, assignments, and practicals.",
    url: "https://au-acadex.com/login",
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
    title: "Login | Acadex",
    description:
      "Sign in to your Acadex account to access academic resources, notes, assignments, and practicals.",
    images: {
      url: "https://au-acadex.com/images/site-logo.png",
      alt: "Acadex Logo",
    },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
