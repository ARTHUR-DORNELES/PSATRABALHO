import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project";

export const dynamic = "force-dynamic";

const schema = z.object({ projectId: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Envie projectId." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_PROJECT_COOKIE, parsed.data.projectId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
