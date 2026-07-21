import { NextResponse } from 'next/server';
import { runDrill, type DrillQuery } from '@/lib/drill';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'HUBSPOT_TOKEN não configurado' }, { status: 400 });
  }
  let body: DrillQuery;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  try {
    const result = await runDrill(token, body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
