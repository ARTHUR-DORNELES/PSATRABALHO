import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.DASHBOARD_PASSWORD;
  if (!correct || password !== correct) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('psa50_auth', correct, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
