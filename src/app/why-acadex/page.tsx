/**
 * @page WhyAcadex (/why-acadex)
 * @description Marketing page comparing Acadex to WhatsApp groups and ERP portals.
 */import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Why Acadex – WhatsApp & ERP Alternative for Students",
  description:
    "Discover why Acadex replaces chaotic WhatsApp groups and outdated ERP systems with a structured, modern academic resource platform.",
  openGraph: {
    title: "Why Acadex – WhatsApp & ERP Alternative for Students | Acadex",
    description:
      "Discover why Acadex replaces chaotic WhatsApp groups and outdated ERP systems with a structured, modern academic resource platform.",
    url: "https://au-acadex.com/why-acadex",
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
    title: "Why Acadex – WhatsApp & ERP Alternative for Students | Acadex",
    description:
      "Discover why Acadex replaces chaotic WhatsApp groups and outdated ERP systems with a structured, modern academic resource platform.",
    images: {
      url: "https://au-acadex.com/images/site-logo.png",
      alt: "Acadex Logo",
    },
  },
};

export default function WhyAcadexPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 -z-20" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Desktop Navbar */}
      <nav aria-label="Desktop navigation" className="hidden md:flex items-center justify-between px-6 py-4 md:px-12 animate-slide-down relative z-10">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={220} height={56} className="h-14 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Home
          </Link>
          <Link href="/why-acadex" className="px-4 py-2 text-sm font-medium text-foreground bg-accent rounded-lg">
            Why Acadex
          </Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            About Us
          </Link>
          <Link href="/contact" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Contact
          </Link>
          <Link href="/library" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Library
          </Link>
          <div className="ml-2">
            <ThemeToggle />
          </div>
          <Link
            href="/login"
            className="ml-1 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav aria-label="Mobile navigation" className="flex md:hidden items-center justify-between px-4 py-3 relative z-10">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={180} height={48} className="h-12 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 py-12 pb-28 md:pb-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4 animate-slide-up [animation-delay:0.1s]">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
              Why Acadex?
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-tight">
              Not your typical{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                college portal.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Acadex is built by students, for students — designed to solve the
              real problems your college ERP and WhatsApp groups never bothered to fix.
            </p>
          </div>

          {/* The Problem */}
          <div className="space-y-6 animate-slide-up [animation-delay:0.3s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">The Problem</h2>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-muted-foreground">
              <p className="text-base leading-relaxed">
                Every semester, the same chaos repeats — notes get buried in WhatsApp group chats,
                assignments are shared as random PDFs that nobody can find two days later, and
                practical questions circulate through screenshots that someone&apos;s friend&apos;s friend forwarded.
              </p>
              <p className="text-base leading-relaxed">
                Your college ERP? It&apos;s stuck in 2005, barely loads, and doesn&apos;t even share actual study materials.
                You end up spending more time <em>looking</em> for resources than actually studying.
                Acadex changes all of that.
              </p>
            </div>
          </div>

          {/* Acadex vs WhatsApp */}
          <div className="space-y-6 animate-slide-up [animation-delay:0.4s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Acadex vs. WhatsApp Groups
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: "💬",
                  badTitle: "WhatsApp Groups",
                  badDesc: "Notes buried under 500 unread messages. \"Bhai notes bhej de\" every other day. Screenshots of screenshots.",
                  goodIcon: "📂",
                  goodTitle: "Acadex",
                  goodDesc: "Everything organized by subject. Search, filter, and access any resource instantly — no scrolling required.",
                },
                {
                  icon: "📱",
                  badTitle: "Random file sharing",
                  badDesc: "PDFs with names like \"IMG_20260215.pdf\" or \"document(3).pdf\". No structure, no labels.",
                  goodIcon: "🏷️",
                  goodTitle: "Structured uploads",
                  goodDesc: "Every file is labeled, categorized by subject, and tagged. Know exactly what you're downloading.",
                },
                {
                  icon: "🔄",
                  badTitle: "Duplicates everywhere",
                  badDesc: "Same assignment shared 10 times by different people. Different versions, no clarity on which is latest.",
                  goodIcon: "✅",
                  goodTitle: "Single source of truth",
                  goodDesc: "One upload per resource, managed by admins. Always the latest version, no confusion.",
                },
                {
                  icon: "🕐",
                  badTitle: "Lost after a week",
                  badDesc: "WhatsApp media auto-deletes on low storage. Good luck finding that PDF from 3 weeks ago.",
                  goodIcon: "♾️",
                  goodTitle: "Always available",
                  goodDesc: "Resources stay accessible for the entire semester. Cloud-hosted, never lost, always a click away.",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <h3 className="font-semibold text-sm text-red-600 dark:text-red-400">{item.badTitle}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.badDesc}</p>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.goodIcon}</span>
                      <h3 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{item.goodTitle}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.goodDesc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acadex vs College ERP */}
          <div className="space-y-6 animate-slide-up [animation-delay:0.5s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Acadex vs. College ERP
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: "🐌",
                  erpTitle: "College ERP",
                  erpDesc: "Slow, clunky interfaces from 2005. Crashes during peak hours. Needs VPN sometimes.",
                  hubIcon: "⚡",
                  hubTitle: "Acadex",
                  hubDesc: "Blazing fast, modern UI built with Next.js. Works anywhere, anytime.",
                },
                {
                  icon: "📋",
                  erpTitle: "Generic for all",
                  erpDesc: "One size fits all approach. Contains features you'll never use. Confusing navigation.",
                  hubIcon: "🎯",
                  hubTitle: "Built for you",
                  hubDesc: "Laser-focused on what you actually need — notes, assignments, and practicals. Nothing more, nothing less.",
                },
                {
                  icon: "🔒",
                  erpTitle: "Notes? What notes?",
                  erpDesc: "ERP doesn't share actual study materials, notes, or code. You're on your own.",
                  hubIcon: "📚",
                  hubTitle: "All resources in one place",
                  hubDesc: "Subject-wise notes, assignment PDFs, practical questions with code — all organized and searchable.",
                },
                {
                  icon: "😴",
                  erpTitle: "Zero personalization",
                  erpDesc: "Same boring UI for everyone. No themes, no progress tracking, no motivation.",
                  hubIcon: "🎨",
                  hubTitle: "Personalized experience",
                  hubDesc: "8 accent colors, dark/light mode, assignment progress tracking, deadline alerts, and completion checklists.",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <h3 className="font-semibold text-sm text-red-600 dark:text-red-400">{item.erpTitle}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.erpDesc}</p>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.hubIcon}</span>
                      <h3 className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{item.hubTitle}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.hubDesc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 animate-slide-up [animation-delay:0.7s]">
            <h2 className="text-2xl font-bold tracking-tight">Convinced yet?</h2>
            <p className="text-muted-foreground">Join your classmates and stop hunting for resources.</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
              >
                Get Started
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background/50 backdrop-blur-sm px-8 py-3 text-sm font-medium hover:bg-accent transition-all hover:-translate-y-0.5"
              >
                About Us
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/why-acadex" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-xs font-medium">Why</span>
          </Link>
          <Link href="/contact" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Contact</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">Login</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="hidden md:block py-8 px-6 md:px-12 border-t bg-card/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Image src="/images/site-logo.svg" alt="Acadex" width={180} height={48} className="h-12 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Techy-Play/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/lokeshpaneru/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <p className="text-sm text-muted-foreground">
              Engineered by{" "}
              <span className="font-medium text-foreground">Mr Techie</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
