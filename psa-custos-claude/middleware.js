import { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_VALUE } from "./lib/auth";

// Gate server-side por cookie de sessão. Sem cookie válido → redireciona pra /login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)"],
};

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // rotas livres: a própria página de login e as APIs de auth
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout")
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get(COOKIE_NAME)?.value;
  if (session === SESSION_VALUE) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}
