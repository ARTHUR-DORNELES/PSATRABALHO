import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target, TrendingUp, Coins, Sparkles, FlaskConical } from "lucide-react";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { ExperimentChart, type ChartPoint } from "@/components/ExperimentChart";
import { ExperimentActions } from "@/components/ExperimentActions";
import { HypothesisCard } from "@/components/HypothesisCard";
import { RegisterNumbersForm } from "@/components/RegisterNumbersForm";
import { CriteriaEditor } from "@/components/CriteriaEditor";
import { getFunnel, listMetricDefs, listSnapshots, listSuggestions } from "@/lib/db";
import type { MetricDefinition, MetricSnapshot } from "@/lib/types";
import { fmtCurrency, fmtDate, fmtInt, fmtLift, fmtNum, fmtPct } from "@/lib/format";
import { CHANNEL_LABEL, RECO_LABEL, RECO_TONE, STATUS_LABEL, STATUS_TONE } from "@/lib/ui";

export const dynamic = "force-dynamic";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatMetricValue(def: MetricDefinition | undefined, snap: MetricSnapshot | undefined): string {
  if (!snap) return "—";
  if (!def) return fmtNum(snap.value);
  if (def.kind === "RATE") return fmtPct(snap.value);
  if (def.kind === "CURRENCY") return fmtCurrency(snap.value);
  if (def.kind === "RATIO") return def.unit === "BRL" ? fmtCurrency(snap.value, true) : fmtNum(snap.value);
  return fmtInt(snap.value);
}

const SERIES_COLORS = ["#00C86F", "#2DD4BF", "#38BDF8", "#A3E635"];

