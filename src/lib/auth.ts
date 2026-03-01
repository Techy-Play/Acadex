/**
 * @module lib/auth
 * @description JWT authentication utilities for API routes (server-side only).
 * Uses `jsonwebtoken` for signing/verifying tokens and Next.js `cookies()`
 * for reading/writing the `acadex-token` httpOnly cookie (7-day TTL).
 *
 * NOTE: Edge middleware uses `jose` instead — see {@link ../middleware.ts}.
 */
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;

/** Cookie name used across the app */
const COOKIE_NAME = "acadex-token";

/** Token / cookie max-age in seconds (7 days) */
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Shape of the data stored inside the JWT */
export interface JWTPayload {
  userId: string;
  collegeId: string;
  role: "admin" | "student";
  name: string;
  isSuperAdmin?: boolean;
  section?: string | null;
  semester?: number | null;
}

/** Signs a JWT with the given payload and returns the token string. */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE });
}

/** Verifies a JWT and returns the decoded payload, or `null` if invalid/expired. */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/** Sets the auth cookie on the response. */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Clears the auth cookie (logs the user out). */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/** Reads the auth cookie and returns the decoded JWT payload, or `null`. */
export async function getAuthFromCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
