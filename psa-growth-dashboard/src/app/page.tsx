import Link from "next/link";
import { Plus, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FunnelCard } from "@/components/FunnelCard";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { listFunnels, listGoals, listMetricDefs } from "@/lib/db";
import { fmtCurrency, fmtInt, fmtPct } from "@/lib/format";
import { RECO_LABEL, RECO_TONE } from "@/lib/ui";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="psa-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-psa-muted">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-semibold leading-none tracking-tight psa-grad-text">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-psa-muted">{sub}</div>}
      {children}
    </div>
  );
}

export default async function HomePage() {
  const [funnels, metricDefs, goals] = await Promise.all([
    listFunnels(),
    listMetricDefs(),
    listGoals(),
  ]);
  const metricByKey = new Map(metricDefs.map((m) => [m.key, m]));

  const active = funnels.filter((f) => f.experiment.status === "RUNNING");
  const ready = funnels.filter((f) => f.result?.recommendation === "DECLARE_WINNER");
  const actionable = funnels.filter(
    (f) =>
      f.result?.recommendation === "DECLARE_WINNER" ||
      f.result?.recommendation === "STOP_NO_EFFECT",
  );
  const totalLeads = funnels.reduce((s, f) => s + (f.result?.leadsAttributed ?? 0), 0);
  const totalRevenue = funnels.reduce((s, f) => s + (f.result?.revenueAttributed ?? 0), 0);

  // Meta agregada de leads (channel null), mês mais recente disponível.
  const leadGoals = goals
    .filter((g) => g.channelId === null && g.metricKey === "leads")
    .sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));
  const leadGoal = leadGoals[0] ?? null;
  const goalPct = leadGoal ? (leadGoal.actualValue / leadGoal.targetValue) * 100 : null;

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Experimentos ativos, retorno e o que falta para cada teste virar oficial."
        actions={
          <Link href="/experiments/new" className="psa-btn-primary" prefetch={false}>
            <Plus size={16} /> Novo experimento
          </Link>
        }
      />

      <div className="space-y-8 p-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            label="Experimentos ativos"
            value={fmtInt(active.length)}
            sub={`${ready.length} prontos para oficializar`}
          />
          <Kpi label="Leads gerados (testes)" value={fmtInt(totalLeads)} sub="atribuídos aos experimentos" />
          <Kpi label="Receita influenciada" value={fmtCurrency(totalRevenue)} sub="soma dos testes ativos" />
          <Kpi
            label="Meta de leads (mês)"
            value={leadGoal ? fmtInt(leadGoal.actualValue) : "—"}
            sub={leadGoal ? `de ${fmtInt(leadGoal.targetValue)} · ${fmtPct((goalPct ?? 0) / 100, 0)}` : undefined}
          >
            {leadGoal && (
              <ProgressBar
                pct={goalPct}
                tone={goalPct && goalPct >= 90 ? "success" : goalPct && goalPct >= 60 ? "info" : "warning"}
                className="mt-2"
              />
            )}
          </Kpi>
        </section>

        {/* Ações recomendadas */}
        {actionable.length > 0 && (
          <section className="psa-card border-psa-accent/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-psa-accent" />
              <h2 className="font-display text-lg tracking-tight text-white">Ações recomendadas</h2>
            </div>
            <ul className="space-y-2">
              {actionable.map((f) => (
                <li
                  key={f.experiment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Pill tone={RECO_TONE[f.result!.recommendation!]}>
                      {RECO_LABEL[f.result!.recommendation!]}
                    </Pill>
                    <span className="text-sm text-white">{f.experiment.name}</span>
                  </div>
                  <Link
                    href={`/experiments/${f.experiment.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-psa-muted hover:text-psa-accent"
                    prefetch={false}
                  >
                    Revisar <ArrowRight size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Funis */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-psa-accent" />
            <h2 className="font-display text-lg tracking-tight text-white">
              Experimentos em andamento
            </h2>
          </div>
          {funnels.length === 0 ? (
            <div className="psa-card p-10 text-center text-psa-muted">
              Nenhum experimento ainda.{" "}
              <Link href="/experiments/new" className="text-psa-accent hover:underline">
                Criar o primeiro
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-4">
              {funnels.map((f) => (
                <FunnelCard
                  key={f.experiment.id}
                  funnel={f}
                  targetMetric={
                    f.criteria ? (metricByKey.get(f.criteria.targetMetricKey) ?? null) : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
