/**
 * @page Login (/login)
 * @description Login form with college ID + password. Supports auto-fill
 * via `?id=` and `?p=` URL params (from approval email link).
 */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auto-fill from email link query params
  useEffect(() => {
    const id = searchParams.get("id");
    const p = searchParams.get("p");
    if (id) setCollegeId(id);
    if (p) {
      setPassword(p);
      setShowPassword(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college_id: collegeId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success(`Welcome, ${data.user.name}!`);

      if (data.user.must_change_password) {
        router.push("/change-password");
      } else if (data.user.role === "admin") {
        router.push(data.user.isSuperAdmin ? "/admin" : "/user/dashboard");
      } else {
        router.push("/user/dashboard");
      }
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

      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-indigo-300/10 blur-3xl" />

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
          {/* Hero Panel — LEFT side on desktop */}
          <div className="hidden md:flex flex-col justify-center space-y-8 md:order-1">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Academic Resource Platform
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter leading-[1.1]">
                Your academics,
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  simplified.
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Notes, assignments, and practicals —
                organized in one place. No more digging through WhatsApp groups.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "📚", label: "Organized Notes" },
                { icon: "📝", label: "Assignment Tracker" },
                { icon: "🧪", label: "Practicals & Code" },
                { icon: "🔔", label: "Smart Notifications" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-card/50 backdrop-blur-sm p-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/60">
              Acadex &bull; Engineered by Mr Techie
            </p>
          </div>

          {/* Form Panel — RIGHT side on desktop */}
          <div className="w-full max-w-md mx-auto md:max-w-none md:order-2 rounded-2xl">
            <MagicCard
              className="rounded-2xl"
              gradientSize={300}
              gradientColor="#6366f120"
              gradientFrom="#6366f1"
              gradientTo="#a855f7"
              gradientOpacity={0.15}
            >
              <div className="bg-card/90 backdrop-blur-xl rounded-2xl">
                <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                  <Image src="/images/logo.svg" alt="Acadex" width={56} height={56} className="mx-auto h-14 w-14 object-contain mb-3" />
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    Welcome back
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Login with your college ID to access the hub
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
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
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        <Link
                          href="/forgot-password"
                          className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="rounded-xl h-11 pr-10 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                          autoComplete="current-password"
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
                          Signing in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted-foreground/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card/90 px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <Link href="/apply">
                    <button
                      className="w-full text-center py-3 px-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all group"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          Apply for access to Acadex
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Don&apos;t have an account? Request access here
                      </p>
                    </button>
                  </Link>
                </CardContent>
              </div>
            </MagicCard>
          </div>
        </div>
      </main>
    </div>
  );
}
