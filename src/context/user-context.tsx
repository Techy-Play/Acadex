/**
 * @context UserContext
 * @description Shared global user session context to prevent redundant /api/auth/me
 * fetches during tab navigation inside dashboards.
 *
 * Usage:
 *   - Wrap dashboard layout with <UserProvider>
 *   - Consume with useUser() hook in any child component or page
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { fetchMeCached, clearMeCache } from "@/lib/client-auth";

export interface UserContextUser {
  id: string;
  name: string;
  college_id: string;
  role: "admin" | "student";
  profileImage?: string | null;
  profileImageDriveId?: string | null;
  must_change_password: boolean;
  adminAlias?: string | null;
  isSuperAdmin?: boolean;
  isAdminSubject?: boolean;
  isAdminStream?: boolean;
  isAdminSection?: boolean;
  status?: string;
  stream?: { id: string; name: string; subjects: unknown[] } | null;
  section?: { id: string; name: string } | null;
  semester?: number | null;
  email?: string | null;
  createdAt?: string;
  dashboardView?: "grid" | "list" | "detail";
  theme?: string;
  accentColor?: string;
  mobileNavPosition?: "top" | "bottom" | "left";
  notificationPreferences?: Record<string, boolean>;
  [key: string]: unknown;
}

interface UserContextValue {
  user: UserContextUser | null;
  loading: boolean;
  /** Re-fetch user from server (clears cache first) */
  refetchUser: () => Promise<void>;
  /** Update user in-place without a round-trip (for local state mutations) */
  setUser: React.Dispatch<React.SetStateAction<UserContextUser | null>>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserContextUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (clearCache = false) => {
    try {
      if (clearCache) clearMeCache();
      const data = await fetchMeCached(30_000); // 30s TTL — longer for cross-tab stability
      setUser(data.user as UserContextUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser(false);
  }, [loadUser]);

  const refetchUser = useCallback(async () => {
    await loadUser(true);
  }, [loadUser]);

  return (
    <UserContext.Provider value={{ user, loading, refetchUser, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

/** Consume the shared user session. Must be used inside <UserProvider>. */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser() must be used inside <UserProvider>");
  }
  return ctx;
}
