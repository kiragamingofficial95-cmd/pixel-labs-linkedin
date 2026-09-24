import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Simple middleware for password protection on the dashboard.
 * The auth page is excluded. API routes handle their own auth.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow auth page and static assets
  if (pathname === "/auth" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check for session cookie or Authorization header
  const authCookie = req.cookies.get("pixel_labs_auth");
  const authHeader = req.headers.get("authorization");
  const password = process.env.DASHBOARD_PASSWORD;

  // If no password set, allow all access (dev mode)
  if (!password) {
    return NextResponse.next();
  }

  // Check credentials
  const isAuthenticated = authCookie?.value === "true" ||
    authHeader === `Bearer ${password}`;

  if (!isAuthenticated && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/feed/:path*", "/ratio/:path*", "/performance/:path*"],
};
