import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/account", "/api/quotes", "/api/lists", "/api/account"];
const AUTH_EXEMPT = ["/api/auth", "/api/makeswift", "/api/security", "/api/algolia-sync"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const isExempt = AUTH_EXEMPT.some((p) => pathname.startsWith(p));
  if (isExempt) return NextResponse.next();

  const session = req.cookies.get("acme_session");
  if (!session?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/api/quotes/:path*", "/api/lists/:path*", "/api/account/:path*"],
};
