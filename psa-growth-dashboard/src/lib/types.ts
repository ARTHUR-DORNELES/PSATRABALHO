// =====================================================================
// Tipos do domínio — espelham o schema Supabase (supabase/*.sql)
// ---------------------------------------------------------------------
// Convenção: no Postgres as colunas são snake_case; aqui usamos
// camelCase. A conversão acontece nos mappers *FromDb de db.ts.
// =====================================================================

export type ChannelKind =
  | "EMAIL"
  | "WHATSAPP"
  | "ORGANIC_CONTENT"
  | "META_ADS"
  | "GOOGLE_ADS"
  | "OTHER";

export type SourceSystem =
  | "HUBSPOT"
  | "N8N"
  | "META"
  | "GOOGLE"
  | "MANUAL"
  | "GA4";

export type ExperimentStatus =
  | "DRAFT"
  | "RUNNING"
  | "PAUSED"
  | "WON"
  | "LOST"
  | "INCONCLUSIVE";

export type MetricKind = "RATE" | "COUNT" | "CURRENCY" | "RATIO";

export type GoalStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "ACHIEVED";

export type BenchmarkKind = "INTERNAL_HISTORICAL" | "MARKET";

export type SuggestionStatus = "NEW" | "ACCEPTED" | "DISMISSED" | "DONE";

// Saída da engine de decisão (etapa 5 do funil).
export type Recommendation =
  | "DECLARE_WINNER"
  | "STOP_NO_EFFECT"
  | "NEEDS_MORE_DATA"
  | "KEEP_RUNNING"
  | "INCONCLUSIVE";

export interface Channel {
  id: string;
  key: string;
  name: string;
  kind: ChannelKind;
  sourceSystem: SourceSystem;
  sourceConfig: Record<string, unknown>;
  active: boolean;
}

export interface MetricDefinition {
  id: string;
  key: string;
  label: string;
  kind: MetricKind;
  unit: string | null;
  /** Para RATE: { numerator: "opens", denominator: "sent" } */
  rateOf: { numerator?: string; denominator?: string };
  /** 1 = maior é melhor; -1 = menor é melhor (ex: CAC). */
  higherIsBetter: 1 | -1;
}

export interface ExperimentVariant {
  id: string;
  experimentId: string;
  key: string;
  name: string;
  isControl: boolean;
  description: string | null;
  /** Chave de junção com a fonte: utm_content, tag N8N, id de variante. */
  sourceKey: Record<string, unknown>;
}

export interface DecisionCriteria {
  experimentId: string;
  targetMetricKey: string;
  /** Lift relativo mínimo relevante (MDE). 0.10 = +10%. */
  minDetectableEffect: number;
  confidenceLevel: number; // 0.95
  power: number; // 0.80
  /** Alvo absoluto, quando não é A/B (ex: "gerar 50 leads"). */
  targetValue: number | null;
  testType: "two-sided" | "one-sided";
  decisionDeadline: string | null;
  notes: string | null;
}

export interface Experiment {
  id: string;
  code: string | null;
  name: string;
  channelId: string;
  // Etapa 1 — Início
  hypothesis: string;
  startedAt: string;
  endedAt: string | null;
  ownerEmail: string | null;
  // Etapa 2 — Execução
  execution: string | null;
  audience: string | null;
  meta: Record<string, unknown>;
  status: ExperimentStatus;
  // Decisão final
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetricSnapshot {
  id: string;
  experimentId: string;
  variantId: string;
  metricKey: string;
  takenAt: string;
  sourceSystem: SourceSystem;
  /** Valor cumulativo desde started_at. */
  value: number;
  /** Para RATE: numerador (ex: opens). */
  numerator: number | null;
  /** Para RATE: denominador / amostra (ex: sent). */
  denominator: number | null;
  meta: Record<string, unknown>;
}

export interface ExperimentResult {
  experimentId: string;
  computedAt: string;
  controlRate: number | null;
  bestVariantId: string | null;
  bestRate: number | null;
  controlN: number | null;
  bestN: number | null;
  // Etapa 4 — Retorno
  absoluteLift: number | null;
  relativeLift: number | null;
  leadsAttributed: number | null;
  mqlAttributed: number | null;
  sqlAttributed: number | null;
  dealsAttributed: number | null;
  revenueAttributed: number | null;
  costTotal: number | null;
  cac: number | null;
  // Etapa 5 — Confiança e "quanto falta"
  zScore: number | null;
  pValue: number | null;
  confidence: number | null;
  isSignificant: boolean;
  requiredNPerArm: number | null;
  remainingNPerArm: number | null;
  progressPct: number | null;
  recommendation: Recommendation | null;
  detail: Record<string, unknown>;
}

export interface AcquisitionGoal {
  id: string;
  referenceMonth: string; // "2026-06-01"
  channelId: string | null;
  metricKey: string;
  targetValue: number;
  actualValue: number;
  status: GoalStatus;
  note: string | null;
}

export interface Benchmark {
  id: string;
  kind: BenchmarkKind;
  channelId: string | null;
  metricKey: string;
  value: number;
  low: number | null;
  high: number | null;
  period: string | null;
  source: string | null;
  active: boolean;
}

export interface AiSuggestion {
  id: string;
  experimentId: string | null;
  channelId: string | null;
  context: Record<string, unknown>;
  title: string;
  body: string;
  rationale: string | null;
  expectedImpact: string | null;
  priority: number;
  model: string | null;
  status: SuggestionStatus;
  createdAt: string;
}

export interface SyncRun {
  id: string;
  sourceSystem: SourceSystem;
  status: "PENDING" | "SUCCESS" | "FAILED" | "PARTIAL";
  snapshotsWritten: number;
  experimentsTouched: number;
  errors: unknown[];
  summary: Record<string, unknown>;
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
}

/** Última métrica por variante: latestMetrics[variantId][metricKey] */
export type LatestMetrics = Record<string, Record<string, MetricSnapshot>>;

/** Visão composta do funil de 5 etapas (alimenta home e detalhe). */
export interface ExperimentFunnel {
  experiment: Experiment;
  channel: Channel;
  variants: ExperimentVariant[];
  criteria: DecisionCriteria | null;
  result: ExperimentResult | null;
  latestMetrics: LatestMetrics;
}
