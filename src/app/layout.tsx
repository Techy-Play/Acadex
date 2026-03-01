/**
 * @module RootLayout
 * @description Root server layout. Loads Geist fonts, ThemeProvider,
 * Toaster, RouteProgress, and global CSS. Wraps all pages.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ─── SEO Metadata ─────────────────────────────────── */

const siteUrl = "https://au-acadex.com";
const siteDescription =
  "Acadex is an open-source academic resource management platform built by Lokesh Paneru (Mr Techie). Designed by students for students, it replaces WhatsApp chaos and outdated ERP systems with structured, searchable, and secure academic resource management.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Acadex – Open Source Academic Resource Platform",
    template: "%s | Acadex",
  },

  description: siteDescription,

  keywords: [
    "academic resource management",
    "open source student portal",
    "college notes platform",
    "WhatsApp alternative for study materials",
    "modern academic dashboard",
    "student-built SaaS platform",
    "academic file organization system",
  ],

  authors: [
    {
      name: "Lokesh Paneru",
      url: "https://www.linkedin.com/in/lokeshpaneru/",
    },
  ],
  creator: "Lokesh Paneru",
  publisher: "Acadex",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: siteUrl,
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Acadex",
    title: "Acadex – Open Source Academic Resource Platform",
    description: siteDescription,
    images: [
      {
        url: `${siteUrl}/images/site-logo.png`,
        width: 512,
        height: 512,
        alt: "Acadex Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Acadex – Open Source Academic Resource Platform",
    description: siteDescription,
    creator: "@mrtechie",
    images: {
      url: `${siteUrl}/images/site-logo.png`,
      alt: "Acadex Logo",
    },
  },

  manifest: "/manifest.json",

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/favicon.ico", sizes: "any" },
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/images/apple-touch-icon.png",
  },
};

/* ─── JSON-LD Structured Data ──────────────────────── */

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Acadex",
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
      founder: {
        "@type": "Person",
        name: "Lokesh Paneru",
        url: "https://www.linkedin.com/in/lokeshpaneru/",
      },
      description:
        "Open-source academic resource management platform built by students for students.",
    },
    {
      "@type": "WebSite",
      name: "Acadex",
      url: siteUrl,
      description:
        "Structured academic resource management system designed to replace WhatsApp-based academic sharing.",
    },
    {
      "@type": "SiteNavigationElement",
      name: ["Home", "About", "Login", "Apply for Access", "Dashboard"],
      url: [
        `${siteUrl}/`,
        `${siteUrl}/about`,
        `${siteUrl}/login`,
        `${siteUrl}/apply`,
        `${siteUrl}/dashboard`,
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Acadex",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      creator: {
        "@type": "Person",
        name: "Lokesh Paneru",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Acadex?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Acadex is an open-source academic resource management platform that provides a structured, searchable, and secure way to organize and share academic materials like notes, assignments, and practicals.",
          },
        },
        {
          "@type": "Question",
          name: "Who built Acadex?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Acadex was built by Lokesh Paneru, also known as Mr Techie — a student developer from India.",
          },
        },
        {
          "@type": "Question",
          name: "Is Acadex only for engineering students?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Acadex is not limited to engineering students. It is an open-source academic resource management platform that can be used by any academic group or institution with proper permission.",
          },
        },
        {
          "@type": "Question",
          name: "Can any institution use Acadex?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Acadex is open source and any educational institution can deploy and use it with proper permission for structured academic resource management.",
          },
        },
        {
          "@type": "Question",
          name: "Is Acadex open source?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Acadex is fully open source and its code is available on GitHub. Contributions are welcome from the community.",
          },
        },
        {
          "@type": "Question",
          name: "How is Acadex different from WhatsApp groups?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Unlike WhatsApp groups where files get buried in chat, Acadex organizes academic resources by subject, type (notes, assignments, practicals), and makes them searchable and permanently accessible.",
          },
        },
        {
          "@type": "Question",
          name: "How is Acadex better than traditional ERP systems?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Traditional college ERP systems are often outdated, slow, and hard to navigate. Acadex provides a modern, fast, and student-friendly interface specifically designed for academic resource management.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Why Acadex",
          item: `${siteUrl}/why-acadex`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "About Us",
          item: `${siteUrl}/about`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Contact",
          item: `${siteUrl}/contact`,
        },
      ],
    },
  ],
};

/* ─── Root Layout ──────────────────────────────────── */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2563eb" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="acadex-theme"
        >
          <Suspense>
            <RouteProgress />
          </Suspense>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
