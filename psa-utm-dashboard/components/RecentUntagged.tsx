import { Section } from './Section';
import type { Dataset } from '@/lib/data';

export function RecentUntagged({ data }: { data: Dataset }) {
  if (data.recentUntagged.length === 0) return null;
  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return s; }
  };
  return (
    <Section
      eyebrow="Auditoria · contato a contato"
      title="Leads recentes sem UTM"
      description="Os 25 leads sem UTM mais recentes da amostra. Cada linha é clicável: a landing abre a página, o ícone HubSpot abre o contato no CRM pra você atualizar ou taggear manualmente."
    >
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
              <th className="py-2 px-2 font-medium">Quando</th>
              <th className="py-2 px-2 font-medium">Contato</th>
              <th className="py-2 px-2 font-medium">Lifecycle</th>
              <th className="py-2 px-2 font-medium">Produto</th>
              <th className="py-2 px-2 font-medium">Landing</th>
              <th className="py-2 px-2 font-medium">Referrer</th>
              <th className="py-2 px-2 font-medium">UTM sugerida</th>
            </tr>
          </thead>
          <tbody>
            {data.recentUntagged.map((r) => (
              <tr key={r.id} className="border-b border-psa-line/60 hover:bg-psa-bg/60">
                <td className="py-2.5 px-2 mono text-[11px] text-psa-mute whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-2.5 px-2">
                  <a
                    href={r.hubspotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mono text-[11px] text-psa-accent hover:underline"
                    title="Abrir contato no HubSpot"
                  >
                    #{r.id.slice(-6)}
                    <span aria-hidden className="text-[9px]">↗</span>
                  </a>
                </td>
                <td className="py-2.5 px-2 text-[11px] text-psa-mute">{r.lifecycleStage}</td>
                <td className="py-2.5 px-2">
                  <div className="flex flex-wrap gap-1">
                    {r.productHints.length === 0
                      ? <span className="text-[11px] text-psa-mute italic">—</span>
                      : r.productHints.map((h) => (
                          <span key={h} className="mono text-[10px] bg-psa-accent-soft text-psa-accent px-1.5 py-0.5 rounded">{h}</span>
                        ))
                    }
                  </div>
                </td>
                <td className="py-2.5 px-2 max-w-[200px] truncate">
                  <a
                    href={r.landingHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-[12px] text-psa-accent hover:underline"
                    title={r.landingHref}
                  >
                    {r.landing}
                  </a>
                </td>
                <td className="py-2.5 px-2 mono text-[12px] text-psa-mute">
                  {r.referrerHref ? (
                    <a href={r.referrerHref} target="_blank" rel="noopener noreferrer" className="hover:underline">{r.referrer}</a>
                  ) : (
                    r.referrer
                  )}
                </td>
                <td className="py-2.5 px-2">
                  {r.suggested ? (
                    <span className="mono text-[11px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded whitespace-nowrap">
                      {r.suggested.utm_source} / {r.suggested.utm_medium}
                    </span>
                  ) : (
                    <span className="text-[11px] text-psa-mute italic">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
