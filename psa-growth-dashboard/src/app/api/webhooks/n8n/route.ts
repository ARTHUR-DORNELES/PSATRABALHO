// Recebe métricas de disparos de WhatsApp do N8N (PUSH).
// Auth: header `x-n8n-secret` === N8N_WEBHOOK_SECRET.
// Body: { experiment: "<id ou code>", variant: "<key>", metrics: { delivered, replies, leads, ... }, takenAt? }
// O painel grava um snapshot por métrica e DERIVA a taxa-alvo (ex. reply_rate)
// a partir dos contadores brutos, usando metric_definitions.rate_of.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCriteria, insertSnapshots, listExperiments, listMetricDefs, listVariants } from "@/lib/db";
import { recomputeExperiment } from "@/lib/results";
import type { MetricSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  experiment: z.string().min(1),
  variant: z.string().min(1),
  metrics: z.record(z.coerce.number()),
  takenAt: z.string().optional(),
});

export async function POST(req: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-n8n-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { experiment: ref, variant: vkey, metrics, takenAt } = parsed.data;

  const exp = (await listExperiments()).find((e) => e.id === ref || e.code === ref);
  if (!exp) return NextResponse.json({ error: "Experimento não encontrado." }, { status: 404 });

  const variant = (await listVariants(exp.id)).find((v) => v.key === vkey);
  if (!variant) return NextResponse.json({ error: "Variante não encontrada." }, { status: 404 });

  const [criteria, metricDefs] = await Promise.all([getCriteria(exp.id), listMetricDefs()]);
  const ts = takenAt ?? new Date().toISOString();

  const snaps: Omit<MetricSnapshot, "id">[] = Object.entries(metrics).map(([metricKey, value]) => ({
    experimentId: exp.id,
    variantId: variant.id,
    metricKey,
    takenAt: ts,
    sourceSystem: "N8N",
    value,
    numerator: null,
    denominator: null,
    meta: { via: "n8n" },
  }));

  // Deriva a taxa-alvo (ex.: reply_rate = replies / delivered).
  const targetDef = metricDefs.find((m) => m.key === criteria?.targetMetricKey);
  if (targetDef?.kind === "RATE" && targetDef.rateOf.numerator && targetDef.rateOf.denominator) {
    const numV = metrics[targetDef.rateOf.numerator];
    const denV = metrics[targetDef.rateOf.denominator];
    if (numV != null && denV) {
      snaps.push({
        experimentId: exp.id,
        variantId: variant.id,
        metricKey: targetDef.key,
        takenAt: ts,
        sourceSystem: "N8N",
        value: numV / denV,
        numerator: numV,
        denominator: denV,
        meta: { derived: true },
      });
    }
  }

  const written = await insertSnapshots(snaps);
  const result = await recomputeExperiment(exp.id);
  return NextResponse.json({ ok: true, written, experiment: exp.id, recommendation: result?.recommendation });
}
