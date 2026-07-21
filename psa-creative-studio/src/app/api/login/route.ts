import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "DASHBOARD_PASSWORD não configurado no servidor." }, { status: 500 });
  }
  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    // noop
  }
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("psa_creative_auth", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
