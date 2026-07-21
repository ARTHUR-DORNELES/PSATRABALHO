// =====================================================================
// Recálculo do resultado de um experimento (etapas 4 e 5 do funil).
// Compartilhado entre /api/experiments/[id]/recompute e o sync.
// Soma os últimos snapshots de retorno e roda a engine na métrica-alvo.
// =====================================================================
import { evaluateExperiment, type VariantStat } from "./stats";
import { getCriteria, getLatestMetrics, listMetricDefs, listVariants, upsertResult } from "./db";
import type { ExperimentResult } from "./types";

export async function recomputeExperiment(id: string): Promise<ExperimentResult | null> {
  const [variants, criteria, latest, metricDefs] = await Promise.all([
    listVariants(id),
    getCriteria(id),
    getLatestMetrics(id),
    listMetricDefs(),
  ]);
  if (!criteria || variants.length === 0) return null;

  const targetDef = new Map(metricDefs.map((m) => [m.key, m])).get(criteria.targetMetricKey);

  const variantStats: VariantStat[] = variants.map((v) => {
    const cell = latest[v.id]?.[criteria.targetMetricKey];
    return {
      variantId: v.id,
      isControl: v.isControl,
      numerator: cell?.numerator ?? 0,
      denominator: cell?.denominator ?? 0,
      value: cell?.value ?? 0,
    };
  });

  const deadlinePassed = criteria.decisionDeadline
    ? new Date(criteria.decisionDeadline).getTime() < Date.now()
    : false;

  const out = evaluateExperiment({
    metricKind: targetDef?.kind ?? "RATE",
    higherIsBetter: targetDef?.higherIsBetter ?? 1,
    variants: variantStats,
    mde: criteria.minDetectableEffect,
    confidenceLevel: criteria.confidenceLevel,
    power: criteria.power,
    testType: criteria.testType,
    targetValue: criteria.targetValue,
    deadlinePassed,
  });

  // Atribuição (etapa 4): soma o último snapshot de cada métrica de retorno.
  const sum = (key: string) =>
    variants.reduce((s, v) => s + (latest[v.id]?.[key]?.value ?? 0), 0);
  const leads = sum("leads");
  const cost = sum("cost");

  const result: ExperimentResult = {
    experimentId: id,
    computedAt: new Date().toISOString(),
    controlRate: out.controlRate,
    bestVariantId: out.bestVariantId,
    bestRate: out.bestRate,
    controlN: out.controlN,
    bestN: out.bestN,
    absoluteLift: out.absoluteLift,
    relativeLift: out.relativeLift,
    leadsAttributed: leads || null,
    mqlAttributed: sum("mql") || null,
    sqlAttributed: sum("sql") || null,
    dealsAttributed: sum("deals") || null,
    revenueAttributed: sum("revenue") || null,
    costTotal: cost || null,
    cac: cost > 0 && leads > 0 ? Math.round((cost / leads) * 100) / 100 : null,
    zScore: out.zScore,
    pValue: out.pValue,
    confidence: out.confidence,
    isSignificant: out.isSignificant,
    requiredNPerArm: out.requiredNPerArm,
    remainingNPerArm: out.remainingNPerArm,
    progressPct: out.progressPct,
    recommendation: out.recommendation,
    detail: {},
  };
  await upsertResult(result);
  return result;
}
