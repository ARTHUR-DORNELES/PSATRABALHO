import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { BenchmarkForm } from "@/components/BenchmarkForm";
import { DeleteButton } from "@/components/DeleteButton";
import { listBenchmarks, listChannels, listMetricDefs } from "@/lib/db";
import { fmtByKind } from "@/lib/format";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  INTERNAL_HISTORICAL: "Interno",
  MARKET: "Mercado",
};

export default async function BenchmarksPage() {
  const [benchmarks, channels, metrics] = await Promise.all([
    listBenchmarks(),
    listChannels(),
    listMetricDefs(),
  ]);
  const channelById = new Map(channels.map((c) => [c.id, c]));
  const metricByKey = new Map(metrics.map((m) => [m.key, m]));

  return (
    <>
      <PageHeader
        title="Benchmarks"
        subtitle="Referências para comparar os resultados — histórico interno da PSA e mercado."
      />
      <div className="space-y-6 p-8">
        <BenchmarkForm channels={channels} metrics={metrics} />

        <div className="psa-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold">Métrica</th>
                <th className="px-4 py-3 font-semibold">Valor</th>
                <th className="px-4 py-3 font-semibold">Faixa</th>
                <th className="px-4 py-3 font-semibold">Fonte</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => {
                const def = metricByKey.get(b.metricKey);
                const kind = def?.kind ?? "RATE";
                return (
                  <tr key={b.id} className="border-b border-psa-border/50">
                    <td className="px-4 py-3">
                      <Pill tone={b.kind === "MARKET" ? "info" : "muted"}>{KIND_LABEL[b.kind]}</Pill>
                    </td>
                    <td className="px-4 py-3 text-psa-muted">
                      {b.channelId ? channelById.get(b.channelId)?.name ?? "—" : "Qualquer"}
                    </td>
                    <td className="px-4 py-3 text-psa-muted">{def?.label ?? b.metricKey}</td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {fmtByKind(b.value, kind, def?.unit)}
                    </td>
                    <td className="px-4 py-3 text-psa-muted">
                      {b.low != null && b.high != null
                        ? `${fmtByKind(b.low, kind, def?.unit)} – ${fmtByKind(b.high, kind, def?.unit)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-psa-muted">{b.source ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteButton url={`/api/benchmarks?id=${b.id}`} />
                    </td>
                  </tr>
                );
              })}
              {benchmarks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-psa-muted">
                    Nenhum benchmark cadastrado.
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
