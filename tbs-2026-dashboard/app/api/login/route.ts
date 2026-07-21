import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD não configurado' }, { status: 500 });
  }
  let body: { password?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: 'Senha inválida' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('tbs_auth', expected, {
    httpOnly: true,
    secure: true, // obrigatório quando sameSite é 'none'
    sameSite: 'none', // permite o cookie dentro de iframe cross-site (painel mestre)
    partitioned: true, // CHIPS — exigido pelo Chrome atual senão bloqueia mesmo com 'none'
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
