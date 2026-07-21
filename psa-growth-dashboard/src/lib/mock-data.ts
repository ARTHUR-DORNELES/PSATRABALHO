// =====================================================================
// Dados de exemplo (modo USE_MOCK_DATA) — permitem rodar o painel sem
// banco. Os resultados dos experimentos são calculados pela MESMA engine
// (lib/stats.ts) usada em produção, então os números são coerentes.
// =====================================================================
import { evaluateExperiment, type VariantStat } from "./stats";
import type {
  AcquisitionGoal,
  AiSuggestion,
  Benchmark,
  Channel,
  DecisionCriteria,
  Experiment,
  ExperimentResult,
  ExperimentVariant,
  MetricDefinition,
  MetricSnapshot,
  SyncRun,
} from "./types";

// ---------------------------------------------------------------------
// Canais
// ---------------------------------------------------------------------
export const mockChannels: Channel[] = [
  { id: "ch-email", key: "email", name: "E-mail Marketing", kind: "EMAIL", sourceSystem: "HUBSPOT", sourceConfig: { hs_marketing_email: true }, active: true },
  { id: "ch-whatsapp", key: "whatsapp", name: "WhatsApp (N8N)", kind: "WHATSAPP", sourceSystem: "N8N", sourceConfig: { tag_prefix: "exp_" }, active: true },
  { id: "ch-organic", key: "organic", name: "Conteúdo orgânico / LPs", kind: "ORGANIC_CONTENT", sourceSystem: "HUBSPOT", sourceConfig: { utm_medium: "organic" }, active: true },
  { id: "ch-meta", key: "meta_ads", name: "Meta Ads", kind: "META_ADS", sourceSystem: "META", sourceConfig: { utm_source: "meta" }, active: true },
  { id: "ch-google", key: "google_ads", name: "Google Ads", kind: "GOOGLE_ADS", sourceSystem: "GOOGLE", sourceConfig: { utm_source: "google" }, active: true },
];

// ---------------------------------------------------------------------
// Catálogo de métricas
// ---------------------------------------------------------------------
const md = (
  key: string,
  label: string,
  kind: MetricDefinition["kind"],
  unit: string | null,
  rateOf: MetricDefinition["rateOf"] = {},
  higherIsBetter: 1 | -1 = 1,
): MetricDefinition => ({ id: `md-${key}`, key, label, kind, unit, rateOf, higherIsBetter });

export const mockMetricDefs: MetricDefinition[] = [
  md("sent", "Enviados", "COUNT", "envios"),
  md("delivered", "Entregues", "COUNT", "msgs"),
  md("opens", "Aberturas", "COUNT", "aberturas"),
  md("clicks", "Cliques", "COUNT", "cliques"),
  md("replies", "Respostas", "COUNT", "respostas"),
  md("impressions", "Impressões", "COUNT", "impr."),
  md("sessions", "Sessões", "COUNT", "sessões"),
  md("leads", "Leads", "COUNT", "leads"),
  md("mql", "MQL", "COUNT", "mql"),
  md("sql", "SQL", "COUNT", "sql"),
  md("deals", "Negócios", "COUNT", "deals"),
  md("open_rate", "Taxa de abertura", "RATE", "%", { numerator: "opens", denominator: "sent" }),
  md("click_rate", "Taxa de clique", "RATE", "%", { numerator: "clicks", denominator: "sent" }),
  md("reply_rate", "Taxa de resposta", "RATE", "%", { numerator: "replies", denominator: "delivered" }),
  md("lead_rate", "Taxa de conversão (lead)", "RATE", "%", { numerator: "leads", denominator: "clicks" }),
  md("revenue", "Receita", "CURRENCY", "BRL"),
  md("cost", "Investimento", "CURRENCY", "BRL"),
  md("cac", "CAC", "RATIO", "BRL", {}, -1),
];

const metricByKey = new Map(mockMetricDefs.map((m) => [m.key, m]));

// ---------------------------------------------------------------------
// Definição compacta dos experimentos de exemplo
// ---------------------------------------------------------------------
const DATES = [
  "2026-05-28",
  "2026-06-01",
  "2026-06-04",
  "2026-06-07",
  "2026-06-11",
  "2026-06-14",
];

type CurrentMetric = { value: number; numerator?: number; denominator?: number };
interface MockExpDef {
  id: string;
  code: string;
  name: string;
  channelKey: string;
  hypothesis: string;
  execution: string;
  audience: string;
  startedAt: string;
  ownerEmail: string;
  targetMetric: string;
  mde: number;
  variants: {
    key: string;
    name: string;
    isControl: boolean;
    current: Record<string, CurrentMetric>;
  }[];
  returns: { leads: number; mql: number; sql: number; deals: number; revenue: number; cost: number };
}

