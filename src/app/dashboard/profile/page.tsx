"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserData {
  id: string;
  name: string;
  college_id: string;
  email: string | null;
  role: "admin" | "student";
  stream: { id: string; name: string } | null;
  createdAt: string;
}

type OTPStep = "idle" | "sending" | "sent" | "verifying" | "verified" | "submitting";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [pwStep, setPwStep] = useState<OTPStep>("idle");
  const [pwOtpId, setPwOtpId] = useState<string | null>(null);
  const [pwOtp, setPwOtp] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Email change state
  const [emailStep, setEmailStep] = useState<OTPStep>("idle");
  const [emailOtpId, setEmailOtpId] = useState<string | null>(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Countdown timer for resend
  const [pwCooldown, setPwCooldown] = useState(0);
  const [emailCooldown, setEmailCooldown] = useState(0);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (pwCooldown > 0) {
      const timer = setTimeout(() => setPwCooldown(pwCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [pwCooldown]);

  useEffect(() => {
    if (emailCooldown > 0) {
      const timer = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCooldown]);

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  // ─── Password Change Flow ───
  async function handleSendPasswordOTP() {
    if (!user?.email) {
      toast.error("Please set your email address first before changing password");
      return;
    }
    setPwStep("sending");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "password_change" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setPwStep("sent");
      setPwCooldown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(message);
      setPwStep("idle");
    }
  }

  async function handleVerifyPasswordOTP() {
    if (!pwOtp.trim()) {
      toast.error("Enter the OTP code");
      return;
    }
    setPwStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pwOtp, purpose: "password_change" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("OTP verified!");
      setPwOtpId(data.otpId);
      setPwStep("verified");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP";
      toast.error(message);
      setPwStep("sent");
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwStep("submitting");
    try {
      const res = await fetch("/api/profile/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, otpId: pwOtpId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password changed successfully!");
      // Reset state
      setPwStep("idle");
      setPwOtp("");
      setPwOtpId(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      toast.error(message);
      setPwStep("verified");
    }
  }

  // ─── Email Change Flow ───
  async function handleSendEmailOTP() {
    if (!newEmail.trim()) {
      toast.error("Enter the new email address");
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    setEmailStep("sending");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "email_change", newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setEmailStep("sent");
      setEmailCooldown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(message);
      setEmailStep("idle");
    }
  }

  async function handleVerifyEmailOTP() {
    if (!emailOtp.trim()) {
      toast.error("Enter the OTP code");
      return;
    }
    setEmailStep("verifying");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailOtp, purpose: "email_change" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmailOtpId(data.otpId);
      // Immediately confirm the email change
      setEmailStep("submitting");
      const confirmRes = await fetch("/api/profile/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId: data.otpId }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error);
      toast.success("Email updated successfully!");
      // Re-fetch user from DB to ensure email is synced
      await fetchUser();
      // Reset state
      setEmailStep("idle");
      setEmailOtp("");
      setEmailOtpId(null);
      setNewEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update email";
      toast.error(message);
      setEmailStep("sent");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <Badge variant="secondary" className="capitalize">{user.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">College ID: {user.college_id}</p>
              <p className="text-sm text-muted-foreground">
                Email: {user.email || <span className="italic text-yellow-600 dark:text-yellow-400">Not set</span>}
              </p>
              {user.stream && (
                <p className="text-sm text-muted-foreground">Stream: {user.stream.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Member since {memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {user.email ? "Change Email" : "Set Email"}
          </CardTitle>
          <CardDescription>
            {user.email
              ? "Update your email address. An OTP will be sent to your current email for verification."
              : "Set your email address. An OTP will be sent to the new email for verification."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.email && (
            <div>
              <Label className="text-muted-foreground text-xs">Current Email</Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="your.email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={emailStep !== "idle"}
            />
          </div>

          {emailStep === "idle" && (
            <Button onClick={handleSendEmailOTP} className="w-full sm:w-auto">
              Send Verification Code
            </Button>
          )}

          {(emailStep === "sent" || emailStep === "verifying") && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="emailOtp">Enter OTP</Label>
                <Input
                  id="emailOtp"
                  placeholder="Enter 6-digit code"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  maxLength={6}
                  disabled={emailStep === "verifying"}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleVerifyEmailOTP}
                  disabled={emailStep === "verifying"}
                >
                  {emailStep === "verifying" ? "Verifying..." : "Verify & Update Email"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSendEmailOTP}
                  disabled={emailCooldown > 0}
                  size="sm"
                >
                  {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Resend OTP"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEmailStep("idle");
                    setEmailOtp("");
                    setNewEmail("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {emailStep === "sending" && (
            <Button disabled className="w-full sm:w-auto">
              <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending OTP...
            </Button>
          )}

          {emailStep === "submitting" && (
            <Button disabled className="w-full sm:w-auto">
              <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Updating email...
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Password
          </CardTitle>
          <CardDescription>
            {user.email
              ? "An OTP will be sent to your registered email for verification before changing your password."
              : "You need to set your email address first before you can change your password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user.email ? (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              Please set your email address above before changing your password.
            </p>
          ) : (
            <>
              {pwStep === "idle" && (
                <Button onClick={handleSendPasswordOTP}>
                  Send Verification Code
                </Button>
              )}

              {pwStep === "sending" && (
                <Button disabled>
                  <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending OTP...
                </Button>
              )}

              {(pwStep === "sent" || pwStep === "verifying") && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pwOtp">Enter OTP</Label>
                    <Input
                      id="pwOtp"
                      placeholder="Enter 6-digit code"
                      value={pwOtp}
                      onChange={(e) => setPwOtp(e.target.value)}
                      maxLength={6}
                      disabled={pwStep === "verifying"}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleVerifyPasswordOTP}
                      disabled={pwStep === "verifying"}
                    >
                      {pwStep === "verifying" ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSendPasswordOTP}
                      disabled={pwCooldown > 0}
                      size="sm"
                    >
                      {pwCooldown > 0 ? `Resend in ${pwCooldown}s` : "Resend OTP"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPwStep("idle");
                        setPwOtp("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {(pwStep === "verified" || pwStep === "submitting") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    OTP verified. Now enter your passwords.
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={pwStep === "submitting"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={pwStep === "submitting"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={pwStep === "submitting"}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={pwStep === "submitting"}
                    >
                      {pwStep === "submitting" ? (
                        <>
                          <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Changing Password...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPwStep("idle");
                        setPwOtp("");
                        setPwOtpId(null);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
