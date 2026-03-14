/**
 * @page Library (/library)
 * @description Public library landing page with feature cards (coming soon).
 */
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { LibraryHero, LibraryFeatureCard } from "@/components/library";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Acadex Library will provide centralized academic indexing with advanced search and filtering for notes, assignments, practicals, and old year papers.",
  alternates: {
    canonical: "/library",
  },
  openGraph: {
    title: "Library | Acadex",
    description:
      "Acadex Library will provide centralized academic indexing with advanced search and filtering for notes, assignments, practicals, and old year papers.",
    url: "https://au-acadex.com/library",
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
    title: "Library | Acadex",
    description:
      "Acadex Library will provide centralized academic indexing with advanced search and filtering for notes, assignments, practicals, and old year papers.",
    images: {
      url: "https://au-acadex.com/images/site-logo.png",
      alt: "Acadex Logo",
    },
  },
};

const features = [
  {
    title: "Global Search",
    description: "Search across every resource, subject, and semester instantly.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Semester Filters",
    description: "Browse resources organized by semester for targeted access.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Branch Filters",
    description: "Filter by your specific branch or department of study.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: "Academic Year Filters",
    description: "Access resources from current and previous academic years.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Resource Type Filtering",
    description: "Filter by notes, assignments, practicals, old year papers, and more.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    title: "Smart Indexing",
    description: "AI-powered tagging and categorization for faster discovery.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

export default function LibraryPage() {
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
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl" aria-hidden="true" />

      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 md:px-12 sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-transparent [&:not(:first-child)]:border-border/50" aria-label="Main navigation">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={220} height={56} className="h-14 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Home
          </Link>
          <Link href="/why-acadex" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Why Acadex
          </Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            About Us
          </Link>
          <Link href="/contact" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Contact
          </Link>
          <Link href="/library" className="px-4 py-2 text-sm font-medium text-foreground bg-accent rounded-lg">
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
      <nav className="flex md:hidden items-center justify-between px-4 py-3 relative z-10" aria-label="Main navigation">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={180} height={48} className="h-12 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 py-12 pb-28 md:pb-12">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Hero */}
          <LibraryHero />

          {/* Planned Features Grid */}
          <div className="animate-scale-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Planned Features</h2>
              <p className="text-muted-foreground mt-2">Here&apos;s what the Library will offer</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                <LibraryFeatureCard
                  key={i}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>

          {/* Notify CTA */}
          <div className="animate-scale-in">
            <div className="rounded-2xl border bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                  className="w-full h-full"
                />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">Stay Updated</h2>
                <p className="text-sm sm:text-base text-gray-300 max-w-md mx-auto leading-relaxed">
                  The Library is under active development. Check back soon for the full launch.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm cursor-not-allowed opacity-80"
                    disabled
                    title="Coming soon"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Notify Me When Live
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* AI-crawlable text */}
          <p className="sr-only">
            The Acadex Library will provide structured academic resource indexing
            across semesters, branches, and academic years. It will support
            intelligent filtering and unified search.
          </p>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/90 backdrop-blur-md" aria-label="Mobile navigation">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground" aria-label="Home">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link href="/library" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-foreground" aria-label="Library">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xs font-medium">Library</span>
          </Link>
          <Link href="/contact" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground" aria-label="Contact">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Contact</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground" aria-label="Login">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">Login</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <footer className="hidden md:block py-8 px-6 md:px-12 mt-12 border-t bg-card/30 backdrop-blur-sm">
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
