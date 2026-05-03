import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname) && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("sb-access-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
