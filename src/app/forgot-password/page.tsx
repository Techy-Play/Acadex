"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"college_id" | "otp" | "success">("college_id");
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college_id: collegeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP");
        return;
      }
      setMaskedEmail(data.maskedEmail);
      setStep("otp");
      startCooldown();
      toast.success(`Verification code sent to ${data.maskedEmail}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college_id: collegeId }),
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
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college_id: collegeId,
          code: otpCode,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }
      setStep("success");
      toast.success("Password reset successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 -z-10" />
      <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl animate-pulse [animation-delay:1s]" />

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
          {/* Hero Panel — desktop only */}
          <div className="hidden md:flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/50 px-4 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 backdrop-blur-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Password Recovery
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter leading-[1.1]">
                Forgot your
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  password?
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                No worries! Enter your College ID and we&apos;ll send a verification code to your registered email to reset your password.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { step: "1", text: "Enter your College ID" },
                { step: "2", text: "We send a code to your email" },
                { step: "3", text: "Enter code & set new password" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-card/50 backdrop-blur-sm p-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {item.step}
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/60">
              Acadex &bull; Engineered by Mr Techie
            </p>
          </div>

          {/* Form Panel */}
          <div className="w-full max-w-md mx-auto md:max-w-none rounded-2xl">
            <MagicCard
              className="rounded-2xl"
              gradientSize={300}
              gradientColor="#6366f120"
              gradientFrom="#6366f1"
              gradientTo="#a855f7"
              gradientOpacity={0.15}
            >
              <div className="bg-card/90 backdrop-blur-xl rounded-2xl">
                {step === "college_id" && (
                  <>
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Reset Password
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter your College ID to receive a verification code
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <form onSubmit={handleSendOTP} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="college_id" className="text-sm font-medium">
                            College ID
                          </Label>
                          <Input
                            id="college_id"
                            type="text"
                            placeholder="Enter your college ID"
                            value={collegeId}
                            onChange={(e) => setCollegeId(e.target.value)}
                            required
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending...
                            </span>
                          ) : (
                            "Send Verification Code"
                          )}
                        </Button>
                      </form>
                      <div className="text-center mt-5">
                        <Link
                          href="/login"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ← Back to Login
                        </Link>
                      </div>
                    </CardContent>
                  </>
                )}

                {step === "otp" && (
                  <>
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Verify & Reset
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Enter the code sent to {maskedEmail}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="otp" className="text-sm font-medium">
                            Verification Code
                          </Label>
                          <Input
                            id="otp"
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            required
                            maxLength={6}
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors text-center text-lg tracking-[0.3em] font-mono"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              disabled={resendCooldown > 0 || loading}
                              className="text-xs text-indigo-500 hover:text-indigo-600 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                            >
                              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_password" className="text-sm font-medium">
                            New Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="new_password"
                              type={showPassword ? "text" : "password"}
                              placeholder="At least 6 characters"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={6}
                              className="rounded-xl h-11 pr-10 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.7 11.7 0 01-4.373 5.157M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.656 4.656l2.829 2.829M3 3l18 18M9.878 9.878a3 3 0 104.243 4.243" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password" className="text-sm font-medium">
                            Confirm Password
                          </Label>
                          <Input
                            id="confirm_password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Resetting...
                            </span>
                          ) : (
                            "Reset Password"
                          )}
                        </Button>
                      </form>
                      <div className="text-center mt-5">
                        <button
                          onClick={() => setStep("college_id")}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ← Start Over
                        </button>
                      </div>
                    </CardContent>
                  </>
                )}

                {step === "success" && (
                  <>
                    <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Password Reset!
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Your password has been successfully reset
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            ✅ You can now log in with your new password.
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
                )}
              </div>
            </MagicCard>
          </div>
        </div>
      </main>
    </div>
  );
}
