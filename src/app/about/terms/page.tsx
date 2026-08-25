import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertCircle,
  Gavel,
  UserCheck,
  ArrowLeft,
  XCircle,
  HelpCircle,
  Layers,
  FileCheck
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Acadex",
  description:
    "Plain-English Terms of Service explaining the rules, guidelines, and expectations for using the Acadex platform.",
  alternates: {
    canonical: "/about/terms",
  },
};

export default function TermsOfServicePage() {
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
              <Scale className="w-3.5 h-3.5" />
              Plain-English Terms of Service
            </span>
            <span className="text-xs text-muted-foreground">
              Last Updated & Effective: {lastUpdated}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Welcome to Acadex! These Terms of Service outline the rules, guidelines, and expectations for using our platform. We aim to keep this as straightforward and jargon-free as possible.
          </p>
        </div>

        {/* Quick Navigation Pills */}
        <section aria-label="Quick Table of Contents" className="mb-12 p-5 rounded-2xl bg-muted/40 border border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Quick Jump to Section:
          </h2>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <a href="#section-1" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">1. Agreement to Terms</a>
            <a href="#section-2" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">2. User Accounts</a>
            <a href="#section-3" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">3. Acceptable Use Policy</a>
            <a href="#section-4" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">4. Uploaded Content</a>
            <a href="#section-5" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">5. Platform Moderation</a>
            <a href="#section-6" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">6. Termination</a>
            <a href="#section-7" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">7. Disclaimers</a>
            <a href="#section-8" className="px-3 py-1.5 rounded-lg bg-background border hover:bg-accent hover:text-foreground transition-colors">8. Contact Us</a>
          </div>
        </section>

        {/* Detailed Content Container */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <section id="section-1" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">1. Agreement to Terms</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                By accessing or using the Acadex platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you must not use our platform.
              </p>
              <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 text-xs sm:text-sm text-foreground flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Summary:</strong> Using Acadex means you agree to play by the rules outlined below.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">2. User Accounts</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Eligibility:</strong> Acadex is intended for use by enrolled students, faculty, and academic administrators.
                </li>
                <li>
                  <strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials. Do not share your password.
                </li>
                <li>
                  <strong>Accurate Information:</strong> You agree to provide accurate, current, and complete information during the registration process (such as your Roll Number and real name).
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">3. Acceptable Use Policy</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>When using Acadex, you agree <strong>NOT</strong> to:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm my-4">
                <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                  <span className="font-bold text-rose-600 text-base">✕</span>
                  <p>Upload malware, viruses, or malicious scripts.</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                  <span className="font-bold text-rose-600 text-base">✕</span>
                  <p>Harass, abuse, or harm other users.</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                  <span className="font-bold text-rose-600 text-base">✕</span>
                  <p>Attempt to bypass security features, reverse-engineer, or scrape the platform.</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                  <span className="font-bold text-rose-600 text-base">✕</span>
                  <p>Impersonate another student, faculty member, or admin.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">4. Uploaded Content</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                You retain ownership of any intellectual property rights that you hold in the content you upload to Acadex.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Academic Integrity:</strong> Do not upload cheating materials, exam answers, or content that violates your institution&apos;s academic integrity policies.</li>
                <li><strong>Copyright:</strong> You must have the right to upload the materials you share. Do not upload copyrighted textbooks or proprietary materials without permission.</li>
                <li><strong>License to Acadex:</strong> By uploading content, you grant Acadex a non-exclusive license to host, display, and distribute this content to other students within the platform.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">5. Platform Moderation</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Acadex administrators reserve the right to review, edit, or remove any content or user account that violates these Terms of Service or is deemed inappropriate for the platform.
              </p>
              <p>
                We rely on our community to maintain a healthy learning environment. If you spot inappropriate content, please report it to your section admin.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">6. Termination</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                We may suspend or terminate your access to Acadex at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms of Service.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">7. Disclaimers</h2>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Acadex is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranties, expressed or implied, regarding the platform&apos;s availability, accuracy of user-uploaded content, or fitness for a particular purpose.
              </p>
              <p>
                We are not responsible for lost data, missed deadlines, or any damages resulting from the use or inability to use the service.
              </p>
            </div>
          </section>

          {/* Section 8 - Contact */}
          <section id="section-8" className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">8. Contact Us</h2>
                <p className="text-xs text-muted-foreground">Have questions about these terms?</p>
              </div>
            </div>
            <div className="text-sm sm:text-base text-muted-foreground space-y-3 leading-relaxed">
              <p>
                If you have any questions, concerns, or feedback regarding these Terms of Service, please don&apos;t hesitate to reach out to us via our <Link href="/contact" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Contact Form</Link>.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/40 backdrop-blur-md py-8 mt-auto relative z-10">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} Acadex. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/about/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/about/terms" className="hover:text-foreground transition-colors font-medium text-foreground">Terms of Service</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
