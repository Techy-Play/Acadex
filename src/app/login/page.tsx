"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [collegeId, setCollegeId] = useState("");
  const [password, setPassword] = useState("");

  // Apply form state
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyCollegeId, setApplyCollegeId] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyStream, setApplyStream] = useState("none");
  const [applySection, setApplySection] = useState("");
  const [applyReason, setApplyReason] = useState("");
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (showApplyForm && streams.length === 0) {
      fetch("/api/access-requests")
        .then((r) => r.json())
        .then((data) => {
          setStreams(data.streams || []);
          setSections(data.sections || []);
        })
        .catch(() => {});
    }
  }, [showApplyForm, streams.length]);

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
        router.push("/user/dashboard");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyLoading(true);

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
          reason: applyReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit request");
        return;
      }

      setApplySuccess(true);
      toast.success("Access request submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setApplyLoading(false);
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md rounded-2xl">
          <MagicCard
            className="rounded-2xl"
            gradientSize={300}
            gradientColor="#6366f120"
            gradientFrom="#6366f1"
            gradientTo="#a855f7"
            gradientOpacity={0.15}
          >
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl">
              {!showApplyForm ? (
                <>
                  {/* ─── Login Form ─── */}
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
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-card/90 px-2 text-muted-foreground">or</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowApplyForm(true)}
                      className="w-full text-center py-3 px-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all group"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          Apply for access to website
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Don&apos;t have an account? Request access here
                      </p>
                    </button>
                  </CardContent>
                </>
              ) : applySuccess ? (
                <>
                  {/* ─── Success State ─── */}
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
                      <Button
                        onClick={() => {
                          setShowApplyForm(false);
                          setApplySuccess(false);
                          setApplyName("");
                          setApplyCollegeId("");
                          setApplyEmail("");
                          setApplyStream("none");
                          setApplySection("");
                          setApplyReason("");
                        }}
                        className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <>
                  {/* ─── Apply Form ─── */}
                  <CardHeader className="text-center space-y-2 pb-2 pt-8 px-8">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
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
                          placeholder="e.g. John Doe"
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
                          placeholder="e.g. 2417003"
                          value={applyCollegeId}
                          onChange={(e) => setApplyCollegeId(e.target.value)}
                          required
                          maxLength={50}
                          pattern="^(241|257|258|259)\d{4}$"
                          title="Must start with 241, 257, 258, or 259 followed by 4 digits"
                          className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">
                          Format: 241/257/258/259 followed by 4 digits
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apply_email" className="text-sm font-medium">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="apply_email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={applyEmail}
                          onChange={(e) => setApplyEmail(e.target.value)}
                          required
                          maxLength={255}
                          className="rounded-xl h-11 border-muted-foreground/20 focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-muted-foreground">
                          You&apos;ll receive login credentials here. Allowed: gmail.com, outlook.com, hotmail.com, yahoo.com, amrapali.ac.in
                        </p>
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
                        <Label htmlFor="apply_reason" className="text-sm font-medium">
                          Why do you need access? <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Textarea
                          id="apply_reason"
                          placeholder="e.g. I'm a student in Section C, Semester 4..."
                          value={applyReason}
                          onChange={(e) => setApplyReason(e.target.value)}
                          maxLength={500}
                          rows={3}
                          className="rounded-xl border-muted-foreground/20 focus:border-indigo-500 transition-colors resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full rounded-xl h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                        disabled={applyLoading}
                      >
                        {applyLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowApplyForm(false)}
                        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                      >
                        ← Back to login
                      </button>
                    </form>
                  </CardContent>
                </>
              )}
            </div>
          </MagicCard>
        </div>
      </main>
    </div>
  );
}
