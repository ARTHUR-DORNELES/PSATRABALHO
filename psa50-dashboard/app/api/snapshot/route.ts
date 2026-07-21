import { NextRequest, NextResponse } from 'next/server';
import { fetchSnapshot } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return NextResponse.json({ error: 'HUBSPOT_TOKEN não configurado' }, { status: 500 });
  const force = req.nextUrl.searchParams.get('force') === '1';
  try {
    const data = await fetchSnapshot(token, force);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
