// =====================================================================
// Camada de dados — alterna entre store em memória (USE_MOCK_DATA) e
// Supabase. As API routes e páginas só falam com este módulo.
// Padrão herdado do psa-bonus-dashboard/src/lib/db.ts (mock + mappers).
// =====================================================================
import { getSupabase, usingMockData } from "./supabase";
import {
  mockBenchmarks,
  mockChannels,
  mockCriteria,
  mockExperiments,
  mockGoals,
  mockMetricDefs,
  mockResults,
  mockSnapshots,
  mockSuggestions,
  mockSyncRuns,
  mockVariants,
} from "./mock-data";
import type {
  AcquisitionGoal,
  AiSuggestion,
  Benchmark,
  Channel,
  DecisionCriteria,
  Experiment,
  ExperimentFunnel,
  ExperimentResult,
  ExperimentStatus,
  ExperimentVariant,
  LatestMetrics,
  MetricDefinition,
  MetricSnapshot,
  SyncRun,
} from "./types";

// ---------------------------------------------------------------------
// Store em memória (mock) — clonado para permitir mutação em runtime.
// ---------------------------------------------------------------------
type Store = {
  channels: Channel[];
  metricDefs: MetricDefinition[];
  experiments: Experiment[];
  variants: ExperimentVariant[];
  criteria: DecisionCriteria[];
  snapshots: MetricSnapshot[];
  results: ExperimentResult[];
  goals: AcquisitionGoal[];
  benchmarks: Benchmark[];
  suggestions: AiSuggestion[];
  syncRuns: SyncRun[];
};

// Ancorado em globalThis: o Next em dev reavalia este módulo por rota, então
// uma variável de módulo comum não persistiria a escrita entre requests.
const _g = globalThis as unknown as { __psaGrowthStore?: Store };
function store(): Store {
  if (!_g.__psaGrowthStore) {
    _g.__psaGrowthStore = {
      channels: structuredClone(mockChannels),
      metricDefs: structuredClone(mockMetricDefs),
      experiments: structuredClone(mockExperiments),
      variants: structuredClone(mockVariants),
      criteria: structuredClone(mockCriteria),
      snapshots: structuredClone(mockSnapshots),
      results: structuredClone(mockResults),
      goals: structuredClone(mockGoals),
      benchmarks: structuredClone(mockBenchmarks),
      suggestions: structuredClone(mockSuggestions),
      syncRuns: structuredClone(mockSyncRuns),
    };
  }
  return _g.__psaGrowthStore;
}

// numeric do Postgres às vezes chega como string.
const num = (v: unknown): number | null =>
  v == null ? null : typeof v === "number" ? v : Number(v);
const num0 = (v: unknown): number => num(v) ?? 0;

