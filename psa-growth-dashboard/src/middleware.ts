import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

// Auth fica DESLIGADA até AUTH_ENABLED=true. Permite rodar em dev e fazer
// deploy seguro enquanto o admin configura GOOGLE_CLIENT_ID etc.
const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

// Repassa o pathname num header pro layout poder ler (esconder sidebar no login).
function passthrough(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

// Rotas que NUNCA exigem sessão (têm auth própria ou são públicas).
function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") || // valida x-n8n-secret
    pathname.startsWith("/api/cron") || // valida Bearer CRON_SECRET
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

const protectedMiddleware = auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return passthrough(req as unknown as NextRequest);

  // Bypass de admin pra scripts/curl (header x-admin-key).
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && req.headers.get("x-admin-key") === adminKey) {
    return passthrough(req as unknown as NextRequest);
  }

  if (!req.auth) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return passthrough(req as unknown as NextRequest);
});

// Quando a auth está desligada, exporta um middleware trivial que NÃO toca
// no NextAuth (evita exigir AUTH_SECRET em dev).
export default (AUTH_ENABLED ? protectedMiddleware : passthrough) as typeof protectedMiddleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
