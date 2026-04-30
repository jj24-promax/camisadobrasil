import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CLOAKER_COOKIE,
  CLOAKER_DISABLE_PARAM,
  CLOAKER_REDIRECT_URL,
  shouldCloak,
} from "@/lib/cloaker";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1) Blindagem do /admin (mantém comportamento anterior)
  if (isAdminPath(pathname) && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("sb-access-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // 2) Cloaker — só roda em rotas públicas
  if (isAdminPath(pathname)) return NextResponse.next();

  // Bypass via query param: persiste em cookie (1 ano) e deixa passar
  if (searchParams.get(CLOAKER_DISABLE_PARAM) === "1") {
    const url = request.nextUrl.clone();
    url.searchParams.delete(CLOAKER_DISABLE_PARAM);
    const response = NextResponse.redirect(url);
    response.cookies.set(CLOAKER_COOKIE, "1", {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // precisa ler no client pra espelhar em localStorage
    });
    return response;
  }

  // Bypass persistente
  if (request.cookies.get(CLOAKER_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") ?? "";
  const cloak = shouldCloak({ ua, search: searchParams });
  if (cloak) {
    return NextResponse.redirect(CLOAKER_REDIRECT_URL, { status: 302 });
  }

  return NextResponse.next();
}

export const config = {
  // Aplica em todas as rotas exceto api, assets do Next, arquivos públicos comuns e o webhook.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
