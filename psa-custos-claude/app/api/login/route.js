import { NextResponse } from "next/server";
import { SITE_PASSWORD, COOKIE_NAME, SESSION_VALUE } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  let password = "";
  try { ({ password } = await req.json()); } catch {}
  if (password === SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, SESSION_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });
    return res;
  }
  return NextResponse.json({ ok: false, error: "Senha incorreta" }, { status: 401 });
}
