/** Metadata-only layout for the Apply page (title + Open Graph). */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Access",
  description:
    "Request access to Acadex. Fill in your details and get approved to start using the academic resource platform.",
  alternates: {
    canonical: "/apply",
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
    title: "Apply for Access | Acadex",
    description:
      "Request access to Acadex. Fill in your details and get approved to start using the academic resource platform.",
    url: "https://au-acadex.com/apply",
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
    title: "Apply for Access | Acadex",
    description:
      "Request access to Acadex. Fill in your details and get approved to start using the platform.",
    images: {
      url: "https://au-acadex.com/images/site-logo.png",
      alt: "Acadex Logo",
    },
  },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