function newId(): string {
  return globalThis.crypto.randomUUID();
}
function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------
// Mappers snake_case (DB) -> camelCase (domínio)
// ---------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
const channelFromDb = (r: any): Channel => ({
  id: r.id,
  key: r.key,
  name: r.name,
  kind: r.kind,
  sourceSystem: r.source_system,
  sourceConfig: r.source_config ?? {},
  active: r.active,
});
const metricDefFromDb = (r: any): MetricDefinition => ({
  id: r.id,
  key: r.key,
  label: r.label,
  kind: r.kind,
  unit: r.unit ?? null,
  rateOf: r.rate_of ?? {},
  higherIsBetter: (r.higher_is_better ?? 1) as 1 | -1,
});
const experimentFromDb = (r: any): Experiment => ({
  id: r.id,
  code: r.code ?? null,
  name: r.name,
  channelId: r.channel_id,
  hypothesis: r.hypothesis,
  startedAt: r.started_at,
  endedAt: r.ended_at ?? null,
  ownerEmail: r.owner_email ?? null,
  execution: r.execution ?? null,
  audience: r.audience ?? null,
  meta: r.meta ?? {},
  status: r.status,
  decidedAt: r.decided_at ?? null,
  decidedBy: r.decided_by ?? null,
  decisionNote: r.decision_note ?? null,
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const variantFromDb = (r: any): ExperimentVariant => ({
  id: r.id,
  experimentId: r.experiment_id,
  key: r.key,
  name: r.name,
  isControl: r.is_control,
  description: r.description ?? null,
  sourceKey: r.source_key ?? {},
});
const criteriaFromDb = (r: any): DecisionCriteria => ({
  experimentId: r.experiment_id,
  targetMetricKey: r.target_metric_key,
  minDetectableEffect: num0(r.min_detectable_effect),
  confidenceLevel: num0(r.confidence_level),
  power: num0(r.power),
  targetValue: num(r.target_value),
  testType: r.test_type,
  decisionDeadline: r.decision_deadline ?? null,
  notes: r.notes ?? null,
});
const snapshotFromDb = (r: any): MetricSnapshot => ({
  id: r.id,
  experimentId: r.experiment_id,
  variantId: r.variant_id,
  metricKey: r.metric_key,
  takenAt: r.taken_at,
  sourceSystem: r.source_system,
  value: num0(r.value),
  numerator: num(r.numerator),
  denominator: num(r.denominator),
  meta: r.meta ?? {},
});
const resultFromDb = (r: any): ExperimentResult => ({
  experimentId: r.experiment_id,
  computedAt: r.computed_at,
  controlRate: num(r.control_rate),
  bestVariantId: r.best_variant_id ?? null,
  bestRate: num(r.best_rate),
  controlN: num(r.control_n),
  bestN: num(r.best_n),
  absoluteLift: num(r.absolute_lift),
  relativeLift: num(r.relative_lift),
  leadsAttributed: num(r.leads_attributed),
  mqlAttributed: num(r.mql_attributed),
  sqlAttributed: num(r.sql_attributed),
  dealsAttributed: num(r.deals_attributed),
  revenueAttributed: num(r.revenue_attributed),
  costTotal: num(r.cost_total),
  cac: num(r.cac),
  zScore: num(r.z_score),
  pValue: num(r.p_value),
  confidence: num(r.confidence),
  isSignificant: !!r.is_significant,
  requiredNPerArm: num(r.required_n_per_arm),
  remainingNPerArm: num(r.remaining_n_per_arm),
  progressPct: num(r.progress_pct),
  recommendation: r.recommendation ?? null,
  detail: r.detail ?? {},
});
const goalFromDb = (r: any): AcquisitionGoal => ({
  id: r.id,
  referenceMonth: r.reference_month,
  channelId: r.channel_id ?? null,
  metricKey: r.metric_key,
  targetValue: num0(r.target_value),
  actualValue: num0(r.actual_value),
  status: r.status,
  note: r.note ?? null,
});
const benchmarkFromDb = (r: any): Benchmark => ({
  id: r.id,
  kind: r.kind,
  channelId: r.channel_id ?? null,
  metricKey: r.metric_key,
  value: num0(r.value),
  low: num(r.low),
  high: num(r.high),
  period: r.period ?? null,
  source: r.source ?? null,
  active: r.active,
});
const suggestionFromDb = (r: any): AiSuggestion => ({
  id: r.id,
  experimentId: r.experiment_id ?? null,
  channelId: r.channel_id ?? null,
  context: r.context ?? {},
  title: r.title,
  body: r.body,
  rationale: r.rationale ?? null,
  expectedImpact: r.expected_impact ?? null,
  priority: r.priority ?? 0,
  model: r.model ?? null,
  status: r.status,
  createdAt: r.created_at,
});
const syncRunFromDb = (r: any): SyncRun => ({
  id: r.id,
  sourceSystem: r.source_system,
  status: r.status,
  snapshotsWritten: r.snapshots_written ?? 0,
  experimentsTouched: r.experiments_touched ?? 0,
  errors: r.errors ?? [],
  summary: r.summary ?? {},
  triggeredBy: r.triggered_by ?? null,
  startedAt: r.started_at,
  finishedAt: r.finished_at ?? null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// =====================================================================
// LEITURA
// =====================================================================
export async function listChannels(): Promise<Channel[]> {
  if (usingMockData()) return store().channels;
  const { data, error } = await getSupabase().from("channels").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(channelFromDb);
}

export async function getChannel(id: string): Promise<Channel | null> {
  return (await listChannels()).find((c) => c.id === id) ?? null;
}

export async function listMetricDefs(): Promise<MetricDefinition[]> {
  if (usingMockData()) return store().metricDefs;
  const { data, error } = await getSupabase().from("metric_definitions").select("*");
  if (error) throw error;
  return (data ?? []).map(metricDefFromDb);
}

export async function listExperiments(): Promise<Experiment[]> {
  if (usingMockData())
    return [...store().experiments].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const { data, error } = await getSupabase()
    .from("experiments")
    .select("*")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(experimentFromDb);
}

export async function getExperiment(id: string): Promise<Experiment | null> {
  if (usingMockData()) return store().experiments.find((e) => e.id === id) ?? null;
  const { data, error } = await getSupabase().from("experiments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? experimentFromDb(data) : null;
}

export async function listVariants(experimentId: string): Promise<ExperimentVariant[]> {
  if (usingMockData()) return store().variants.filter((v) => v.experimentId === experimentId);
  const { data, error } = await getSupabase()
    .from("experiment_variants")
    .select("*")
    .eq("experiment_id", experimentId);
  if (error) throw error;
  return (data ?? []).map(variantFromDb);
}

export async function getCriteria(experimentId: string): Promise<DecisionCriteria | null> {
  if (usingMockData()) return store().criteria.find((c) => c.experimentId === experimentId) ?? null;
  const { data, error } = await getSupabase()
    .from("decision_criteria")
    .select("*")
    .eq("experiment_id", experimentId)
    .maybeSingle();
  if (error) throw error;
  return data ? criteriaFromDb(data) : null;
}

export async function getResult(experimentId: string): Promise<ExperimentResult | null> {
  if (usingMockData()) return store().results.find((r) => r.experimentId === experimentId) ?? null;
  const { data, error } = await getSupabase()
    .from("experiment_results")
    .select("*")
    .eq("experiment_id", experimentId)
    .maybeSingle();
  if (error) throw error;
  return data ? resultFromDb(data) : null;
}

export async function listSnapshots(
  experimentId: string,
  metricKey?: string,
): Promise<MetricSnapshot[]> {
  if (usingMockData()) {
    return store()
      .snapshots.filter(
        (s) => s.experimentId === experimentId && (!metricKey || s.metricKey === metricKey),
      )
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  }
  let q = getSupabase()
    .from("metric_snapshots")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("taken_at", { ascending: true });
  if (metricKey) q = q.eq("metric_key", metricKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(snapshotFromDb);
}

export async function getLatestMetrics(experimentId: string): Promise<LatestMetrics> {
  const out: LatestMetrics = {};
  if (usingMockData()) {
    const snaps = store()
      .snapshots.filter((s) => s.experimentId === experimentId)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    for (const s of snaps) {
      (out[s.variantId] ??= {})[s.metricKey] = s; // o último sobrescreve
    }
    return out;
  }
  const { data, error } = await getSupabase()
    .from("v_latest_metric")
    .select("*")
    .eq("experiment_id", experimentId);
  if (error) throw error;
  for (const r of data ?? []) {
    (out[r.variant_id] ??= {})[r.metric_key] = {
      id: "",
      experimentId: r.experiment_id,
      variantId: r.variant_id,
      metricKey: r.metric_key,
      takenAt: r.taken_at,
      sourceSystem: "HUBSPOT",
      value: num0(r.value),
      numerator: num(r.numerator),
      denominator: num(r.denominator),
      meta: {},
    };
  }
  return out;
}

export async function listGoals(referenceMonth?: string): Promise<AcquisitionGoal[]> {
  if (usingMockData()) {
    return store().goals.filter((g) => !referenceMonth || g.referenceMonth === referenceMonth);
  }
  let q = getSupabase().from("acquisition_goals").select("*");
  if (referenceMonth) q = q.eq("reference_month", referenceMonth);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(goalFromDb);
}

export async function listBenchmarks(): Promise<Benchmark[]> {
  if (usingMockData()) return store().benchmarks;
  const { data, error } = await getSupabase().from("benchmarks").select("*");
  if (error) throw error;
  return (data ?? []).map(benchmarkFromDb);
}

export async function listSuggestions(experimentId?: string): Promise<AiSuggestion[]> {
  if (usingMockData()) {
    return store()
      .suggestions.filter((s) => !experimentId || s.experimentId === experimentId)
      .sort((a, b) => b.priority - a.priority);
  }
  let q = getSupabase().from("ai_suggestions").select("*").order("priority", { ascending: false });
  if (experimentId) q = q.eq("experiment_id", experimentId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(suggestionFromDb);
}

export async function listSyncRuns(limit = 20): Promise<SyncRun[]> {
  if (usingMockData())
    return [...store().syncRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  const { data, error } = await getSupabase()
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(syncRunFromDb);
}

// =====================================================================
// COMPOSIÇÃO (funil)
// =====================================================================
export async function listFunnels(): Promise<ExperimentFunnel[]> {
  const [experiments, channels] = await Promise.all([listExperiments(), listChannels()]);
  const channelById = new Map(channels.map((c) => [c.id, c]));
  return Promise.all(
    experiments.map(async (experiment) => {
      const [variants, criteria, result] = await Promise.all([
        listVariants(experiment.id),
        getCriteria(experiment.id),
        getResult(experiment.id),
      ]);
      return {
        experiment,
        channel: channelById.get(experiment.channelId)!,
        variants,
        criteria,
        result,
        latestMetrics: {}, // a home não precisa; detalhe usa getFunnel
      };
    }),
  );
}

export async function getFunnel(id: string): Promise<ExperimentFunnel | null> {
  const experiment = await getExperiment(id);
  if (!experiment) return null;
  const [channel, variants, criteria, result, latestMetrics] = await Promise.all([
    getChannel(experiment.channelId),
    listVariants(id),
    getCriteria(id),
    getResult(id),
    getLatestMetrics(id),
  ]);
  return { experiment, channel: channel!, variants, criteria, result, latestMetrics };
}

// =====================================================================
// ESCRITA
// =====================================================================
export interface CreateExperimentInput {
  code?: string | null;
  name: string;
  channelId: string;
  hypothesis: string;
  startedAt: string;
  ownerEmail?: string | null;
  execution?: string | null;
  audience?: string | null;
  status?: ExperimentStatus;
  createdBy?: string | null;
  front?: string | null;
  variants: {
    key: string;
    name: string;
    isControl: boolean;
    description?: string | null;
    sourceKey?: Record<string, unknown>;
  }[];
  criteria: {
    targetMetricKey: string;
    minDetectableEffect: number;
    confidenceLevel: number;
    power: number;
    targetValue?: number | null;
    testType?: "two-sided" | "one-sided";
    decisionDeadline?: string | null;
    notes?: string | null;
  };
}

export async function createExperiment(input: CreateExperimentInput): Promise<Experiment> {
  const id = newId();
  const ts = nowIso();
  const experiment: Experiment = {
    id,
    code: input.code ?? null,
    name: input.name,
    channelId: input.channelId,
    hypothesis: input.hypothesis,
    startedAt: input.startedAt,
    endedAt: null,
    ownerEmail: input.ownerEmail ?? null,
    execution: input.execution ?? null,
    audience: input.audience ?? null,
    meta: input.front ? { front: input.front } : {},
    status: input.status ?? "RUNNING",
    decidedAt: null,
    decidedBy: null,
    decisionNote: null,
    createdBy: input.createdBy ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  const variants: ExperimentVariant[] = input.variants.map((v) => ({
    id: newId(),
    experimentId: id,
    key: v.key,
    name: v.name,
    isControl: v.isControl,
    description: v.description ?? null,
    sourceKey: v.sourceKey ?? {},
  }));
  const criteria: DecisionCriteria = {
    experimentId: id,
    targetMetricKey: input.criteria.targetMetricKey,
    minDetectableEffect: input.criteria.minDetectableEffect,
    confidenceLevel: input.criteria.confidenceLevel,
    power: input.criteria.power,
    targetValue: input.criteria.targetValue ?? null,
    testType: input.criteria.testType ?? "two-sided",
    decisionDeadline: input.criteria.decisionDeadline ?? null,
    notes: input.criteria.notes ?? null,
  };

  if (usingMockData()) {
    store().experiments.push(experiment);
    store().variants.push(...variants);
    store().criteria.push(criteria);
    return experiment;
  }

  const sb = getSupabase();
  const { error: e1 } = await sb.from("experiments").insert({
    id,
    code: experiment.code,
    name: experiment.name,
    channel_id: experiment.channelId,
    hypothesis: experiment.hypothesis,
    started_at: experiment.startedAt,
    owner_email: experiment.ownerEmail,
    execution: experiment.execution,
    audience: experiment.audience,
    meta: experiment.meta,
    status: experiment.status,
    created_by: experiment.createdBy,
  });
  if (e1) throw e1;
  const { error: e2 } = await sb.from("experiment_variants").insert(
    variants.map((v) => ({
      id: v.id,
      experiment_id: id,
      key: v.key,
      name: v.name,
      is_control: v.isControl,
      description: v.description,
      source_key: v.sourceKey,
    })),
  );
  if (e2) throw e2;
  const { error: e3 } = await sb.from("decision_criteria").insert({
    experiment_id: id,
    target_metric_key: criteria.targetMetricKey,
    min_detectable_effect: criteria.minDetectableEffect,
    confidence_level: criteria.confidenceLevel,
    power: criteria.power,
    target_value: criteria.targetValue,
    test_type: criteria.testType,
    decision_deadline: criteria.decisionDeadline,
    notes: criteria.notes,
  });
  if (e3) throw e3;
  return experiment;
}

export async function updateExperiment(
  id: string,
  patch: Partial<Pick<Experiment, "status" | "name" | "hypothesis" | "execution" | "audience" | "endedAt" | "decisionNote" | "decidedAt" | "decidedBy">> & { front?: string | null },
): Promise<Experiment | null> {
  if (usingMockData()) {
    const exp = store().experiments.find((e) => e.id === id);
    if (!exp) return null;
    const { front, ...rest } = patch;
    Object.assign(exp, rest, { updatedAt: nowIso() });
    if (front !== undefined) exp.meta = { ...(exp.meta ?? {}), front };
    return exp;
  }
  const dbPatch: Record<string, unknown> = {};
  if (patch.front !== undefined) {
    const cur = await getExperiment(id);
    dbPatch.meta = { ...(cur?.meta ?? {}), front: patch.front };
  }
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.hypothesis !== undefined) dbPatch.hypothesis = patch.hypothesis;
  if (patch.execution !== undefined) dbPatch.execution = patch.execution;
  if (patch.audience !== undefined) dbPatch.audience = patch.audience;
  if (patch.endedAt !== undefined) dbPatch.ended_at = patch.endedAt;
  if (patch.decisionNote !== undefined) dbPatch.decision_note = patch.decisionNote;
  if (patch.decidedAt !== undefined) dbPatch.decided_at = patch.decidedAt;
  if (patch.decidedBy !== undefined) dbPatch.decided_by = patch.decidedBy;
  const { data, error } = await getSupabase()
    .from("experiments")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? experimentFromDb(data) : null;
}

export async function updateCriteria(
  experimentId: string,
  patch: Partial<
    Pick<
      DecisionCriteria,
      "minDetectableEffect" | "confidenceLevel" | "power" | "targetValue" | "testType" | "decisionDeadline" | "notes"
    >
  >,
): Promise<DecisionCriteria | null> {
  if (usingMockData()) {
    const c = store().criteria.find((x) => x.experimentId === experimentId);
    if (!c) return null;
    Object.assign(c, patch);
    return c;
  }
  const dbPatch: Record<string, unknown> = {};
  if (patch.minDetectableEffect !== undefined) dbPatch.min_detectable_effect = patch.minDetectableEffect;
  if (patch.confidenceLevel !== undefined) dbPatch.confidence_level = patch.confidenceLevel;
  if (patch.power !== undefined) dbPatch.power = patch.power;
  if (patch.targetValue !== undefined) dbPatch.target_value = patch.targetValue;
  if (patch.testType !== undefined) dbPatch.test_type = patch.testType;
  if (patch.decisionDeadline !== undefined) dbPatch.decision_deadline = patch.decisionDeadline;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  const { data, error } = await getSupabase()
    .from("decision_criteria")
    .update(dbPatch)
    .eq("experiment_id", experimentId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? criteriaFromDb(data) : null;
}

export async function deleteExperiment(id: string): Promise<void> {
  if (usingMockData()) {
    const s = store();
    s.experiments = s.experiments.filter((e) => e.id !== id);
    s.variants = s.variants.filter((v) => v.experimentId !== id);
    s.criteria = s.criteria.filter((c) => c.experimentId !== id);
    s.snapshots = s.snapshots.filter((sn) => sn.experimentId !== id);
    s.results = s.results.filter((r) => r.experimentId !== id);
    return;
  }
  const { error } = await getSupabase().from("experiments").delete().eq("id", id);
  if (error) throw error;
}

export async function insertSnapshots(snaps: Omit<MetricSnapshot, "id">[], syncRunId?: string): Promise<number> {
  if (snaps.length === 0) return 0;
  if (usingMockData()) {
    store().snapshots.push(...snaps.map((s) => ({ ...s, id: newId() })));
    return snaps.length;
  }
  const { error } = await getSupabase().from("metric_snapshots").insert(
    snaps.map((s) => ({
      experiment_id: s.experimentId,
      variant_id: s.variantId,
      metric_key: s.metricKey,
      taken_at: s.takenAt,
      source_system: s.sourceSystem,
      value: s.value,
      numerator: s.numerator,
      denominator: s.denominator,
      meta: s.meta ?? {},
      sync_run_id: syncRunId ?? null,
    })),
  );
  if (error) throw error;
  return snaps.length;
}

export async function upsertResult(result: ExperimentResult): Promise<void> {
  if (usingMockData()) {
    const s = store();
    const idx = s.results.findIndex((r) => r.experimentId === result.experimentId);
    if (idx >= 0) s.results[idx] = result;
    else s.results.push(result);
    return;
  }
  const { error } = await getSupabase().from("experiment_results").upsert(
    {
      experiment_id: result.experimentId,
      computed_at: result.computedAt,
      control_rate: result.controlRate,
      best_variant_id: result.bestVariantId,
      best_rate: result.bestRate,
      control_n: result.controlN,
      best_n: result.bestN,
      absolute_lift: result.absoluteLift,
      relative_lift: result.relativeLift,
      leads_attributed: result.leadsAttributed,
      mql_attributed: result.mqlAttributed,
      sql_attributed: result.sqlAttributed,
      deals_attributed: result.dealsAttributed,
      revenue_attributed: result.revenueAttributed,
      cost_total: result.costTotal,
      cac: result.cac,
      z_score: result.zScore,
      p_value: result.pValue,
      confidence: result.confidence,
      is_significant: result.isSignificant,
      required_n_per_arm: result.requiredNPerArm,
      remaining_n_per_arm: result.remainingNPerArm,
      progress_pct: result.progressPct,
      recommendation: result.recommendation,
      detail: result.detail ?? {},
    },
    { onConflict: "experiment_id" },
  );
  if (error) throw error;
}

export async function upsertGoal(goal: Omit<AcquisitionGoal, "id"> & { id?: string }): Promise<AcquisitionGoal> {
  if (usingMockData()) {
    const s = store();
    const idx = s.goals.findIndex(
      (g) =>
        g.referenceMonth === goal.referenceMonth &&
        g.channelId === goal.channelId &&
        g.metricKey === goal.metricKey,
    );
    const saved: AcquisitionGoal = { ...goal, id: goal.id ?? (idx >= 0 ? s.goals[idx].id : newId()) };
    if (idx >= 0) s.goals[idx] = saved;
    else s.goals.push(saved);
    return saved;
  }
  const { data, error } = await getSupabase()
    .from("acquisition_goals")
    .upsert(
      {
        reference_month: goal.referenceMonth,
        channel_id: goal.channelId,
        metric_key: goal.metricKey,
        target_value: goal.targetValue,
        actual_value: goal.actualValue,
        status: goal.status,
        note: goal.note,
      },
      { onConflict: "reference_month,channel_id,metric_key" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return goalFromDb(data);
}

export async function upsertBenchmark(b: Omit<Benchmark, "id"> & { id?: string }): Promise<Benchmark> {
  if (usingMockData()) {
    const s = store();
    const saved: Benchmark = { ...b, id: b.id ?? newId() };
    const idx = b.id ? s.benchmarks.findIndex((x) => x.id === b.id) : -1;
    if (idx >= 0) s.benchmarks[idx] = saved;
    else s.benchmarks.push(saved);
    return saved;
  }
  const row = {
    kind: b.kind,
    channel_id: b.channelId,
    metric_key: b.metricKey,
    value: b.value,
    low: b.low,
    high: b.high,
    period: b.period,
    source: b.source,
    active: b.active,
  };
  const sb = getSupabase();
  if (b.id) {
    const { data, error } = await sb.from("benchmarks").update(row).eq("id", b.id).select("*").single();
    if (error) throw error;
    return benchmarkFromDb(data);
  }
  const { data, error } = await sb.from("benchmarks").insert(row).select("*").single();
  if (error) throw error;
  return benchmarkFromDb(data);
}

export async function deleteBenchmark(id: string): Promise<void> {
  if (usingMockData()) {
    store().benchmarks = store().benchmarks.filter((b) => b.id !== id);
    return;
  }
  const { error } = await getSupabase().from("benchmarks").delete().eq("id", id);
  if (error) throw error;
}

export async function createSuggestion(s: Omit<AiSuggestion, "id" | "createdAt">): Promise<AiSuggestion> {
  const suggestion: AiSuggestion = { ...s, id: newId(), createdAt: nowIso() };
  if (usingMockData()) {
    store().suggestions.unshift(suggestion);
    return suggestion;
  }
  const { data, error } = await getSupabase()
    .from("ai_suggestions")
    .insert({
      experiment_id: s.experimentId,
      channel_id: s.channelId,
      context: s.context ?? {},
      title: s.title,
      body: s.body,
      rationale: s.rationale,
      expected_impact: s.expectedImpact,
      priority: s.priority,
      model: s.model,
      status: s.status,
    })
    .select("*")
    .single();
  if (error) throw error;
  return suggestionFromDb(data);
}

export async function createSyncRun(sourceSystem: SyncRun["sourceSystem"], triggeredBy: string): Promise<string> {
  if (usingMockData()) {
    const run: SyncRun = {
      id: newId(),
      sourceSystem,
      status: "PENDING",
      snapshotsWritten: 0,
      experimentsTouched: 0,
      errors: [],
      summary: {},
      triggeredBy,
      startedAt: nowIso(),
      finishedAt: null,
    };
    store().syncRuns.unshift(run);
    return run.id;
  }
  const { data, error } = await getSupabase()
    .from("sync_runs")
    .insert({ source_system: sourceSystem, status: "PENDING", triggered_by: triggeredBy })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishSyncRun(
  id: string,
  patch: { status: SyncRun["status"]; snapshotsWritten: number; experimentsTouched: number; errors?: unknown[]; summary?: Record<string, unknown> },
): Promise<void> {
  if (usingMockData()) {
    const run = store().syncRuns.find((r) => r.id === id);
    if (run) Object.assign(run, patch, { finishedAt: nowIso() });
    return;
  }
  const { error } = await getSupabase()
    .from("sync_runs")
    .update({
      status: patch.status,
      snapshots_written: patch.snapshotsWritten,
      experiments_touched: patch.experimentsTouched,
      errors: patch.errors ?? [],
      summary: patch.summary ?? {},
      finished_at: nowIso(),
    })
    .eq("id", id);
  if (error) throw error;
}
