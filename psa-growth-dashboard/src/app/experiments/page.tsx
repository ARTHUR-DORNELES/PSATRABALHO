import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { listChannels, listFunnels, listMetricDefs } from "@/lib/db";
import { fmtLift, fmtPct } from "@/lib/format";
import { CHANNEL_LABEL, RECO_LABEL, RECO_TONE, STATUS_LABEL, STATUS_TONE } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: { channel?: string };
}) {
  const [funnels, channels, metricDefs] = await Promise.all([
    listFunnels(),
    listChannels(),
    listMetricDefs(),
  ]);
  const metricByKey = new Map(metricDefs.map((m) => [m.key, m]));
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const filterKey = searchParams.channel;
  const filtered = filterKey
    ? funnels.filter((f) => channelById.get(f.experiment.channelId)?.key === filterKey)
    : funnels;

  return (
    <>
      <PageHeader
        title="Experimentos"
        subtitle="Todos os testes de aquisição, do mais recente ao mais antigo."
        actions={
          <Link href="/experiments/new" className="psa-btn-primary" prefetch={false}>
            <Plus size={16} /> Novo experimento
          </Link>
        }
      />
      <div className="space-y-4 p-8">
        {/* Filtro por canal */}
        <div className="flex flex-wrap gap-2">
          <FilterPill label="Todos" href="/experiments" active={!filterKey} />
          {channels.map((c) => (
            <FilterPill
              key={c.id}
              label={CHANNEL_LABEL[c.kind]}
              href={`/experiments?channel=${c.key}`}
              active={filterKey === c.key}
            />
          ))}
        </div>

        <div className="psa-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                <th className="px-4 py-3 font-semibold">Experimento</th>
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold">Métrica-alvo</th>
                <th className="px-4 py-3 font-semibold">Lift</th>
                <th className="px-4 py-3 font-semibold">Confiança</th>
                <th className="px-4 py-3 font-semibold">Recomendação</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const ch = channelById.get(f.experiment.channelId);
                const tm = f.criteria ? metricByKey.get(f.criteria.targetMetricKey) : undefined;
                return (
                  <tr key={f.experiment.id} className="border-b border-psa-border/50 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link
                        href={`/experiments/${f.experiment.id}`}
                        className="font-medium text-white hover:text-psa-accent"
                        prefetch={false}
                      >
                        {f.experiment.name}
                      </Link>
                      {f.experiment.code && (
                        <div className="text-[11px] text-psa-muted">{f.experiment.code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-psa-muted">{ch ? CHANNEL_LABEL[ch.kind] : "—"}</td>
                    <td className="px-4 py-3 text-psa-muted">{tm?.label ?? "—"}</td>
                    <td
                      className={clsx(
                        "px-4 py-3 font-semibold",
                        (f.result?.relativeLift ?? 0) > 0 ? "text-psa-success" : "text-psa-muted",
                      )}
                    >
                      {fmtLift(f.result?.relativeLift)}
                    </td>
                    <td className="px-4 py-3 text-white">{fmtPct(f.result?.confidence)}</td>
                    <td className="px-4 py-3">
                      {f.result?.recommendation && (
                        <Pill tone={RECO_TONE[f.result.recommendation]}>
                          {RECO_LABEL[f.result.recommendation]}
                        </Pill>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[f.experiment.status]}>
                        {STATUS_LABEL[f.experiment.status]}
                      </Pill>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-psa-muted">
                    Nenhum experimento neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function FilterPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active ? "bg-psa-accent text-white" : "bg-white/5 text-psa-muted hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}
