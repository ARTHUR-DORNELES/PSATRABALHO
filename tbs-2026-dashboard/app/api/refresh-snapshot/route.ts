import { NextResponse } from 'next/server';
import { invalidateAndFetch } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 60 é o teto do plano Hobby (não dá pra subir). A reconstrução varia ~55-65s dependendo da base —
// varredura de inscritos e negócios paralelizada (lib/hubspot.ts hsSearchAllSeekByDateParallel) pra
// caber aqui; sem isto passava de 80s e o "Atualizar" sempre falhava por timeout.
export const maxDuration = 60;

export async function POST() {
  if (!process.env.HUBSPOT_TOKEN) {
    return NextResponse.json(
      { error: 'HUBSPOT_TOKEN não configurado. Defina a env var na Vercel ou em .env local.' },
      { status: 400 },
    );
  }
  try {
    const data = await invalidateAndFetch();
    return NextResponse.json({
      ok: true,
      generatedAt: data.generatedAt,
      source: data.source,
      total2026: data.headline.edition2026.total,
      interesse2026: data.headline.edition2026.interesse,
      funnelStages: data.funnel.stages.map((s) => ({ label: s.label, value: s.value })),
      channels: data.channels.buckets.map((b) => ({ key: b.key, label: b.label, count: b.count })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
