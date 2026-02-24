"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [password, setPassword] = useState("");

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

      // Redirect based on role and password change status
      if (data.user.must_change_password) {
        router.push("/change-password");
      } else if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
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
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Section C Hub</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <MagicCard>
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl">
              <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
                  <span className="text-white font-bold text-xl">SC</span>
                </div>
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
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                      autoComplete="current-password"
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
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Contact your admin if you don&apos;t have an account.
                </p>
              </CardContent>
            </div>
          </MagicCard>
        </div>
      </main>
    </div>
  );
}
