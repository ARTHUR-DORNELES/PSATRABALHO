import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteBenchmark, listBenchmarks, upsertBenchmark } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().optional(),
  kind: z.enum(["INTERNAL_HISTORICAL", "MARKET"]),
  channelId: z.string().nullable().optional(),
  metricKey: z.string().min(1),
  value: z.number(),
  low: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  period: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export async function GET() {
  return NextResponse.json(await listBenchmarks());
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const saved = await upsertBenchmark({
      id: d.id,
      kind: d.kind,
      channelId: d.channelId ?? null,
      metricKey: d.metricKey,
      value: d.value,
      low: d.low ?? null,
      high: d.high ?? null,
      period: d.period ?? null,
      source: d.source ?? null,
      active: true,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe ?id=" }, { status: 400 });
  await deleteBenchmark(id);
  return NextResponse.json({ ok: true });
}
