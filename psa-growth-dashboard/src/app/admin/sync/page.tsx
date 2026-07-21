import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { SyncButton } from "@/components/SyncButton";
import { listSyncRuns } from "@/lib/db";
import type { Tone } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  SUCCESS: "Sucesso",
  FAILED: "Falhou",
  PARTIAL: "Parcial",
};
const STATUS_TONE: Record<string, Tone> = {
  PENDING: "muted",
  SUCCESS: "success",
  FAILED: "danger",
  PARTIAL: "warning",
};

function duration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function SyncPage() {
  const runs = await listSyncRuns(30);
  return (
    <>
      <PageHeader
        title="Sincronização"
        subtitle="Execuções de coleta de dados. HubSpot/Ads chegam por pull (cron); WhatsApp por webhook do N8N."
        actions={<SyncButton />}
      />
      <div className="space-y-4 p-8">
        <div className="psa-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                <th className="px-4 py-3 font-semibold">Início</th>
                <th className="px-4 py-3 font-semibold">Origem</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Experimentos</th>
                <th className="px-4 py-3 font-semibold">Snapshots</th>
                <th className="px-4 py-3 font-semibold">Duração</th>
                <th className="px-4 py-3 font-semibold">Origem do gatilho</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-psa-border/50">
                  <td className="px-4 py-3 text-psa-muted">
                    {new Date(r.startedAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-white">{r.sourceSystem}</td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_TONE[r.status] ?? "muted"}>{STATUS_LABEL[r.status] ?? r.status}</Pill>
                  </td>
                  <td className="px-4 py-3 text-white">{r.experimentsTouched}</td>
                  <td className="px-4 py-3 text-white">{r.snapshotsWritten}</td>
                  <td className="px-4 py-3 text-psa-muted">{duration(r.startedAt, r.finishedAt)}</td>
                  <td className="px-4 py-3 text-psa-muted">{r.triggeredBy ?? "—"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-psa-muted">
                    Nenhuma sincronização ainda. Clique em “Sincronizar agora”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="psa-card p-4 text-xs leading-relaxed text-psa-muted">
          <strong className="text-psa-ice">Como os dados entram:</strong> o WhatsApp (N8N) faz{" "}
          <code className="rounded bg-white/5 px-1">POST /api/webhooks/n8n</code> com os contadores do disparo.
          HubSpot e mídia paga são coletados pelo cron (GitHub Actions → <code className="rounded bg-white/5 px-1">npm run sync</code>{" "}
          ou <code className="rounded bg-white/5 px-1">GET /api/cron/refresh</code>). Cada coleta vira um snapshot append-only e dispara o recálculo da decisão.
        </div>
      </div>
    </>
  );
}
