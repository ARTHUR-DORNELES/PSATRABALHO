import { NextResponse } from "next/server";
import { z } from "zod";
import { getCriteria, insertSnapshots, listMetricDefs } from "@/lib/db";
import { recomputeExperiment } from "@/lib/results";
import type { MetricSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  rows: z
    .array(
      z.object({
        variantId: z.string().min(1),
        values: z.record(z.number()),
      }),
    )
    .min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const [metricDefs, criteria] = await Promise.all([listMetricDefs(), getCriteria(params.id)]);
  const byKey = new Map(metricDefs.map((m) => [m.key, m]));
  const now = new Date().toISOString();
  const snaps: Omit<MetricSnapshot, "id">[] = [];

  for (const row of parsed.data.rows) {
    // Métricas-base (contagem / moeda) digitadas.
    for (const [key, val] of Object.entries(row.values)) {
      if (!Number.isFinite(val) || !byKey.has(key)) continue;
      snaps.push({
        experimentId: params.id,
        variantId: row.variantId,
        metricKey: key,
        takenAt: now,
        sourceSystem: "MANUAL",
        value: val,
        numerator: null,
        denominator: null,
        meta: {},
      });
    }
    // Taxa-alvo derivada (numerador ÷ denominador), quando o alvo é RATE.
    if (criteria) {
      const t = byKey.get(criteria.targetMetricKey);
      if (t && t.kind === "RATE" && t.rateOf.numerator && t.rateOf.denominator) {
        const num = row.values[t.rateOf.numerator];
        const den = row.values[t.rateOf.denominator];
        if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
          snaps.push({
            experimentId: params.id,
            variantId: row.variantId,
            metricKey: t.key,
            takenAt: now,
            sourceSystem: "MANUAL",
            value: num / den,
            numerator: num,
            denominator: den,
            meta: {},
          });
        }
      }
    }
  }

  if (snaps.length === 0) {
    return NextResponse.json({ error: "Nenhum número informado." }, { status: 400 });
  }

  await insertSnapshots(snaps);
  const result = await recomputeExperiment(params.id);
  return NextResponse.json({ ok: true, snapshots: snaps.length, result });
}
