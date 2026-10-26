/**
 * @module lib/audit-log-formatter
 * @description Simplifies complex audit log records into human-friendly,
 * plain-English text, clean status badges, and simplified change comparisons.
 */

export interface SimpleLogView {
  badgeLabel: string;
  badgeClass: string;
  badgeDotClass: string;
  humanTitle: string;
  plainEnglishSummary: string;
  targetDisplay: string;
  targetTypeDisplay: string;
  actorDisplay: string;
  actorRoleDisplay: string;
  isFailure: boolean;
}

export function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "recently";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  if (isNaN(diff)) return "recently";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatFullDateTime(dateStr: string): string {
  if (!dateStr) return "Unknown date";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function simplifyAuditLog(log: {
  action?: string;
  actionCategory?: string;
  description?: string;
  status?: string;
  actor?: { name?: string; role?: string; collegeId?: string };
  target?: { name?: string; type?: string; section?: unknown; subject?: unknown };
}): SimpleLogView {
  const rawAction = (log.action || "").toUpperCase();
  const desc = log.description || "";
  const actorName = log.actor?.name || "User";
  const actorRole = log.actor?.role || "student";
  const rawTargetName = log.target?.name || "";
  const targetType = log.target?.type || "resource";
  const isFailure = log.status === "failure";

  // Friendly Actor Role Display
  let actorRoleDisplay = "Student";
  if (actorRole === "superadmin") actorRoleDisplay = "Super Admin";
  else if (actorRole === "admin") actorRoleDisplay = "Admin";
  else if (actorRole === "system") actorRoleDisplay = "System";

  // Friendly Target Type Display
  let targetTypeDisplay = targetType;
  if (targetType === "note") targetTypeDisplay = "Note";
  else if (targetType === "assignment") targetTypeDisplay = "Assignment";
  else if (targetType === "practical") targetTypeDisplay = "Practical";
  else if (targetType === "library") targetTypeDisplay = "Book / Material";
  else if (targetType === "access_request") targetTypeDisplay = "Access Request";
  else if (targetType === "admin_request") targetTypeDisplay = "Admin Request";
  else if (targetType === "user" || targetType === "student") targetTypeDisplay = "Student Account";
  else if (targetType === "auth") targetTypeDisplay = "Login Session";

  const targetDisplay = rawTargetName || targetTypeDisplay;

  // 1. Failure / Security Alert State
  if (isFailure) {
    return {
      badgeLabel: "Failed",
      badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
      badgeDotClass: "bg-red-500",
      humanTitle: "Action Failed",
      plainEnglishSummary: desc || `Failed action attempted by ${actorName}`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: true,
    };
  }

  // 2. Created / Uploaded
  if (rawAction.includes("CREATE") || rawAction.includes("UPLOAD") || rawAction.includes("ADD")) {
    return {
      badgeLabel: "Created",
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      badgeDotClass: "bg-emerald-500",
      humanTitle: `${targetTypeDisplay} Created`,
      plainEnglishSummary: `${actorName} created ${targetTypeDisplay.toLowerCase()} "${targetDisplay}"`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 3. Updated / Edited / Changed
  if (rawAction.includes("UPDATE") || rawAction.includes("EDIT") || rawAction.includes("CHANGE") || rawAction.includes("MODIFY")) {
    return {
      badgeLabel: "Updated",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
      badgeDotClass: "bg-blue-500",
      humanTitle: `${targetTypeDisplay} Updated`,
      plainEnglishSummary: `${actorName} updated "${targetDisplay}"`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 4. Deleted / Removed
  if (rawAction.includes("DELETE") || rawAction.includes("REMOVE")) {
    return {
      badgeLabel: "Deleted",
      badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      badgeDotClass: "bg-rose-500",
      humanTitle: `${targetTypeDisplay} Deleted`,
      plainEnglishSummary: `${actorName} deleted "${targetDisplay}"`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 5. Downloaded
  if (rawAction.includes("DOWNLOAD")) {
    return {
      badgeLabel: "Downloaded",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
      badgeDotClass: "bg-purple-500",
      humanTitle: "Resource Downloaded",
      plainEnglishSummary: `${actorName} downloaded "${targetDisplay}"`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 6. Viewed / Opened
  if (rawAction.includes("VIEW") || rawAction.includes("OPEN") || rawAction.includes("READ")) {
    return {
      badgeLabel: "Viewed",
      badgeClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
      badgeDotClass: "bg-teal-500",
      humanTitle: "Resource Viewed",
      plainEnglishSummary: `${actorName} opened "${targetDisplay}"`,
      targetDisplay,
      targetTypeDisplay,
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 7. Login / Logout / Auth
  if (rawAction.includes("LOGIN") || rawAction.includes("LOGOUT") || rawAction.includes("AUTH")) {
    const isLogout = rawAction.includes("LOGOUT");
    return {
      badgeLabel: isLogout ? "Logged Out" : "Logged In",
      badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      badgeDotClass: "bg-indigo-500",
      humanTitle: isLogout ? "User Logged Out" : "User Logged In",
      plainEnglishSummary: `${actorName} ${isLogout ? "logged out" : "logged in to portal"}`,
      targetDisplay: log.actor?.collegeId || "Session",
      targetTypeDisplay: "Authentication",
      actorDisplay: actorName,
      actorRoleDisplay,
      isFailure: false,
    };
  }

  // 8. General Activity
  return {
    badgeLabel: "Activity",
    badgeClass: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
    badgeDotClass: "bg-zinc-400",
    humanTitle: "Activity Event",
    plainEnglishSummary: desc || `${actorName} performed ${log.action || "action"}`,
    targetDisplay,
    targetTypeDisplay,
    actorDisplay: actorName,
    actorRoleDisplay,
    isFailure: false,
  };
}
