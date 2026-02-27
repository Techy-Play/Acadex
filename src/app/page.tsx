import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 -z-20" />

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-float [animation-delay:3s]" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-300/15 dark:bg-blue-500/8 rounded-full blur-3xl animate-float [animation-delay:5s]" />

      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 md:px-12 animate-slide-down sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-transparent [&:not(:first-child)]:border-border/50">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={220} height={56} className="h-14 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="px-4 py-2 text-sm font-medium text-foreground bg-accent rounded-lg">
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
      <nav className="flex md:hidden items-center justify-between px-4 py-3 relative z-10 animate-slide-down">
        <Link href="/" className="flex items-center">
          <Image src="/images/site-logo.svg" alt="Acadex" width={180} height={48} className="h-12 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pt-8 pb-28 md:pb-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="animate-fade-in [animation-delay:0.1s] opacity-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Academic Resource Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] animate-slide-up [animation-delay:0.2s] opacity-0">
            Everything you need,
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              one platform.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up [animation-delay:0.4s] opacity-0 leading-relaxed">
            Acadex is an open-source academic resource management platform engineered by Mr Techie.
            Built by students for students, it replaces unstructured WhatsApp sharing and outdated ERP systems
            with a modern, secure, and organized academic dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up [animation-delay:0.6s] opacity-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background/50 backdrop-blur-sm px-8 py-3.5 text-base font-medium hover:bg-accent transition-all hover:-translate-y-0.5"
            >
              Login
            </Link>
            <Link
              href="/apply"
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 text-base font-medium shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Get Started
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-16 w-full max-w-3xl mx-auto animate-scale-in [animation-delay:0.8s] opacity-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: "📚", label: "Subject Notes", value: "Organized" },
              { icon: "📝", label: "Assignments", value: "Tracked" },
              { icon: "🧪", label: "Practicals", value: "With Code" },
              { icon: "🔒", label: "Access", value: "Secure" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1 rounded-2xl border bg-card/50 backdrop-blur-sm p-4 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-sm font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 w-full max-w-5xl mx-auto animate-scale-in [animation-delay:1s] opacity-0">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Built for <span className="text-indigo-600 dark:text-indigo-400">students</span>, by students
            </h2>
            <p className="text-muted-foreground mt-2">Everything you need to stay on top of your academics</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "📂",
                title: "Organized Notes",
                desc: "Subject-wise notes and study materials at your fingertips. Filter by subject or search.",
                color: "from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/5",
                iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
              },
              {
                icon: "📝",
                title: "Assignment Tracker",
                desc: "Never miss a deadline. View all assignments structured by subject with details.",
                color: "from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/5",
                iconBg: "bg-purple-100 dark:bg-purple-900/50",
              },
              {
                icon: "🧪",
                title: "Practicals & Code",
                desc: "Access practical questions with code snippets. Mark completions to track progress.",
                color: "from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5",
                iconBg: "bg-blue-100 dark:bg-blue-900/50",
              },
              {
                icon: "🔐",
                title: "Secure Access",
                desc: "Login with your college ID. Admin-controlled access ensures only classmates join.",
                color: "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/5",
                iconBg: "bg-green-100 dark:bg-green-900/50",
              },
              {
                icon: "🎨",
                title: "Personalized Themes",
                desc: "Dark mode, light mode, and 7+ accent colors. Make it look the way you like.",
                color: "from-pink-500/10 to-pink-500/5 dark:from-pink-500/20 dark:to-pink-500/5",
                iconBg: "bg-pink-100 dark:bg-pink-900/50",
              },
              {
                icon: "📱",
                title: "Mobile Friendly",
                desc: "Fully responsive design. Access everything on your phone, tablet, or laptop.",
                color: "from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/5",
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`group rounded-2xl border bg-gradient-to-br ${feature.color} backdrop-blur-sm p-6 text-left space-y-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`h-11 w-11 rounded-xl ${feature.iconBg} flex items-center justify-center text-xl shadow-sm`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-base">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Source / Contribute */}
        <div className="mt-20 w-full max-w-2xl mx-auto animate-scale-in [animation-delay:1.2s] opacity-0">
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
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Open Source & Community Driven</h2>
              <p className="text-sm sm:text-base text-gray-300 max-w-md mx-auto leading-relaxed">
                Acadex is open source. Contribute features, fix bugs, or suggest improvements — every contribution matters.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href="https://github.com/Techy-Play/Acadex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Contribute on GitHub
                </a>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/about" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground">
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
      <footer className="hidden md:block py-8 px-6 md:px-12 mt-12 border-t bg-card/30 backdrop-blur-sm animate-fade-in [animation-delay:1.6s] opacity-0">
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
