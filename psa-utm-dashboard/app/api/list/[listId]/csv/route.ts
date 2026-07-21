import { NextResponse } from 'next/server';
import { fetchListAnalysis } from '@/lib/list-analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { listId: string } }) {
  let a;
  try {
    a = await fetchListAnalysis(params.listId);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const header = [
    'Record ID',
    'name',
    'email',
    'created_at',
    'current_utm_source',
    'suggested_utm_source',
    'suggested_utm_medium',
    'suggested_utm_campaign',
    'recovery_path',
    'first_url',
    'first_referrer',
    'analytics_source',
    'first_conversion_event_name',
    'hubspot_url',
  ];

  const rows = a.contacts.map((c) => [
    c.id,
    c.name,
    c.email,
    c.createdAt,
    c.currentUtmSource,
    c.suggestedUtm?.utm_source ?? '',
    c.suggestedUtm?.utm_medium ?? '',
    c.suggestedUtm?.utm_campaign ?? '',
    c.recoveryPath,
    c.landing,
    c.referrer,
    c.analyticsSource,
    c.conversion,
    c.hubspotUrl,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="psa-utm-backfill-list-${params.listId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

function escapeCsv(value: string | null | undefined): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