const EXP_DEFS: MockExpDef[] = [
  {
    id: "exp-001",
    code: "EXP-2026-001",
    name: "E-mail de boas-vindas: assunto curto vs. longo",
    channelKey: "email",
    hypothesis:
      "Assuntos curtos (≤ 35 caracteres) aumentam a taxa de abertura do e-mail de boas-vindas, porque aparecem inteiros no preview do mobile.",
    execution:
      "Split 50/50 na automação de boas-vindas. Controle = assunto atual longo; Variante A = assunto curto com o primeiro nome.",
    audience: "Novos contatos B2C inscritos via LP de conteúdo (junho/2026).",
    startedAt: "2026-05-26",
    ownerEmail: "crm.psa@profissionaissa.com",
    targetMetric: "open_rate",
    mde: 0.1,
    variants: [
      { key: "control", name: "Assunto longo (atual)", isControl: true, current: { sent: { value: 8000 }, opens: { value: 1840 }, clicks: { value: 320 }, leads: { value: 188 }, open_rate: { value: 0.23, numerator: 1840, denominator: 8000 } } },
      { key: "A", name: "Assunto curto + nome", isControl: false, current: { sent: { value: 8000 }, opens: { value: 2240 }, clicks: { value: 430 }, leads: { value: 222 }, open_rate: { value: 0.28, numerator: 2240, denominator: 8000 } } },
    ],
    returns: { leads: 410, mql: 120, sql: 38, deals: 9, revenue: 54000, cost: 0 },
  },
  {
    id: "exp-002",
    code: "EXP-2026-002",
    name: "WhatsApp: vídeo curto vs. texto no 1º contato",
    channelKey: "whatsapp",
    hypothesis:
      "Um vídeo de 20s do palestrante no primeiro contato aumenta a taxa de resposta vs. a mensagem de texto padrão.",
    execution:
      "Disparo via N8N para a base de leads mornos. Controle = texto; Variante A = vídeo + legenda curta.",
    audience: "Leads que baixaram material nos últimos 30 dias e não responderam.",
    startedAt: "2026-06-02",
    ownerEmail: "crm.psa@profissionaissa.com",
    targetMetric: "reply_rate",
    mde: 0.1,
    variants: [
      { key: "control", name: "Texto padrão", isControl: true, current: { delivered: { value: 1200 }, replies: { value: 156 }, leads: { value: 44 }, reply_rate: { value: 0.13, numerator: 156, denominator: 1200 } } },
      { key: "A", name: "Vídeo 20s", isControl: false, current: { delivered: { value: 1180 }, replies: { value: 168 }, leads: { value: 51 }, reply_rate: { value: 0.1424, numerator: 168, denominator: 1180 } } },
    ],
    returns: { leads: 95, mql: 30, sql: 12, deals: 4, revenue: 26000, cost: 800 },
  },
  {
    id: "exp-003",
    code: "EXP-2026-003",
    name: "LP certificação: prova social no topo",
    channelKey: "organic",
    hypothesis:
      "Subir os depoimentos para acima da dobra aumenta a conversão de visitante em lead na LP de certificação.",
    execution:
      "Teste A/B na LP (50/50). Controle = layout atual; Variante A = bloco de prova social no topo.",
    audience: "Tráfego orgânico e de redes para a LP de certificação.",
    startedAt: "2026-05-30",
    ownerEmail: "crm.psa@profissionaissa.com",
    targetMetric: "lead_rate",
    mde: 0.1,
    variants: [
      { key: "control", name: "Layout atual", isControl: true, current: { sessions: { value: 3200 }, leads: { value: 224 }, lead_rate: { value: 0.07, numerator: 224, denominator: 3200 } } },
      { key: "A", name: "Prova social no topo", isControl: false, current: { sessions: { value: 3150 }, leads: { value: 268 }, lead_rate: { value: 0.0851, numerator: 268, denominator: 3150 } } },
    ],
    returns: { leads: 492, mql: 150, sql: 47, deals: 12, revenue: 78000, cost: 0 },
  },
  {
    id: "exp-004",
    code: "EXP-2026-004",
    name: "Meta Ads: criativo depoimento vs. institucional",
    channelKey: "meta_ads",
    hypothesis:
      "Criativos com depoimento de aluno reduzem o custo por lead vs. o criativo institucional.",
    execution:
      "Dois conjuntos de anúncios com mesmo público e verba. Controle = institucional; Variante A = depoimento.",
    audience: "Lookalike 1% de compradores + interesses de carreira (B2C).",
    startedAt: "2026-06-05",
    ownerEmail: "crm.psa@profissionaissa.com",
    targetMetric: "lead_rate",
    mde: 0.1,
    variants: [
      { key: "control", name: "Institucional", isControl: true, current: { impressions: { value: 92000 }, clicks: { value: 1400 }, leads: { value: 70 }, cost: { value: 2600 }, lead_rate: { value: 0.05, numerator: 70, denominator: 1400 } } },
      { key: "A", name: "Depoimento de aluno", isControl: false, current: { impressions: { value: 90500 }, clicks: { value: 1380 }, leads: { value: 76 }, cost: { value: 2600 }, lead_rate: { value: 0.0551, numerator: 76, denominator: 1380 } } },
    ],
    returns: { leads: 146, mql: 40, sql: 16, deals: 6, revenue: 39000, cost: 5200 },
  },
  {
    id: "exp-005",
    code: "EXP-2026-005",
    name: "Newsletter: emoji no assunto vs. sem",
    channelKey: "email",
    hypothesis:
      "Emoji no início do assunto da newsletter aumenta a taxa de abertura.",
    execution:
      "Split 50/50 no envio semanal. Controle = sem emoji; Variante A = emoji no início.",
    audience: "Base ativa da newsletter (engajados nos últimos 90 dias).",
    startedAt: "2026-05-20",
    ownerEmail: "crm.psa@profissionaissa.com",
    targetMetric: "open_rate",
    mde: 0.1,
    variants: [
      { key: "control", name: "Sem emoji", isControl: true, current: { sent: { value: 30000 }, opens: { value: 6900 }, clicks: { value: 720 }, leads: { value: 680 }, open_rate: { value: 0.23, numerator: 6900, denominator: 30000 } } },
      { key: "A", name: "Com emoji", isControl: false, current: { sent: { value: 30000 }, opens: { value: 6960 }, clicks: { value: 735 }, leads: { value: 690 }, open_rate: { value: 0.232, numerator: 6960, denominator: 30000 } } },
    ],
    returns: { leads: 1360, mql: 410, sql: 120, deals: 22, revenue: 120000, cost: 0 },
  },
];

