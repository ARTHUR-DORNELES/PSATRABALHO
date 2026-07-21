import { NextResponse, type NextRequest } from "next/server";

// Gate por senha única (DASHBOARD_PASSWORD) — pensado pra compartilhar um
// link externo sem precisar de conta Google. Sem senha configurada, deixa
// passar (modo dev local). Mesmo padrão do psa-utm-dashboard.
const COOKIE_NAME = "psa_creative_auth";

function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    // assets estáticos de marca — NÃO devem ficar atrás da senha, senão a
    // fonte DX Rigraf / logo / selo não carregam e a peça cai no fallback.
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/brand") ||
    pathname === "/favicon.ico"
  );
}

// Repassa o pathname num header pro layout poder ler (esconder sidebar no login).
function passthrough(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return passthrough(req);

  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return passthrough(req);

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === expected) return passthrough(req);

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
