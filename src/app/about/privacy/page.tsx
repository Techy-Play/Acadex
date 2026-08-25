import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  FileText,
  Bell,
  Database,
  KeyRound,
  Users,
  CheckCircle2,
  HelpCircle,
  Server,
  HardDrive,
  Sparkles,
  ArrowLeft,
  Mail,
  FileCheck,
  AlertCircle,
  Layers,
  Smartphone,
  Cookie,
  UserCheck,
  ExternalLink,
  Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Acadex",
  description:
    "Plain-English, transparent Privacy Policy explaining how Acadex collects, uses, stores, and protects student and academic information.",
  alternates: {
    canonical: "/about/privacy",
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "August 2026";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background text-foreground">
      {/* Subtle Background Glow and Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/40 -z-20 pointer-events-none" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Desktop Navbar */}
      <nav
        aria-label="Desktop navigation"
        className="hidden md:flex items-center justify-between px-6 py-4 md:px-12 relative z-10 border-b border-border/60 bg-card/40 backdrop-blur-md sticky top-0"
      >
        <Link href="/" className="flex items-center transition-transform hover:scale-[1.02]">
          <Image
            src="/images/site-logo.svg"
            alt="Acadex"
            width={220}
            height={56}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/60"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/60"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/60"
          >
            Contact
          </Link>
          <div className="ml-2">
            <ThemeToggle />
          </div>
          <Link
            href="/login"
            className="ml-2 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-all active:scale-95"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-between px-4 py-3 relative z-10 border-b border-border/60 bg-card/40 backdrop-blur-md sticky top-0"
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/images/site-logo.svg"
            alt="Acadex"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 w-full pb-32 md:pb-20">
        {/* Header Section */}
        <div className="mb-10 text-center md:text-left space-y-3">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to About Acadex
          </Link>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Plain-English Privacy Policy
            </span>
            <span className="text-xs text-muted-foreground">
              Last Updated & Effective: {lastUpdated}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            How We Protect & Respect Your Privacy
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Acadex is built by students, for students. We believe in 100% transparency. 
            Here is a clear, thorough, and jargon-free explanation of what information we handle, 
            why we need it, where it goes, and how you stay in complete control.
          </p>
        </div>

        {/* At a Glance / Key Highlights Banner */}
        <section aria-label="Privacy at a Glance" className="mb-12">
          <h2 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Privacy at a Glance (The 4 Big Promises)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1">Zero Ads or Data Selling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We will never sell, rent, monetize, or give away your personal data to ad networks, data brokers, or marketers. Period.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1">Irreversible Password Hashing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your actual password is never stored or visible to anyone. It is transformed into a cryptographic bcrypt hash on our servers.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1">Secure Academic Cloud</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Uploaded notes, assignments, and practicals are safely hosted on Google Drive and organized strictly for your class section.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm shadow-sm hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-1">Opt-in Notifications Only</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Web Push notifications for new notes or upcoming deadlines are 100% voluntary and never collect your location or phone number.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Navigation Pills */}
        <section aria-label="Quick Table of Contents" className="mb-12 p-5 rounded-2xl bg-muted/40 border border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Quick Jump to Section:
          </h2>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <a href="#section-1" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">1. Introduction</a>
            <a href="#section-2" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">2. Exact Data We Collect</a>
            <a href="#section-3" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">3. What We Never Do</a>
            <a href="#section-4" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">4. How Passwords & Logins Work</a>
            <a href="#section-5" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">5. File Uploads & Google Drive</a>
            <a href="#section-6" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">6. Web Push Notifications</a>
            <a href="#section-7" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">7. Cookies & Local Storage</a>
            <a href="#section-8" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">8. Third-Party Services</a>
            <a href="#section-9" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">9. Who Can See What?</a>
            <a href="#section-10" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">10. Data Retention & Deletion</a>
            <a href="#section-11" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">11. Student FAQs</a>
            <a href="#section-12" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">12. Contact & Rights</a>
          </div>
        </section>

        {/* Detailed Content Container */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <section id="section-1" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">1. Introduction & Our Mission</h2>
                <p className="text-xs text-muted-foreground">Why Acadex exists and what this policy covers</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Acadex is a modern, student-driven academic resource platform created to replace chaotic WhatsApp group shares, lost Google Drive links, and disorganized assignment trackers. Our goal is simple: <strong>make studying effortless, organized, and collaborative</strong>.
              </p>
              <p>
                Because Acadex is built for students, we treat your privacy with the highest respect. We only collect the minimal information necessary to identify you, put you in the right classroom section, show you relevant study materials, and send you important academic alerts.
              </p>
              <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 text-xs sm:text-sm text-foreground flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Summary:</strong> This Privacy Policy applies to the entire Acadex web platform at <span className="font-mono text-indigo-600 dark:text-indigo-400">au-acadex.com</span> and any associated Progressive Web App (PWA) installation. By using Acadex, you acknowledge the data handling practices described here.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">2. Exact Data We Collect (And Why)</h2>
                <p className="text-xs text-muted-foreground">Every piece of data we handle, categorized clearly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Account Identity */}
              <div className="p-5 rounded-2xl border bg-background/80 space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <UserCheck className="w-4 h-4" />
                  <h3>A. Account & College Identity</h3>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs sm:text-sm">
                  <li><strong>Full Name:</strong> To identify you to teachers, peers, and admins.</li>
                  <li><strong>College ID / Roll No:</strong> Your primary login username and unique identifier.</li>
                  <li><strong>Email Address:</strong> Optional or provided during registration; used exclusively for password resets (OTPs) and account approval updates.</li>
                  <li><strong>Stream, Semester & Section:</strong> Needed to automatically connect you to the exact syllabus, subjects, and study materials for your branch.</li>
                  <li><strong>Profile Picture:</strong> Optional image you choose to upload for your user profile.</li>
                </ul>
              </div>

              {/* Security Data */}
              <div className="p-5 rounded-2xl border bg-background/80 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <KeyRound className="w-4 h-4" />
                  <h3>B. Security & Authentication Data</h3>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs sm:text-sm">
                  <li><strong>Password Hashes:</strong> We never save your raw password. We store a non-reversible cryptographic hash generated with the bcrypt algorithm.</li>
                  <li><strong>Session Tokens:</strong> Stored inside a secure HTTP-Only cookie to keep you logged in safely across browser tabs.</li>
                  <li><strong>Temporary OTPs:</strong> 6-digit one-time codes generated when resetting passwords or verifying emails. These automatically self-destruct after a few minutes.</li>
                </ul>
              </div>

              {/* Academic Materials & Progress */}
              <div className="p-5 rounded-2xl border bg-background/80 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                  <FileText className="w-4 h-4" />
                  <h3>C. Academic Files & Progress</h3>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs sm:text-sm">
                  <li><strong>Uploaded Resources:</strong> PDF files, documents, or images you upload as Notes, Assignments, or Practicals, along with your chosen title and description.</li>
                  <li><strong>Completion Checkmarks:</strong> Which assignments or practicals you have marked as &quot;Completed&quot; on your personal dashboard to track your study deadlines.</li>
                </ul>
              </div>

              {/* Preferences & Device */}
              <div className="p-5 rounded-2xl border bg-background/80 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                  <Smartphone className="w-4 h-4" />
                  <h3>D. Preferences & Push Subscriptions</h3>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-xs sm:text-sm">
                  <li><strong>App Customization:</strong> Your selected Theme (Light/Dark/System), Accent Color, and Mobile Navigation Bar position.</li>
                  <li><strong>Web Push Keys:</strong> An encrypted push subscription token provided by your browser if you choose to enable device alerts. (No GPS or phone number).</li>
                  <li><strong>Notification Toggles:</strong> Which specific alert types you want to receive (e.g. only new notes, only deadlines).</li>
                </ul>
              </div>
            </div>

            {/* Audit Logs note */}
            <div className="p-4 rounded-2xl bg-muted/60 border text-xs sm:text-sm text-muted-foreground space-y-1.5">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-500" />
                Administrative & Security Activity Logs
              </h4>
              <p>
                To protect student data against vandalism or unauthorized account takeovers, Acadex records administrative actions and high-level events (such as user logins, file uploads, role changes, and access request decisions) in an internal activity log. These logs are strictly accessible to authorized administrators for security auditing.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <EyeOff className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">3. What We Never Do (Zero Exploitation)</h2>
                <p className="text-xs text-muted-foreground">Clear boundaries on what will never happen to your data</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <span className="font-bold text-rose-600 text-base">✕</span>
                <p><strong>No Selling or Renting Data:</strong> We will never sell your student profile, email, or usage data to recruiters, advertisers, or third parties.</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <span className="font-bold text-rose-600 text-base">✕</span>
                <p><strong>No Ad Tracking or Pixels:</strong> We do not load Facebook Pixels, Google AdSense, or third-party behavior trackers on Acadex.</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <span className="font-bold text-rose-600 text-base">✕</span>
                <p><strong>No AI Model Training on Notes:</strong> We do not feed your uploaded assignments or notes into external AI/ML models for commercial training.</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                <span className="font-bold text-rose-600 text-base">✕</span>
                <p><strong>No Intrusive Device Access:</strong> We never request access to your device microphone, camera, contacts, or GPS location.</p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">4. How Passwords & Logins Work (In Plain English)</h2>
                <p className="text-xs text-muted-foreground">Understanding cryptographic hashing vs. plain passwords</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                A lot of websites store passwords insecurely. We want you to feel 100% confident in how Acadex handles your credentials:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 1</div>
                  <h3 className="font-semibold text-sm text-foreground">You Type Your Password</h3>
                  <p className="text-xs text-muted-foreground">
                    When logging in or signing up, your password is transmitted over an encrypted HTTPS connection to our secure server.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 2</div>
                  <h3 className="font-semibold text-sm text-foreground">One-Way bcrypt Hashing</h3>
                  <p className="text-xs text-muted-foreground">
                    Our server converts the password into a scrambled digital fingerprint (hash). This mathematical formula is impossible to reverse back into plain text.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 3</div>
                  <h3 className="font-semibold text-sm text-foreground">Secure HTTP-Only Cookie</h3>
                  <p className="text-xs text-muted-foreground">
                    Upon successful login, your browser gets a secure JWT cookie called <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">acadex-token</code> that cannot be stolen by JavaScript.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm">
                <strong>What this means for you:</strong> Even if someone gained unauthorized access to the database, your actual password is never stored anywhere. Even Acadex developers cannot see what your password is.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">5. File Uploads & Google Drive Integration</h2>
                <p className="text-xs text-muted-foreground">How notes, assignments, and practicals are stored</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                When you upload a lecture note, assignment, practical guide, or profile photo to Acadex, the file is processed through our secure upload pipeline:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Direct Google Drive Storage:</strong> To guarantee high download speeds and massive storage reliability, files are uploaded directly to our cloud repository on <strong>Google Drive</strong> via official Google APIs.
                </li>
                <li>
                  <strong>Organized Subfolder Hierarchy:</strong> Files are systematically structured by <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">Stream &rarr; Semester &rarr; Subject &rarr; Resource Type</span> so your batchmates find what they need instantly.
                </li>
                <li>
                  <strong>Moderation Queue:</strong> User-submitted uploads pass through an administrative verification queue where student coordinators ensure study materials are clean, relevant, and free of spam.
                </li>
                <li>
                  <strong>Public vs Class Visibility:</strong> Study materials are published for the academic benefit of students in your stream and semester. Do not upload confidential personal files to the academic repository.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">6. Web Push Notifications (100% Opt-In)</h2>
                <p className="text-xs text-muted-foreground">How browser & device alerts work without tracking you</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Acadex supports instant Web Push notifications so you never miss an assignment deadline or note upload. Here is how it operates:
              </p>
              <div className="p-4 rounded-2xl bg-background border space-y-2 text-xs sm:text-sm">
                <p>
                  <strong>How it connects:</strong> When you click &quot;Enable Notifications&quot;, your browser securely negotiates an encrypted push subscription key (VAPID protocol) with your browser vendor (e.g. Google FCM, Mozilla, Apple).
                </p>
                <p>
                  <strong>No Tracking:</strong> This push token contains zero personal info—no phone number, no GPS, and no physical address. It is simply a secret electronic mailbox address so our server can tell your browser: <em>&quot;Hey, a new note was posted for your class!&quot;</em>
                </p>
                <p>
                  <strong>How to Turn Off:</strong> You can revoke notification permissions at any moment in your browser settings (click the lock icon next to the URL) or disable specific alert categories inside your Acadex Dashboard settings.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Cookie className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">7. Cookies & Local Browser Storage</h2>
                <p className="text-xs text-muted-foreground">The few technical cookies we need to keep you logged in</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                We keep cookie usage to an absolute bare minimum. We do not use third-party marketing or cross-site tracking cookies.
              </p>
              
              <div className="overflow-x-auto rounded-2xl border bg-background">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b bg-muted/60 text-foreground font-semibold">
                    <tr>
                      <th className="p-3 sm:p-4">Key / Name</th>
                      <th className="p-3 sm:p-4">Type</th>
                      <th className="p-3 sm:p-4">Purpose</th>
                      <th className="p-3 sm:p-4">Lifespan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="p-3 sm:p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">acadex-token</td>
                      <td className="p-3 sm:p-4">HTTP-Only Cookie</td>
                      <td className="p-3 sm:p-4">Keeps you securely authenticated to your account without exposing your token to client scripts.</td>
                      <td className="p-3 sm:p-4">7 Days</td>
                    </tr>
                    <tr>
                      <td className="p-3 sm:p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">theme</td>
                      <td className="p-3 sm:p-4">Local Storage</td>
                      <td className="p-3 sm:p-4">Remembers if you prefer Dark Mode, Light Mode, or your device system default.</td>
                      <td className="p-3 sm:p-4">Persistent</td>
                    </tr>
                    <tr>
                      <td className="p-3 sm:p-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">acadex_app_installed / banner</td>
                      <td className="p-3 sm:p-4">Local Storage</td>
                      <td className="p-3 sm:p-4">Remembers if you dismissed the &quot;Install App&quot; prompt so we don&apos;t bother you again.</td>
                      <td className="p-3 sm:p-4">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">8. Third-Party Infrastructure Services</h2>
                <p className="text-xs text-muted-foreground">Every external cloud service that powers the Acadex platform</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                To provide high availability, fast downloads, and 99.9% uptime, Acadex relies on trusted infrastructure partners:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-background border space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>MongoDB Atlas</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Database</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Encrypted cloud database holding user profiles, subjects, access requests, and academic text records.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background border space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Google Drive Cloud</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">File Storage</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    High-capacity cloud storage where all study materials (PDFs, PPTs, images) are safely stored and served.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background border space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Vercel Cloud Edge</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Hosting</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Runs the web interface and serverless APIs with SSL/TLS encryption across global edge nodes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-background border space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>SMTP / Nodemailer</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">Email Delivery</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Sends verification OTP codes, password reset links, and access approvals to your email.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">9. Who Can See What? (Role-Based Privacy)</h2>
                <p className="text-xs text-muted-foreground">Understanding what other students or admins can see</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <h3 className="font-semibold text-foreground text-sm">👨‍🎓 Fellow Students</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Can see your Name, Section, and study materials you have publicly published to the library. They <strong>cannot</strong> see your password, your personal completion checkmarks, or your private settings.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <h3 className="font-semibold text-foreground text-sm">🧑‍🏫 Section Admins</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Can see student rosters in their assigned branch/section, review submitted notes/assignments, and approve new account requests. Admins <strong>cannot</strong> see your raw password.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background border space-y-2">
                  <h3 className="font-semibold text-foreground text-sm">🛡️ Super Admins</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Maintain overall platform infrastructure, manage syllabus structures, resolve technical bugs, and perform data backups.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">10. Data Retention, Updates & Deletion</h2>
                <p className="text-xs text-muted-foreground">How long we keep data and how you can delete it</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                We keep your account information active for as long as you are enrolled and using Acadex to study. 
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Updating Your Data:</strong> You can update your email, profile picture, password, and preferences directly in your <Link href="/user/dashboard/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">Profile Settings</Link> anytime.
                </li>
                <li>
                  <strong>Account Deletion:</strong> If you graduate, change colleges, or wish to delete your account permanently, you can submit a deletion request via our <Link href="/contact" className="text-indigo-600 dark:text-indigo-400 hover:underline">Contact Form</Link> or ask your section administrator.
                </li>
                <li>
                  <strong>Resource Retention:</strong> Useful academic notes or syllabus materials you uploaded for the community may remain available to your juniors unless you explicitly request their removal.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 11 - FAQs */}
          <section id="section-11" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">11. Student Frequently Asked Questions (FAQ)</h2>
                <p className="text-xs text-muted-foreground">Common questions about privacy and security answered simply</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-background border space-y-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Can my college professors or classmates see my password?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground pl-6 leading-relaxed">
                  <strong>No, absolutely not.</strong> Your password is automatically scrambled with bcrypt into a one-way mathematical code before it ever touches our database. Nobody—not even the site creator—can see your password.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border space-y-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Are my uploaded assignments private to me or shared with everyone?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground pl-6 leading-relaxed">
                  Acadex is designed for collaborative academic sharing. When you upload a note or assignment to the library, it is made available to authenticated students in your specific stream and semester after being reviewed by an admin. Do not upload personal, private, or non-academic documents.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border space-y-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Can Acadex or any admin track my GPS location?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground pl-6 leading-relaxed">
                  <strong>No.</strong> Acadex does not ask for or collect your GPS location, device sensors, camera, or microphone permissions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border space-y-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  What happens if I forget my password?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground pl-6 leading-relaxed">
                  If you linked an email address to your account, you can request a 6-digit One-Time Password (OTP) via the Forgot Password page to set a new password securely. Alternatively, your section administrator can generate a secure temporary password for you.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-background border space-y-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Is Acadex free and open source?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground pl-6 leading-relaxed">
                  Yes! Acadex is an open-source initiative built with love for the student community. We do not place annoying advertisements or monetize your data.
                </p>
              </div>
            </div>
          </section>

          {/* Section 12 - Contact */}
          <section id="section-12" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">12. Questions, Feedback & Contact</h2>
                <p className="text-xs text-muted-foreground">How to reach the team behind Acadex</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                We welcome any suggestions, privacy concerns, or data correction requests. You can contact us directly through any of these official channels:
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Open Contact Form
                </Link>
                <a
                  href="https://github.com/Techy-Play/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-muted border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  GitHub Repository
                </a>
              </div>
              <p className="text-xs text-muted-foreground pt-3">
                <em>Notice: This policy is maintained directly by the Acadex development and administration team. Updates are posted directly to this URL with a revised effective date.</em>
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/about" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-foreground font-semibold">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">About</span>
          </Link>
          <Link href="/contact" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-medium">Contact</span>
          </Link>
          <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-medium">Login</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="hidden md:block py-8 px-6 md:px-12 border-t border-border/60 bg-card/40 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Image src="/images/site-logo.svg" alt="Acadex" width={180} height={48} className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/about/privacy" className="text-sm font-medium text-foreground hover:underline transition-colors">
              Privacy Policy
            </Link>
            <Link href="/about/terms" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
