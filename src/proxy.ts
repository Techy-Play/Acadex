/**
 * @module middleware
 * @description Edge middleware for JWT-based route protection.
 * Uses `jose` (Edge-compatible) to verify the `acadex-token` cookie.
 * Injects user info via `x-user-*` request headers for downstream API routes.
 * Public routes (landing, login, apply, etc.) bypass auth.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// We use jose instead of jsonwebtoken in middleware because
// Next.js Edge Runtime doesn't support Node.js crypto module.
// jose is already included with Next.js.

const COOKIE_NAME = "acadex-token";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      userId: string;
      collegeId: string;
      role: "admin" | "student";
      name: string;
      isSuperAdmin?: boolean;
      section?: string | null;
      semester?: number | null;
      mustChangePassword?: boolean;
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public pages that DON'T redirect logged-in users
  const publicNonRedirect = ["/about", "/contact"];
  if (publicNonRedirect.includes(pathname)) {
    return NextResponse.next();
  }

  // Public routes - check if user is already logged in and redirect
  const publicPaths = ["/", "/login", "/apply", "/forgot-password"];
  if (publicPaths.includes(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        // User is already logged in — redirect to their dashboard
        if (payload.mustChangePassword) {
          return NextResponse.redirect(new URL("/change-password", request.url));
        }
        const dest =
          payload.role === "admin"
            ? payload.isSuperAdmin
              ? "/admin"
              : "/user/dashboard"
            : "/user/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  // API auth routes are public
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/forgot-password") || pathname.startsWith("/api/auth/signup-otp")) {
    return NextResponse.next();
  }

  // Public access request API (students apply without auth)
  if (pathname.startsWith("/api/access-requests")) {
    return NextResponse.next();
  }

  // Public sections API for access request form (GET only)
  if (pathname === "/api/sections" && request.method === "GET") {
    return NextResponse.next();
  }

  // Public contact API (visitors can submit messages without auth)
  if (pathname === "/api/contact" && request.method === "POST") {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // If it's an API route, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to login for page routes
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  const payload = await verifyJWT(token);

  if (!payload) {
    // Invalid token - clear cookie and redirect
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Invalid token" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Force password change if required
  if (
    payload.mustChangePassword &&
    pathname !== "/change-password" &&
    !pathname.startsWith("/api/auth/change-password") &&
    !pathname.startsWith("/api/auth/logout") &&
    !pathname.startsWith("/api/auth/me")
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Password change required", mustChangePassword: true },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (payload.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
  }

  // Add user info to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-name", payload.name);
  requestHeaders.set("x-user-college-id", payload.collegeId);
  requestHeaders.set("x-user-is-super-admin", String(payload.isSuperAdmin || false));
  if (payload.section) {
    requestHeaders.set("x-user-section", payload.section);
  }
  if (payload.semester) {
    requestHeaders.set("x-user-semester", String(payload.semester));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/apply",
    "/forgot-password",
    "/about",
    "/contact",
    "/user/dashboard/:path*",
    "/admin/:path*",
    "/change-password",
    "/account-restricted",
    "/api/admin/:path*",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/change-password",
    "/api/auth/send-otp",
    "/api/auth/verify-otp",
    "/api/auth/forgot-password",
    "/api/auth/signup-otp",
    "/api/profile/:path*",
    "/api/notifications/:path*",
    "/api/subjects/:path*",
    "/api/notes/:path*",
    "/api/assignments/:path*",
    "/api/completions/:path*",
    "/api/practicals/:path*",
    "/api/practical-completions/:path*",
    "/api/streams/:path*",
    "/api/sections/:path*",
    "/api/access-requests/:path*",
    "/api/contact/:path*",
    "/api/user-uploads/:path*",
    "/api/user-requests/:path*",
    "/api/push/:path*",
  ],
};
