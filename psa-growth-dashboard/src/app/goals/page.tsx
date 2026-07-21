import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { GoalForm } from "@/components/GoalForm";
import { listChannels, listGoals, listMetricDefs } from "@/lib/db";
import { fmtByKind, fmtMonth, fmtPct } from "@/lib/format";
import { GOAL_LABEL, GOAL_TONE, type Tone } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, channels, metrics] = await Promise.all([
    listGoals(),
    listChannels(),
    listMetricDefs(),
  ]);
  const channelById = new Map(channels.map((c) => [c.id, c]));
  const metricByKey = new Map(metrics.map((m) => [m.key, m]));
  const months = [...new Set(goals.map((g) => g.referenceMonth))].sort().reverse();

  return (
    <>
      <PageHeader
        title="Metas de aquisição"
        subtitle="Meta vs. realizado por canal e mês — onde estamos vs. onde precisamos chegar."
      />
      <div className="space-y-6 p-8">
        <GoalForm channels={channels} metrics={metrics} />

        {months.length === 0 && (
          <div className="psa-card p-10 text-center text-psa-muted">Nenhuma meta definida ainda.</div>
        )}

        {months.map((month) => {
          const rows = goals.filter((g) => g.referenceMonth === month);
          return (
            <section key={month}>
              <h2 className="mb-2 font-display text-lg capitalize tracking-tight text-white">
                {fmtMonth(month)}
              </h2>
              <div className="psa-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                      <th className="px-4 py-3 font-semibold">Canal</th>
                      <th className="px-4 py-3 font-semibold">Métrica</th>
                      <th className="px-4 py-3 font-semibold">Meta</th>
                      <th className="px-4 py-3 font-semibold">Realizado</th>
                      <th className="px-4 py-3 font-semibold">Progresso</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((g) => {
                      const def = metricByKey.get(g.metricKey);
                      const pct = g.targetValue > 0 ? (g.actualValue / g.targetValue) * 100 : 0;
                      return (
                        <tr key={g.id} className="border-b border-psa-border/50">
                          <td className="px-4 py-3 text-white">
                            {g.channelId ? channelById.get(g.channelId)?.name ?? "—" : "Todos (agregado)"}
                          </td>
                          <td className="px-4 py-3 text-psa-muted">{def?.label ?? g.metricKey}</td>
                          <td className="px-4 py-3 text-psa-muted">
                            {fmtByKind(g.targetValue, def?.kind ?? "COUNT", def?.unit)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {fmtByKind(g.actualValue, def?.kind ?? "COUNT", def?.unit)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <ProgressBar
                                pct={pct}
                                tone={(GOAL_TONE[g.status] ?? "info") as Tone}
                                className="w-28"
                              />
                              <span className="text-xs text-psa-muted">{fmtPct(pct / 100, 0)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone={GOAL_TONE[g.status]}>{GOAL_LABEL[g.status]}</Pill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
