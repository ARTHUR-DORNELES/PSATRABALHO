import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { fetchCompradoresExport } from '@/lib/export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Busca TODOS os negócios do filtro (sem o limit:100 do drill) + o contato associado de cada um —
// bem mais chamadas ao HubSpot que o drill normal, então precisa do teto máximo do plano (60s, Hobby).
export const maxDuration = 60;

export async function GET(req: Request) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'HUBSPOT_TOKEN não configurado.' }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const value = searchParams.get('value') || 'concluido';
  const month = searchParams.get('month') || undefined;
  const produto = searchParams.get('produto') || undefined;

  try {
    const rows = await fetchCompradoresExport(token, { value, month, produto });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    // BOM UTF-8 — sem isso o Excel abre acentuação (ç, ã, é...) quebrada.
    const bom = String.fromCharCode(0xfeff);
    const suffix = month ? `_${month}` : '';
    const filename = `compradores_tbschool_${value}${suffix}.csv`;
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
