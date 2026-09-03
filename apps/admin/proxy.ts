import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has("accessToken");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets. Note: this only
  // checks cookie *presence* — whether that session belongs to a platform
  // admin is verified server-side by AdminAuthProvider (via /auth/me) and,
  // independently and authoritatively, by PlatformAdminGuard on every
  // /admin/* backend call.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
