import Link from "next/link";
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

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 animate-slide-down relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-bold text-lg tracking-tight">
            Section C Hub
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pt-8 pb-4">
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
            Your centralized hub for subject-wise notes, assignments, practicals and academic resources.
            No more digging through WhatsApp groups — everything organized in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up [animation-delay:0.6s] opacity-0">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 text-base font-medium shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Get Started
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background/50 backdrop-blur-sm px-8 py-3.5 text-base font-medium hover:bg-accent transition-all hover:-translate-y-0.5"
            >
              Apply for Access
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
              Built for <span className="text-indigo-600 dark:text-indigo-400">Section C</span> students
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

        {/* How it Works */}
        <div className="mt-20 w-full max-w-3xl mx-auto animate-scale-in [animation-delay:1.2s] opacity-0">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground mt-2">Get started in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Apply for Access", desc: "Fill in your details on the login page and submit an access request." },
              { step: "02", title: "Get Approved", desc: "Admin reviews your request and you receive login credentials via email." },
              { step: "03", title: "Start Learning", desc: "Access all notes, assignments, and practicals organized by subject." },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 md:px-12 mt-12 border-t bg-card/30 backdrop-blur-sm animate-fade-in [animation-delay:1.4s] opacity-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">SC</span>
            </div>
            <span className="font-semibold text-sm">Section C Hub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Created with the power of sleep 🥱 by{" "}
            <span className="font-medium text-foreground">Mr. Techie</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