// ---------------------------------------------------------------------
// Expansão dos defs em registros do domínio
// ---------------------------------------------------------------------
const RETURN_KEYS = ["leads", "mql", "sql", "deals", "revenue", "cost"] as const;

function buildAll() {
  const experiments: Experiment[] = [];
  const variants: ExperimentVariant[] = [];
  const criteria: DecisionCriteria[] = [];
  const snapshots: MetricSnapshot[] = [];
  const results: ExperimentResult[] = [];

  for (const def of EXP_DEFS) {
    const channel = mockChannels.find((c) => c.key === def.channelKey)!;
    const targetDef = metricByKey.get(def.targetMetric)!;

    experiments.push({
      id: def.id,
      code: def.code,
      name: def.name,
      channelId: channel.id,
      hypothesis: def.hypothesis,
      startedAt: def.startedAt,
      endedAt: null,
      ownerEmail: def.ownerEmail,
      execution: def.execution,
      audience: def.audience,
      meta: {},
      status: "RUNNING",
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
      createdBy: def.ownerEmail,
      createdAt: `${def.startedAt}T09:00:00.000Z`,
      updatedAt: `${DATES[DATES.length - 1]}T12:00:00.000Z`,
    });

    criteria.push({
      experimentId: def.id,
      targetMetricKey: def.targetMetric,
      minDetectableEffect: def.mde,
      confidenceLevel: 0.95,
      power: 0.8,
      targetValue: null,
      testType: "two-sided",
      decisionDeadline: null,
      notes: null,
    });

    const variantStats: VariantStat[] = [];
    const sums: Record<string, number> = { leads: 0, mql: 0, sql: 0, deals: 0, revenue: 0, cost: 0 };
    const leadsTotal = def.variants.reduce((s, v) => s + (v.current.leads?.value ?? 0), 0);
    const presentReturn = new Set<string>();
    for (const v of def.variants)
      for (const k of Object.keys(v.current))
        if ((RETURN_KEYS as readonly string[]).includes(k)) presentReturn.add(k);

    for (const v of def.variants) {
      const variantId = `${def.id}-${v.key}`;
      variants.push({
        id: variantId,
        experimentId: def.id,
        key: v.key,
        name: v.name,
        isControl: v.isControl,
        description: null,
        sourceKey: { utm_content: `${def.code}_${v.key}` },
      });

      const target = v.current[def.targetMetric];
      variantStats.push({
        variantId,
        isControl: v.isControl,
        numerator: target?.numerator ?? 0,
        denominator: target?.denominator ?? 0,
        value: target?.value ?? 0,
      });

      for (const [metricKey, m] of Object.entries(v.current)) {
        if (metricKey === def.targetMetric) {
          // Série temporal (6 pontos) para o gráfico.
          DATES.forEach((d, i) => {
            const frac = (i + 1) / DATES.length;
            snapshots.push({
              id: `${variantId}-${metricKey}-${i}`,
              experimentId: def.id,
              variantId,
              metricKey,
              takenAt: `${d}T12:00:00.000Z`,
              sourceSystem: channel.sourceSystem,
              value: round(m.value, 4),
              numerator: m.numerator != null ? Math.round(m.numerator * frac) : null,
              denominator: m.denominator != null ? Math.round(m.denominator * frac) : null,
              meta: {},
            });
          });
        } else {
          // Métricas de volume / retorno: 1 snapshot atual.
          snapshots.push({
            id: `${variantId}-${metricKey}-now`,
            experimentId: def.id,
            variantId,
            metricKey,
            takenAt: `${DATES[DATES.length - 1]}T12:00:00.000Z`,
            sourceSystem: channel.sourceSystem,
            value: round(m.value, 4),
            numerator: m.numerator ?? null,
            denominator: m.denominator ?? null,
            meta: {},
          });
        }
        if ((RETURN_KEYS as readonly string[]).includes(metricKey)) sums[metricKey] += m.value;
      }

      // Distribui as métricas de retorno ausentes do current, proporcional
      // aos leads da variante — assim a soma reproduz def.returns e o
      // recálculo (que soma snapshots) bate com este result.
      const frac = leadsTotal > 0 ? (v.current.leads?.value ?? 0) / leadsTotal : 1 / def.variants.length;
      for (const rk of RETURN_KEYS) {
        if (rk === "leads" || presentReturn.has(rk)) continue;
        const total = def.returns[rk as keyof typeof def.returns] ?? 0;
        if (!total) continue;
        const val = Math.round(total * frac);
        snapshots.push({
          id: `${variantId}-${rk}-now`,
          experimentId: def.id,
          variantId,
          metricKey: rk,
          takenAt: `${DATES[DATES.length - 1]}T12:00:00.000Z`,
          sourceSystem: channel.sourceSystem,
          value: val,
          numerator: null,
          denominator: null,
          meta: {},
        });
        sums[rk] += val;
      }
    }

    const out = evaluateExperiment({
      metricKind: targetDef.kind,
      higherIsBetter: targetDef.higherIsBetter,
      variants: variantStats,
      mde: def.mde,
      confidenceLevel: 0.95,
      power: 0.8,
      testType: "two-sided",
      targetValue: null,
    });

    results.push({
      experimentId: def.id,
      computedAt: `${DATES[DATES.length - 1]}T12:05:00.000Z`,
      controlRate: out.controlRate,
      bestVariantId: out.bestVariantId,
      bestRate: out.bestRate,
      controlN: out.controlN,
      bestN: out.bestN,
      absoluteLift: out.absoluteLift,
      relativeLift: out.relativeLift,
      leadsAttributed: sums.leads || null,
      mqlAttributed: sums.mql || null,
      sqlAttributed: sums.sql || null,
      dealsAttributed: sums.deals || null,
      revenueAttributed: sums.revenue || null,
      costTotal: sums.cost || null,
      cac: sums.cost > 0 && sums.leads > 0 ? round(sums.cost / sums.leads, 2) : null,
      zScore: out.zScore,
      pValue: out.pValue,
      confidence: out.confidence,
      isSignificant: out.isSignificant,
      requiredNPerArm: out.requiredNPerArm,
      remainingNPerArm: out.remainingNPerArm,
      progressPct: out.progressPct,
      recommendation: out.recommendation,
      detail: {},
    });
  }

  return { experiments, variants, criteria, snapshots, results };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

const built = buildAll();
export const mockExperiments = built.experiments;
export const mockVariants = built.variants;
export const mockCriteria = built.criteria;
export const mockSnapshots = built.snapshots;
export const mockResults = built.results;

// ---------------------------------------------------------------------
// Metas de aquisição (junho/2026)
// ---------------------------------------------------------------------
export const mockGoals: AcquisitionGoal[] = [
  { id: "goal-leads-total", referenceMonth: "2026-06-01", channelId: null, metricKey: "leads", targetValue: 4000, actualValue: 2503, status: "ON_TRACK", note: "Meta agregada de leads do mês." },
  { id: "goal-leads-email", referenceMonth: "2026-06-01", channelId: "ch-email", metricKey: "leads", targetValue: 1800, actualValue: 1770, status: "ON_TRACK", note: null },
  { id: "goal-leads-meta", referenceMonth: "2026-06-01", channelId: "ch-meta", metricKey: "leads", targetValue: 900, actualValue: 420, status: "AT_RISK", note: "CPL acima do teto." },
  { id: "goal-leads-organic", referenceMonth: "2026-06-01", channelId: "ch-organic", metricKey: "leads", targetValue: 700, actualValue: 492, status: "ON_TRACK", note: null },
  { id: "goal-revenue-total", referenceMonth: "2026-06-01", channelId: null, metricKey: "revenue", targetValue: 450000, actualValue: 317000, status: "ON_TRACK", note: null },
];

// ---------------------------------------------------------------------
// Benchmarks (interno histórico + mercado)
// ---------------------------------------------------------------------
export const mockBenchmarks: Benchmark[] = [
  { id: "bm-open-int", kind: "INTERNAL_HISTORICAL", channelId: "ch-email", metricKey: "open_rate", value: 0.235, low: null, high: null, period: "2025", source: "Histórico interno PSA", active: true },
  { id: "bm-open-mkt", kind: "MARKET", channelId: "ch-email", metricKey: "open_rate", value: 0.26, low: 0.21, high: 0.30, period: "2025", source: "Benchmark e-mail educação (mercado)", active: true },
  { id: "bm-reply-int", kind: "INTERNAL_HISTORICAL", channelId: "ch-whatsapp", metricKey: "reply_rate", value: 0.12, low: null, high: null, period: "2025", source: "Histórico interno PSA", active: true },
  { id: "bm-lead-int", kind: "INTERNAL_HISTORICAL", channelId: "ch-organic", metricKey: "lead_rate", value: 0.068, low: null, high: null, period: "2025", source: "Histórico interno PSA", active: true },
  { id: "bm-cac-mkt", kind: "MARKET", channelId: "ch-meta", metricKey: "cac", value: 40, low: 25, high: 60, period: "2025", source: "Benchmark mídia paga (mercado)", active: true },
];

// ---------------------------------------------------------------------
// Sugestões de IA (exemplo)
// ---------------------------------------------------------------------
export const mockSuggestions: AiSuggestion[] = [
  { id: "sg-1", experimentId: "exp-002", channelId: "ch-whatsapp", context: {}, title: "Aumentar a amostra do teste de vídeo", body: "O lift de +9,5% na taxa de resposta é promissor, mas ainda não é estatisticamente significativo. Faltam ~X envios por braço. Mantenha o disparo por mais 1 semana antes de decidir.", rationale: "p-valor acima de 0,05; intervalo de confiança ainda cruza zero.", expectedImpact: "Chegar a 95% de confiança para validar o vídeo.", priority: 2, model: "exemplo", status: "NEW", createdAt: "2026-06-14T12:10:00.000Z" },
  { id: "sg-2", experimentId: "exp-005", channelId: "ch-email", context: {}, title: "Encerrar o teste de emoji (sem efeito)", body: "Com 30 mil envios por braço, o emoji no assunto não moveu a abertura (lift < 1%). Recomendo encerrar e liberar a verba de teste para a hipótese de horário de envio.", rationale: "Amostra já superou o necessário para detectar o efeito mínimo relevante.", expectedImpact: "Liberar capacidade de teste para hipóteses de maior potencial.", priority: 1, model: "exemplo", status: "NEW", createdAt: "2026-06-14T12:11:00.000Z" },
];

// ---------------------------------------------------------------------
// Histórico de sync (exemplo)
// ---------------------------------------------------------------------
export const mockSyncRuns: SyncRun[] = [
  { id: "sync-1", sourceSystem: "HUBSPOT", status: "SUCCESS", snapshotsWritten: 36, experimentsTouched: 5, errors: [], summary: { channels: ["email", "organic"] }, triggeredBy: "cron", startedAt: "2026-06-14T12:00:00.000Z", finishedAt: "2026-06-14T12:01:12.000Z" },
  { id: "sync-2", sourceSystem: "N8N", status: "SUCCESS", snapshotsWritten: 8, experimentsTouched: 1, errors: [], summary: { channels: ["whatsapp"] }, triggeredBy: "webhook", startedAt: "2026-06-14T11:30:00.000Z", finishedAt: "2026-06-14T11:30:03.000Z" },
];
