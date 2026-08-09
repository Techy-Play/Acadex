/**
 * @page UserProfile (/user/dashboard/profile)
 * @description User profile settings: edit name, email (OTP-verified),
 * password, theme preferences, notification opt-ins, and admin actions.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { subscribeBrowserPush, unsubscribeBrowserPush } from "@/lib/push/client";
import { clearMeCache } from "@/lib/client-auth";

// Dynamically loaded — heavy canvas/cropper logic not needed on initial render
const ImageCropModalDynamic = dynamic(
  () => import("@/components/image-crop-modal").then((m) => ({ default: m.ImageCropModal })),
  { ssr: false }
);

interface UserData {
  id: string;
  name: string;
  adminAlias?: string | null;
  college_id: string;
  email: string | null;
  role: "admin" | "student";
  profileImage?: string | null;
  isSuperAdmin?: boolean;
  stream: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  semester: number | null;
  createdAt: string;
  mobileNavPosition?: "top" | "bottom" | "left";
}

type OTPStep = "idle" | "sending" | "sent" | "verifying" | "verified" | "submitting";

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
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

  // Mobile nav position
  const [navPosition, setNavPosition] = useState<"top" | "bottom" | "left">("bottom");
  const [navSaving, setNavSaving] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    new_note: true,
    new_assignment: true,
    new_practical: true,
    deadline_alert: true,
    admin_message: true,
    request_approved: true,
    request_denied: true,
  });
  const [notifSaving, setNotifSaving] = useState<string | null>(null);
  const [browserPushPermission, setBrowserPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [browserPushBusy, setBrowserPushBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [viewProfileModalOpen, setViewProfileModalOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Selected image is larger than 10 MB limit.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImageSrc(reader.result);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset input
  }

  async function handleSaveCroppedAvatar(croppedBlob: Blob) {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile-picture.webp");

      const res = await fetch("/api/profile/upload-picture", {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 413) {
          throw new Error("Image file size is too large for the server (limit 5 MB).");
        }
        throw new Error(`Upload server error (${res.status}). Please try again.`);
      }

      if (!res.ok) throw new Error(data.error || "Failed to upload picture.");

      clearMeCache();
      toast.success("Profile picture updated!");
      setUser((prev) => (prev ? { ...prev, profileImage: data.profileImage } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveProfileImage() {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/profile/upload-picture", {
        method: "DELETE",
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error (${res.status}). Please try again.`);
      }

      if (!res.ok) throw new Error(data.error || "Failed to remove profile picture.");

      clearMeCache();
      toast.success("Profile picture removed!");
      setUser((prev) => (prev ? { ...prev, profileImage: null } : null));
      setViewProfileModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    fetchUser();
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPushPermission(Notification.permission);
    } else {
      setBrowserPushPermission("unsupported");
    }
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
      if (data.user.mobileNavPosition) {
        setNavPosition(data.user.mobileNavPosition);
      }
      if (data.user.notificationPreferences) {
        setNotifPrefs((prev) => ({ ...prev, ...data.user.notificationPreferences }));
      }
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

  async function handleNavPositionChange(pos: "top" | "bottom" | "left") {
    setNavPosition(pos);
    setNavSaving(true);
    try {
      const res = await fetch("/api/profile/update-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNavPosition: pos }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Navigation set to ${pos === "bottom" ? "Bottom" : pos === "left" ? "Left Sidebar" : "Top"}`);
      // Reload to apply the new layout immediately
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error("Failed to save preference");
    } finally {
      setNavSaving(false);
    }
  }

  async function handleNotifToggle(key: keyof typeof notifPrefs) {
    const newVal = !notifPrefs[key];
    setNotifPrefs((prev) => ({ ...prev, [key]: newVal }));
    setNotifSaving(key);
    try {
      const res = await fetch("/api/profile/update-theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: { [key]: newVal } }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(newVal ? "Notifications enabled" : "Notifications muted");
    } catch {
      setNotifPrefs((prev) => ({ ...prev, [key]: !newVal }));
      toast.error("Failed to save preference");
    } finally {
      setNotifSaving(null);
    }
  }

  async function handleEnableDeviceNotifications() {
    setBrowserPushBusy(true);
    try {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      setBrowserPushPermission(permission);

      if (permission !== "granted") {
        toast.error("Notification permission was not granted");
        return;
      }

      const ok = await subscribeBrowserPush();
      if (!ok) {
        toast.error("Failed to connect device notifications");
        return;
      }
      toast.success("Device notifications are now enabled");
    } catch {
      toast.error("Failed to enable device notifications");
    } finally {
      setBrowserPushBusy(false);
    }
  }

  async function handleDisableDeviceNotifications() {
    setBrowserPushBusy(true);
    try {
      await unsubscribeBrowserPush();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      toast.success("Device notifications disabled for this account");
    } catch {
      toast.error("Failed to disable device notifications");
    } finally {
      setBrowserPushBusy(false);
      if ("Notification" in window) {
        setBrowserPushPermission(Notification.permission);
      }
    }
  }

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
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Column */}
            <div className="flex flex-col items-center gap-2.5 shrink-0">
              <div
                onClick={() => setViewProfileModalOpen(true)}
                className="relative group cursor-pointer"
                title="View Profile Picture"
              >
                <div className="p-0.5 rounded-full bg-gradient-to-br from-primary/50 via-primary/20 to-transparent">
                  <Avatar className="h-24 w-24 shadow-lg">
                    {user.profileImage && (
                      <AvatarImage src={user.profileImage} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Eye className="h-6 w-6" />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs px-3 h-7 border-border hover:bg-muted w-full"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Uploading...</>
                ) : (
                  <><Camera className="h-3 w-3 mr-1.5 text-primary" />Update Photo</>
                )}
              </Button>

              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 w-full">
              {/* Name + Role Badge */}
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
                <Badge className="capitalize text-xs font-semibold">{user.role}</Badge>
              </div>

              {/* Admin Alias */}
              {user.adminAlias && (
                <p className="text-sm text-muted-foreground mb-3">
                  Alias: <span className="font-medium text-primary">{user.adminAlias}</span>
                </p>
              )}

              <Separator className="mb-3" />

              {/* Detail Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">🪪</span>
                  <span className="text-muted-foreground shrink-0">College ID</span>
                  <span className="font-medium truncate">{user.college_id}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">✉️</span>
                  <span className="text-muted-foreground shrink-0">Email</span>
                  <span className="font-medium truncate">
                    {user.email || <span className="italic text-yellow-600 dark:text-yellow-400 text-xs">Not set</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">🎓</span>
                  <span className="text-muted-foreground shrink-0">Stream</span>
                  <span className="font-medium truncate">{user.stream?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">📅</span>
                  <span className="text-muted-foreground shrink-0">Semester</span>
                  <span className="font-medium">{user.semester ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">🏫</span>
                  <span className="text-muted-foreground shrink-0">Section</span>
                  <span className="font-medium">{user.section?.name || "—"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-base">🗓️</span>
                  <span className="text-muted-foreground shrink-0">Member since</span>
                  <span className="font-medium text-xs">{memberSince}</span>
                </div>
              </div>

              <Separator className="my-3" />

              {/* Contact Admin Button — students only */}
              {!pathname.startsWith("/admin") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 gap-2"
                  onClick={() => router.push("/user/dashboard/requests?type=contact")}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Contact Admin
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Navigation Preference — only on user routes */}
      {!pathname.startsWith("/admin") && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Mobile Navigation
          </CardTitle>
          <CardDescription>
            Choose where the navigation bar appears on your mobile device. This preference is saved to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {/* Bottom Nav Option */}
            <button
              onClick={() => handleNavPositionChange("bottom")}
              disabled={navSaving}
              className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                navPosition === "bottom"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {/* Mini phone mockup - bottom nav */}
              <div className="w-12 h-20 rounded-lg border-2 border-current/20 relative overflow-hidden flex flex-col">
                <div className="flex-1 p-1">
                  <div className="w-full h-1 rounded bg-current/10 mb-0.5" />
                  <div className="w-3/4 h-1 rounded bg-current/10 mb-0.5" />
                  <div className="w-full h-1 rounded bg-current/10" />
                </div>
                <div className="h-3 border-t border-current/20 flex items-center justify-around px-1">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <div className="w-1 h-1 rounded-full bg-current/30" />
                  <div className="w-1 h-1 rounded-full bg-current/30" />
                  <div className="w-1 h-1 rounded-full bg-current/30" />
                </div>
              </div>
              <span className="text-xs font-medium">Bottom</span>
              {navPosition === "bottom" && (
                <span className="absolute top-1.5 right-1.5">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>

            {/* Left Nav Option */}
            <button
              onClick={() => handleNavPositionChange("left")}
              disabled={navSaving}
              className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                navPosition === "left"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {/* Mini phone mockup - left nav */}
              <div className="w-12 h-20 rounded-lg border-2 border-current/20 relative overflow-hidden flex flex-col">
                <div className="h-3 border-b border-current/20" />
                <div className="flex flex-1">
                  <div className="w-3 border-r border-current/20 flex flex-col items-center gap-1 py-1">
                    <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                    <div className="w-1.5 h-1.5 rounded-sm bg-current/20" />
                    <div className="w-1.5 h-1.5 rounded-sm bg-current/20" />
                  </div>
                  <div className="flex-1 p-1">
                    <div className="w-full h-1 rounded bg-current/10 mb-0.5" />
                    <div className="w-3/4 h-1 rounded bg-current/10" />
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium">Left</span>
              {navPosition === "left" && (
                <span className="absolute top-1.5 right-1.5">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>

            {/* Top Nav Option */}
            <button
              onClick={() => handleNavPositionChange("top")}
              disabled={navSaving}
              className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                navPosition === "top"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {/* Mini phone mockup - top nav (hamburger) */}
              <div className="w-12 h-20 rounded-lg border-2 border-current/20 relative overflow-hidden flex flex-col">
                <div className="h-3 border-b border-current/20 flex items-center px-1">
                  <div className="flex flex-col gap-[1px]">
                    <div className="w-2 h-[1px] bg-primary" />
                    <div className="w-2 h-[1px] bg-primary" />
                    <div className="w-2 h-[1px] bg-primary" />
                  </div>
                </div>
                <div className="flex-1 p-1">
                  <div className="w-full h-1 rounded bg-current/10 mb-0.5" />
                  <div className="w-3/4 h-1 rounded bg-current/10 mb-0.5" />
                  <div className="w-full h-1 rounded bg-current/10" />
                </div>
              </div>
              <span className="text-xs font-medium">Top</span>
              {navPosition === "top" && (
                <span className="absolute top-1.5 right-1.5">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This only affects the mobile view. Desktop always uses the top + left sidebar layout.
          </p>
        </CardContent>
      </Card>
      )}

      {/* Notification Preferences — students only */}
      {user.role === "student" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive. Disabled notifications will be silently filtered out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Device / Browser Notification Status */}
          <div className={`mb-4 rounded-xl border p-4 transition-colors ${
            browserPushPermission === "granted"
              ? "border-green-500/30 bg-green-500/5"
              : browserPushPermission === "denied"
              ? "border-red-500/30 bg-red-500/5"
              : browserPushPermission === "unsupported"
              ? "border-border bg-muted/30"
              : "border-yellow-500/30 bg-yellow-500/5"
          }`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  browserPushPermission === "granted" ? "bg-green-500/15" :
                  browserPushPermission === "denied" ? "bg-red-500/15" :
                  browserPushPermission === "unsupported" ? "bg-muted" : "bg-yellow-500/15"
                }`}>
                  {browserPushPermission === "granted" ? "🔔" :
                   browserPushPermission === "denied" ? "🔕" :
                   browserPushPermission === "unsupported" ? "ℹ️" : "🔔"}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {browserPushPermission === "granted" && "Push notifications are enabled"}
                    {browserPushPermission === "denied" && "Notifications blocked by browser"}
                    {browserPushPermission === "default" && "Notifications not yet enabled"}
                    {browserPushPermission === "unsupported" && "Not supported on this device"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {browserPushPermission === "granted" && "You'll receive alerts for new content and updates."}
                    {browserPushPermission === "denied" && "Go to browser settings → Site Settings → Allow notifications."}
                    {browserPushPermission === "default" && "Click Enable to receive push alerts on this device."}
                    {browserPushPermission === "unsupported" && "Your browser or device does not support push notifications."}
                  </p>
                </div>
              </div>

              {browserPushPermission === "granted" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg border-red-400/40 text-red-600 hover:bg-red-500/10 shrink-0"
                  onClick={handleDisableDeviceNotifications}
                  disabled={browserPushBusy}
                >
                  {browserPushBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  Disable
                </Button>
              )}
              {browserPushPermission === "default" && (
                <Button
                  size="sm"
                  className="rounded-lg shrink-0"
                  onClick={handleEnableDeviceNotifications}
                  disabled={browserPushBusy}
                >
                  {browserPushBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  Enable Notifications
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {([
              { key: "new_note" as const, label: "New Notes", icon: "📄", desc: "When new notes are uploaded" },
              { key: "new_assignment" as const, label: "New Assignments", icon: "📝", desc: "When new assignments are posted" },
              { key: "new_practical" as const, label: "New Practicals", icon: "🧪", desc: "When new practicals are added" },
              { key: "deadline_alert" as const, label: "Deadline Alerts", icon: "⏰", desc: "Assignment deadline reminders" },
              { key: "admin_message" as const, label: "Admin Announcements", icon: "💬", desc: "Messages and announcements from admins" },
              { key: "request_approved" as const, label: "Request Approved", icon: "✅", desc: "When your request is approved" },
              { key: "request_denied" as const, label: "Request Denied", icon: "❌", desc: "When your request is denied" },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => handleNotifToggle(item.key)}
                disabled={notifSaving === item.key}
                className="w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    notifPrefs[item.key] ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      notifPrefs[item.key] ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

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

      {/* View Current Profile Picture Modal */}
      <Dialog open={viewProfileModalOpen} onOpenChange={setViewProfileModalOpen}>
        <DialogContent className="rounded-2xl max-w-sm p-6 text-center shadow-2xl border border-border">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-semibold">Profile Picture</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {user.name} &bull; <span className="capitalize">{user.role}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-3">
            <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl bg-muted flex items-center justify-center">
              {user.profileImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-5xl font-bold text-muted-foreground uppercase">
                  {initials}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground max-w-xs">
              {user.profileImage
                ? "Click below to update your profile image or upload a new photo."
                : "No custom profile picture set. Upload a photo to personalize your account."}
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-1">
            <Button
              type="button"
              className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
              onClick={() => {
                setViewProfileModalOpen(false);
                avatarFileInputRef.current?.click();
              }}
            >
              <Camera className="h-4 w-4" />
              Update Profile Picture
            </Button>

            {user.profileImage && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={handleRemoveProfileImage}
                disabled={uploadingAvatar}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Picture
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => setViewProfileModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropModalDynamic
        imageSrc={selectedImageSrc}
        open={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onCropSave={handleSaveCroppedAvatar}
        onFileSelect={(file) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setSelectedImageSrc(reader.result);
              setCropModalOpen(true);
            }
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}