export default async function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const funnel = await getFunnel(params.id);
  if (!funnel) notFound();

  const { experiment: e, channel, variants, criteria, result: r } = funnel;
  const [metricDefs, suggestions] = await Promise.all([
    listMetricDefs(),
    listSuggestions(e.id),
  ]);
  const metricByKey = new Map(metricDefs.map((m) => [m.key, m]));
  const targetMetric = criteria ? metricByKey.get(criteria.targetMetricKey) : undefined;
  const isRate = targetMetric?.kind === "RATE";

  // Série temporal da métrica-alvo (uma linha por variante).
  const snaps = criteria ? await listSnapshots(e.id, criteria.targetMetricKey) : [];
  const variantName = new Map(variants.map((v) => [v.id, v.name]));
  const byDate = new Map<string, ChartPoint>();
  for (const s of snaps) {
    const label = shortDate(s.takenAt);
    const point = byDate.get(label) ?? ({ date: label } as ChartPoint);
    const name = variantName.get(s.variantId) ?? s.variantId;
    const val = isRate ? (s.denominator ? s.numerator! / s.denominator : 0) : s.value;
    point[name] = Math.round(val * 10000) / 10000;
    byDate.set(label, point);
  }
  const chartData = [...byDate.values()];
  let ci = 0;
  const series = variants.map((v) => ({
    key: v.name,
    color: v.isControl ? "#2E8BFF" : SERIES_COLORS[ci++ % SERIES_COLORS.length],
  }));

  // Métricas presentes (para a tabela), na ordem do catálogo.
  const present = new Set<string>();
  for (const v of variants) for (const k of Object.keys(funnel.latestMetrics[v.id] ?? {})) present.add(k);
  const orderedMetrics = metricDefs.filter((m) => present.has(m.key));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-psa-border px-8 py-6">
        <div className="min-w-0">
          <Link
            href="/experiments"
            className="mb-2 inline-flex items-center gap-1 text-xs text-psa-muted hover:text-psa-accent"
            prefetch={false}
          >
            <ArrowLeft size={13} /> Experimentos
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-psa-muted">
            {channel ? CHANNEL_LABEL[channel.kind] : "—"}
            {e.code && <span className="text-psa-border">·</span>}
            {e.code}
          </div>
          <h1 className="mt-1 font-display text-2xl tracking-tight text-white">{e.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Pill tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Pill>
            {r?.recommendation && (
              <Pill tone={RECO_TONE[r.recommendation]}>{RECO_LABEL[r.recommendation]}</Pill>
            )}
          </div>
        </div>
        <ExperimentActions experimentId={e.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Etapas 1 e 2 — editável */}
          <HypothesisCard
            experimentId={e.id}
            startedLabel={fmtDate(e.startedAt)}
            name={e.name}
            hypothesis={e.hypothesis}
            execution={e.execution}
            audience={e.audience}
          />

          {/* Etapa 3 — Números atuais por variante */}
          <section className="psa-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical size={16} className="text-psa-accent" />
              <h2 className="font-display text-lg tracking-tight text-white">Números atuais</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                    <th className="py-2 pr-4 font-semibold">Métrica</th>
                    {variants.map((v) => (
                      <th key={v.id} className="py-2 pr-4 font-semibold">
                        {v.name}
                        {v.isControl && <span className="ml-1 text-psa-muted">(controle)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedMetrics.map((m) => (
                    <tr key={m.key} className="border-b border-psa-border/50">
                      <td className="py-2 pr-4 text-psa-muted">{m.label}</td>
                      {variants.map((v) => {
                        const cell = funnel.latestMetrics[v.id]?.[m.key];
                        const isTarget = m.key === criteria?.targetMetricKey;
                        return (
                          <td
                            key={v.id}
                            className={isTarget ? "py-2 pr-4 font-semibold text-psa-accent" : "py-2 pr-4 text-white"}
                          >
                            {formatMetricValue(m, cell)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Registrar números — alimenta números, gráfico, decisão e retorno */}
          <RegisterNumbersForm
            experimentId={e.id}
            variants={variants.map((v) => ({ id: v.id, name: v.name, isControl: v.isControl }))}
            metricDefs={metricDefs}
            targetMetricKey={criteria?.targetMetricKey ?? null}
            latestMetrics={funnel.latestMetrics}
          />

          {/* Evolução */}
          {chartData.length > 0 && (
            <section className="psa-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-psa-accent" />
                <h2 className="font-display text-lg tracking-tight text-white">
                  Evolução · {targetMetric?.label ?? "métrica-alvo"}
                </h2>
              </div>
              <ExperimentChart data={chartData} series={series} isRate={!!isRate} />
            </section>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Etapa 5 — Decisão */}
          <section className="psa-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Target size={16} className="text-psa-accent" />
              <h2 className="font-display text-lg tracking-tight text-white">Quanto falta</h2>
            </div>
            {r ? (
              <div className="space-y-4 text-sm">
                {r.recommendation && (
                  <Pill tone={RECO_TONE[r.recommendation]}>{RECO_LABEL[r.recommendation]}</Pill>
                )}
                <div>
                  <div className="flex items-center justify-between text-xs text-psa-muted">
                    <span>Confiança atual</span>
                    <span className="font-semibold text-white">{fmtPct(r.confidence)}</span>
                  </div>
                  <ProgressBar
                    pct={r.confidence != null ? r.confidence * 100 : 0}
                    tone={r.isSignificant ? "success" : "warning"}
                    className="mt-1"
                  />
                  <div className="mt-1 text-[11px] text-psa-muted">
                    Alvo: {fmtPct(criteria?.confidenceLevel)} de confiança ·{" "}
                    {r.isSignificant ? "atingido" : "não atingido"}
                  </div>
                </div>
                {isRate && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-psa-muted">
                      <span>Progresso de amostra</span>
                      <span className="font-semibold text-white">{fmtPct((r.progressPct ?? 0) / 100, 0)}</span>
                    </div>
                    <ProgressBar pct={r.progressPct} tone="accent" className="mt-1" />
                    <div className="mt-1 text-[11px] text-psa-muted">
                      {r.remainingNPerArm != null && r.remainingNPerArm > 0
                        ? `Faltam ~${fmtInt(r.remainingNPerArm)} por braço (necessário ~${fmtInt(r.requiredNPerArm)})`
                        : "Amostra suficiente para decidir"}
                    </div>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-3 border-t border-psa-border pt-3 text-xs">
                  <div>
                    <dt className="text-psa-muted">Lift relativo</dt>
                    <dd className="font-semibold text-white">{fmtLift(r.relativeLift)}</dd>
                  </div>
                  <div>
                    <dt className="text-psa-muted">MDE (mín.)</dt>
                    <dd className="font-semibold text-white">{fmtPct(criteria?.minDetectableEffect)}</dd>
                  </div>
                  <div>
                    <dt className="text-psa-muted">p-valor</dt>
                    <dd className="font-semibold text-white">{r.pValue != null ? fmtNum(r.pValue) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-psa-muted">z-score</dt>
                    <dd className="font-semibold text-white">{r.zScore != null ? fmtNum(r.zScore) : "—"}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-psa-muted">Sem resultado calculado. Clique em “Recalcular”.</p>
            )}
            {criteria && (
              <CriteriaEditor
                experimentId={e.id}
                mde={criteria.minDetectableEffect}
                confidence={criteria.confidenceLevel}
              />
            )}
          </section>

          {/* Etapa 4 — Retorno */}
          <section className="psa-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Coins size={16} className="text-psa-accent" />
              <h2 className="font-display text-lg tracking-tight text-white">Retorno</h2>
            </div>
            {r ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Leads" value={fmtInt(r.leadsAttributed)} />
                <Metric label="MQL" value={fmtInt(r.mqlAttributed)} />
                <Metric label="SQL" value={fmtInt(r.sqlAttributed)} />
                <Metric label="Negócios" value={fmtInt(r.dealsAttributed)} />
                <Metric label="Receita" value={fmtCurrency(r.revenueAttributed)} />
                <Metric label="Investimento" value={fmtCurrency(r.costTotal)} />
                {r.cac != null && <Metric label="CAC" value={fmtCurrency(r.cac, true)} />}
              </div>
            ) : (
              <p className="text-sm text-psa-muted">—</p>
            )}
          </section>

          {/* Sugestões de IA */}
          <section className="psa-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-psa-accent" />
              <h2 className="font-display text-lg tracking-tight text-white">Sugestões da IA</h2>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm text-psa-muted">
                Nenhuma sugestão ainda. Clique em “Gerar sugestões” no topo.
              </p>
            ) : (
              <ul className="space-y-3">
                {suggestions.map((s) => (
                  <li key={s.id} className="rounded-lg bg-white/5 p-3">
                    <div className="text-sm font-semibold text-white">{s.title}</div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-psa-muted">{s.body}</p>
                    {s.expectedImpact && (
                      <div className="mt-2 text-[11px] text-psa-success">Impacto esperado: {s.expectedImpact}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-psa-muted">{label}</div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}
