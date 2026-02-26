import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AboutPage() {
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
      <nav className="hidden md:flex items-center justify-between px-6 py-4 md:px-12 animate-slide-down relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-sm">AX</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Acadex</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Home
          </Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-foreground bg-accent rounded-lg">
            About
          </Link>
          <Link href="/contact" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
            Contact
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
      <nav className="flex md:hidden items-center justify-between px-4 py-3 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">AX</span>
          </div>
          <span className="font-bold text-base tracking-tight">Acadex</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-12 py-12 pb-28 md:pb-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4 animate-slide-up opacity-0 [animation-delay:0.1s]">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
              About Us
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-tight">
              Not your typical{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                college portal.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Acadex is built by students, for students — designed to solve the
              real problems your college ERP never bothered to fix.
            </p>
          </div>

          {/* What is Acadex */}
          <div className="space-y-6 animate-slide-up opacity-0 [animation-delay:0.3s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What is Acadex?</h2>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-4 text-muted-foreground">
              <p className="text-base leading-relaxed">
                Acadex is a centralized academic resource platform specifically built for students of
                your class. It provides a clean, organized, and modern interface to access all your subject-wise
                notes, assignments, practicals, and academic resources in one place.
              </p>
              <p className="text-base leading-relaxed">
                No more scrolling through endless WhatsApp group messages, searching for that one PDF someone
                shared 3 weeks ago, or asking &ldquo;bhai notes bhej de&rdquo; every day. Everything is uploaded,
                organized by subject, and always available.
              </p>
            </div>
          </div>

          {/* How it differs from ERP */}
          <div className="space-y-6 animate-slide-up opacity-0 [animation-delay:0.5s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              How is this different from College ERP?
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

          {/* Key Features */}
          <div className="space-y-6 animate-slide-up opacity-0 [animation-delay:0.7s]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Key Features</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "📂", title: "Subject-wise Notes", desc: "All study materials organized by subject with search and filter." },
                { icon: "📝", title: "Assignment Tracking", desc: "Track deadlines, mark completions, and see your progress at a glance." },
                { icon: "🧪", title: "Practical Checklists", desc: "Practical questions with completion tracking and code access." },
                { icon: "🔔", title: "Smart Notifications", desc: "Get notified when new content is added or deadlines are approaching." },
                { icon: "🎨", title: "Themes & Colors", desc: "Dark mode, light mode, 8 accent colors — make it yours." },
                { icon: "📱", title: "Mobile First", desc: "Fully responsive. Works perfectly on phone, tablet, and desktop." },
                { icon: "🔐", title: "Secure Access", desc: "Admin-controlled access. Only verified students can join." },
                { icon: "📊", title: "Progress Dashboard", desc: "Visual progress bars, stats, and quick overview of your academic status." },
                { icon: "🎓", title: "Stream Support", desc: "Subjects filtered automatically based on your assigned stream." },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="rounded-2xl border bg-card/50 backdrop-blur-sm p-5 space-y-2 hover:shadow-md transition-shadow"
                >
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-lg">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 animate-slide-up opacity-0 [animation-delay:0.9s]">
            <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
            <p className="text-muted-foreground">Join your classmates and start accessing all resources today.</p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
              >
                Get Started
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background/50 backdrop-blur-sm px-8 py-3 text-sm font-medium hover:bg-accent transition-all hover:-translate-y-0.5"
              >
                Contact Us
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
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/about" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-medium">About</span>
          </Link>
          <Link href="/contact" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-medium">Contact</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-medium">Login</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="hidden md:block py-8 px-6 md:px-12 border-t bg-card/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">AX</span>
            </div>
            <span className="font-semibold text-sm">Acadex</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Engineered by{" "}
            <span className="font-medium text-foreground">Mr Techie</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
