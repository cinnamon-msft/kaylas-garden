import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicPaths = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets and API uploads
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/uploads")) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
