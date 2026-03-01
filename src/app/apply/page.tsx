/**
 * @page Apply (/apply)
 * @description Access request / registration form with email OTP verification.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MagicCard } from "@/components/ui/magic-card";
import { ThemeToggle } from "@/components/theme-toggle";

interface StreamOption {
  _id: string;
  name: string;
}

interface SectionOption {
  _id: string;
  name: string;
}

export default function ApplyPage() {
  // Form state
  const [loading, setLoading] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyCollegeId, setApplyCollegeId] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyStream, setApplyStream] = useState("none");
  const [applySection, setApplySection] = useState("");
  const [applySemester, setApplySemester] = useState("");
  const [applyReason, setApplyReason] = useState("");
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);

  // OTP state
  const [otpStep, setOtpStep] = useState<"form" | "otp" | "success">("form");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetch("/api/access-requests")
      .then((r) => r.json())
      .then((data) => {
        setStreams(data.streams || []);
        setSections(data.sections || []);
      })
      .catch(() => {});
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!applyEmail.trim()) {
      toast.error("Please enter your email first");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: applyEmail, name: applyName || "User" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP");
        return;
      }
      setOtpStep("otp");
      startCooldown();
      toast.success(`Verification code sent to ${data.maskedEmail}`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/signup-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: applyEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to verify OTP");
        return;
      }
      setEmailVerified(true);
      setOtpStep("form");
      toast.success("Email verified successfully!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: applyEmail, name: applyName || "User" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to resend OTP");
        return;
      }
      startCooldown();
      toast.success("New verification code sent!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailVerified) {
      toast.error("Please verify your email first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: applyName,
          college_id: applyCollegeId,
          email: applyEmail,
          stream: applyStream === "none" ? null : applyStream,
          section: applySection || null,
          semester: applySemester ? Number(applySemester) : null,
          reason: applyReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit request");
        return;
      }
      setOtpStep("success");
      toast.success("Access request submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 -z-10" />
      <div className="absolute top-1/4 -right-32 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -left-32 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-purple-300/10 blur-3xl" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/images/logo.svg" alt="Acadex" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-semibold text-lg tracking-tight">Acadex</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-0 md:gap-8 lg:gap-12 items-center">
          {/* Form Panel — LEFT side on desktop */}
          <div className="w-full max-w-md mx-auto md:max-w-none md:order-1 rounded-2xl">
            <MagicCard
              className="rounded-2xl"
              gradientSize={300}
              gradientColor="#a855f720"
              gradientFrom="#a855f7"
              gradientTo="#6366f1"
              gradientOpacity={0.15}
            >
              <div className="bg-card/90 backdrop-blur-xl rounded-2xl">
                {otpStep === "otp" ? (
                  <>
                    {/* OTP Verification Step */}
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Verify Your Email
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter the 6-digit code sent to your email
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="otp_code" className="text-sm font-medium">
                            Verification Code
                          </Label>
                          <Input
                            id="otp_code"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors text-center text-lg tracking-[0.3em] font-mono"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              disabled={resendCooldown > 0 || otpLoading}
                              className="text-xs text-indigo-500 hover:text-indigo-600 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                            >
                              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                            </button>
                          </div>
                        </div>
                        <Button
                          onClick={handleVerifyOTP}
                          className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                          disabled={otpLoading}
                        >
                          {otpLoading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Verifying...
                            </span>
                          ) : (
                            "Verify Email"
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setOtpStep("form")}
                          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                        >
                          ← Back to form
                        </button>
                      </div>
                    </CardContent>
                  </>
                ) : otpStep === "success" ? (
                  <>
                    {/* Success State */}
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Request Submitted!
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Your access request has been received
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            ✅ The admin will review your request and you&apos;ll receive a confirmation email with your login credentials once approved.
                          </p>
                        </div>
                        <Link href="/login">
                          <Button className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                            Go to Login
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    {/* Apply Form */}
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Apply for Access
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Fill in your details to request an account
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <form onSubmit={handleApplySubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="apply_name" className="text-sm font-medium">
                            Full Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="apply_name"
                            type="text"
                            placeholder="eg. Deepak Negi"
                            value={applyName}
                            onChange={(e) => setApplyName(e.target.value)}
                            required
                            maxLength={100}
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apply_college_id" className="text-sm font-medium">
                            College ID <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="apply_college_id"
                            type="text"
                            placeholder="241XXXX"
                            value={applyCollegeId}
                            onChange={(e) => setApplyCollegeId(e.target.value)}
                            required
                            maxLength={50}
                            pattern="^(241|257|258|259)\d{3,4}$"
                            title="Must start with 241, 257, 258, or 259 followed by 3-4 digits"
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter it from your college ID card
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apply_email" className="text-sm font-medium">
                            Email Address <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="apply_email"
                              type="email"
                              placeholder="your.email@example.com"
                              value={applyEmail}
                              onChange={(e) => {
                                setApplyEmail(e.target.value);
                                if (emailVerified) setEmailVerified(false);
                              }}
                              required
                              maxLength={255}
                              disabled={emailVerified}
                              className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors flex-1"
                            />
                            {!emailVerified ? (
                              <Button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={otpLoading || !applyEmail.trim()}
                                variant="outline"
                                className="rounded-xl h-11 px-4 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 whitespace-nowrap"
                              >
                                {otpLoading ? (
                                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  "Verify"
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Verified
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Section <span className="text-red-500">*</span>
                          </Label>
                          <Select value={applySection} onValueChange={setApplySection} required>
                            <SelectTrigger className="rounded-xl h-11 border-muted-foreground/20">
                              <SelectValue placeholder="Select your section" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {sections.map((s) => (
                                <SelectItem key={s._id} value={s._id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Stream</Label>
                          <Select value={applyStream} onValueChange={setApplyStream}>
                            <SelectTrigger className="rounded-xl h-11 border-muted-foreground/20">
                              <SelectValue placeholder="Select your stream" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none">Not sure / General</SelectItem>
                              {streams.map((s) => (
                                <SelectItem key={s._id} value={s._id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Semester <span className="text-red-500">*</span>
                          </Label>
                          <Select value={applySemester} onValueChange={setApplySemester} required>
                            <SelectTrigger className="rounded-xl h-11 border-muted-foreground/20">
                              <SelectValue placeholder="Select your semester" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  Semester {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apply_reason" className="text-sm font-medium">
                            Why do you need access? <span className="text-muted-foreground text-xs">(optional)</span>
                          </Label>
                          <Textarea
                            id="apply_reason"
                            placeholder="I am student of section X, semester X ..."
                            value={applyReason}
                            onChange={(e) => setApplyReason(e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="rounded-xl border-muted-foreground/20 focus:border-indigo-500 transition-colors resize-none"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full rounded-xl h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                          disabled={loading || !emailVerified}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Submitting...
                            </span>
                          ) : !emailVerified ? (
                            "Verify email to submit"
                          ) : (
                            "Submit Request"
                          )}
                        </Button>

                        <div className="text-center pt-1 space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                              href="/login"
                              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline"
                            >
                              Login here
                            </Link>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Facing any issues?{" "}
                            <Link
                              href="/contact"
                              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline"
                            >
                              Contact Us
                            </Link>
                          </p>
                        </div>
                      </form>
                    </CardContent>
                  </>
                )}
              </div>
            </MagicCard>
          </div>

          {/* Hero Panel — RIGHT side on desktop */}
          <div className="hidden md:flex flex-col justify-center space-y-8 md:order-2">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-950/50 px-4 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                Join the Community
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter leading-[1.1]">
                Get access to
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                  Acadex.
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Apply for access and get approved by your admin.
                Once verified, you&apos;ll receive login credentials via email.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { step: "01", title: "Fill the Form", desc: "Enter your details and verify your email" },
                { step: "02", title: "Get Approved", desc: "Admin reviews and approves your request" },
                { step: "03", title: "Start Learning", desc: "Login and access all resources" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 rounded-xl border bg-card/50 backdrop-blur-sm p-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/60">
              Acadex &bull; Engineered by Mr Techie
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
