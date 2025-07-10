import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath =
    path === "/auth/login" ||
    path === "/auth/register" ||
    path === "/" ||
    path === "/join";

  // Get the token from cookies
  const token = request.cookies.get("token")?.value || "";

  // Redirect to login if accessing protected route without token
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.nextUrl));
  }

  // Redirect to dashboard if accessing auth pages with token (but allow home and join pages)
  if ((path === "/auth/login" || path === "/auth/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
