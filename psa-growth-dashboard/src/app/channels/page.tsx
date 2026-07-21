import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { listChannels } from "@/lib/db";
import { CHANNEL_LABEL } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await listChannels();
  return (
    <>
      <PageHeader
        title="Canais"
        subtitle="Fontes de aquisição e o mapeamento usado pelas integrações (HubSpot, N8N, Ads)."
      />
      <div className="p-8">
        <div className="psa-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                <th className="px-4 py-3 font-semibold">Canal</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Sistema-fonte</th>
                <th className="px-4 py-3 font-semibold">Mapeamento</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id} className="border-b border-psa-border/50">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-psa-muted">{CHANNEL_LABEL[c.kind]}</td>
                  <td className="px-4 py-3 text-psa-muted">{c.sourceSystem}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-psa-muted">
                      {JSON.stringify(c.sourceConfig)}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={c.active ? "success" : "muted"}>{c.active ? "Ativo" : "Inativo"}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
