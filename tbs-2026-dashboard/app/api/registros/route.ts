import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { AREAS } from '@/lib/areas';
import {
  storageConfigured, listOcorrencias, getOcorrencia, putOcorrencia, delOcorrencia,
  type Ocorrencia, type Status,
} from '@/lib/registros-store';
import { listChangelogDinamico } from '@/lib/changelog-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES: Status[] = ['aberto', 'andamento', 'resolvido'];
const str = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);
const validArea = (v: unknown) => (AREAS as readonly string[]).includes(str(v)) ? str(v) : '';
const validData = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : '';

// GET → { configured, areas, ocorrencias, changelog }
export async function GET() {
  if (!storageConfigured()) return NextResponse.json({ configured: false, areas: AREAS, ocorrencias: [], changelog: [] });
  try {
    const [ocorrencias, changelog] = await Promise.all([listOcorrencias(), listChangelogDinamico()]);
    return NextResponse.json({ configured: true, areas: AREAS, ocorrencias, changelog });
  } catch (e) {
    return NextResponse.json({ configured: true, areas: AREAS, ocorrencias: [], changelog: [], error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST → cria ocorrência
export async function POST(req: Request) {
  if (!storageConfigured()) return NextResponse.json({ error: 'Armazenamento não configurado.' }, { status: 400 });
  try {
    const b = await req.json();
    const titulo = str(b.titulo, 160);
    const areaOrigem = validArea(b.areaOrigem);
    const areaResponsavel = validArea(b.areaResponsavel);
    const data = validData(b.data);
    const relator = str(b.relator, 80);
    if (!titulo) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });
    if (!areaOrigem || !areaResponsavel) return NextResponse.json({ error: 'Selecione a área de origem e a responsável.' }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    if (!relator) return NextResponse.json({ error: 'Diga quem está relatando.' }, { status: 400 });
    const now = new Date().toISOString();
    const o: Ocorrencia = {
      id: randomUUID(), criadoEm: now, data, titulo,
      descricao: str(b.descricao), areaOrigem, areaResponsavel, relator, status: 'aberto',
    };
    await putOcorrencia(o);
    return NextResponse.json({ ok: true, ocorrencia: o });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// PATCH → edita (status e/ou campos) de uma ocorrência existente
export async function PATCH(req: Request) {
  if (!storageConfigured()) return NextResponse.json({ error: 'Armazenamento não configurado.' }, { status: 400 });
  try {
    const b = await req.json();
    const id = str(b.id, 64);
    const cur = id ? await getOcorrencia(id) : null;
    if (!cur) return NextResponse.json({ error: 'Ocorrência não encontrada.' }, { status: 404 });
    const next: Ocorrencia = { ...cur };
    if (b.status !== undefined && STATUSES.includes(str(b.status) as Status)) next.status = str(b.status) as Status;
    if (b.titulo !== undefined) next.titulo = str(b.titulo, 160) || cur.titulo;
    if (b.descricao !== undefined) next.descricao = str(b.descricao);
    if (b.data !== undefined && validData(b.data)) next.data = validData(b.data);
    if (b.areaOrigem !== undefined && validArea(b.areaOrigem)) next.areaOrigem = validArea(b.areaOrigem);
    if (b.areaResponsavel !== undefined && validArea(b.areaResponsavel)) next.areaResponsavel = validArea(b.areaResponsavel);
    if (b.relator !== undefined) next.relator = str(b.relator, 80) || cur.relator;
    next.atualizadoEm = new Date().toISOString();
    await putOcorrencia(next);
    return NextResponse.json({ ok: true, ocorrencia: next });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// DELETE ?id=...
export async function DELETE(req: Request) {
  if (!storageConfigured()) return NextResponse.json({ error: 'Armazenamento não configurado.' }, { status: 400 });
  try {
    const id = str(new URL(req.url).searchParams.get('id'), 64);
    if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });
    await delOcorrencia(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
