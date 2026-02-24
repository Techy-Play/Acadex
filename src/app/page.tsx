import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 -z-10" />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-float [animation-delay:3s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-200/10 dark:bg-blue-500/5 rounded-full blur-3xl" />

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 animate-slide-down">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Section C Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="animate-fade-in [animation-delay:0.1s] opacity-0">
            <span className="inline-flex items-center rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300">
              🎓 Academic Resource Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-slide-up [animation-delay:0.2s] opacity-0">
            This website is created
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              for you — Section C.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up [animation-delay:0.4s] opacity-0">
            Your centralized hub for subject-wise notes, assignments, and academic resources.
            No more scrolling through WhatsApp — everything organized in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up [animation-delay:0.6s] opacity-0">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 text-base font-medium shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Get Started
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 animate-scale-in [animation-delay:0.8s] opacity-0">
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 text-left space-y-2 hover:shadow-lg transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl">
                📂
              </div>
              <h3 className="font-semibold">Organized Notes</h3>
              <p className="text-sm text-muted-foreground">
                Subject-wise notes and study materials at your fingertips.
              </p>
            </div>
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 text-left space-y-2 hover:shadow-lg transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xl">
                📝
              </div>
              <h3 className="font-semibold">Assignments</h3>
              <p className="text-sm text-muted-foreground">
                Track deadlines and access structured assignment details.
              </p>
            </div>
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 text-left space-y-2 hover:shadow-lg transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xl">
                🔐
              </div>
              <h3 className="font-semibold">Secure Access</h3>
              <p className="text-sm text-muted-foreground">
                Login with your college ID. Admin-controlled platform.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 md:px-12 text-center animate-fade-in [animation-delay:1s] opacity-0">
        <p className="text-sm text-muted-foreground">
          Created with ❤️ by{" "}
          <span className="font-medium text-foreground">Mr. Techie</span>
          {" "}for Section C
        </p>
      </footer>
    </div>
  );
}
