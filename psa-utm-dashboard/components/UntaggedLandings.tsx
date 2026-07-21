import { Section } from './Section';
import type { Dataset } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');

export function UntaggedLandings({ data }: { data: Dataset }) {
  return (
    <Section
      eyebrow="Mapa de buracos"
      title="Onde leads chegam sem UTM"
      description="Combinações de landing × referrer ranqueadas por volume na amostra não-taggeada. Cada linha é um ponto de publicação que provavelmente está sem UTM — a coluna 'Onde aplicar' diz por onde começar."
    >
      {data.untaggedLandings.length === 0 ? (
        <p className="text-sm text-psa-mute italic">Nenhuma combinação detectada na amostra.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
                <th className="py-2 px-2 font-medium">Landing</th>
                <th className="py-2 px-2 font-medium">Referrer</th>
                <th className="py-2 px-2 font-medium text-right">Leads sem UTM</th>
                <th className="py-2 px-2 font-medium">UTM sugerida</th>
                <th className="py-2 px-2 font-medium">Onde aplicar a correção</th>
              </tr>
            </thead>
            <tbody>
              {data.untaggedLandings.map((row, i) => (
                <tr key={i} className="border-b border-psa-line/60 align-top hover:bg-psa-bg/60">
                  <td className="py-2.5 px-2 max-w-[260px] truncate">
                    <a
                      href={row.landingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-[12px] text-psa-accent hover:underline"
                      title={row.landingHref}
                    >
                      {row.landing}
                    </a>
                  </td>
                  <td className="py-2.5 px-2 mono text-[12px] text-psa-mute">
                    {row.referrerHref ? (
                      <a href={row.referrerHref} target="_blank" rel="noopener noreferrer" className="hover:underline" title={row.referrerHref}>
                        {row.referrer}
                      </a>
                    ) : (
                      row.referrer
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right mono tabular-nums font-semibold text-psa-ink">{fmt.format(row.count)}</td>
                  <td className="py-2.5 px-2">
                    {row.suggested ? (
                      <span className="mono text-[11px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded">
                        {row.suggested.utm_source} / {row.suggested.utm_medium}
                      </span>
                    ) : (
                      <span className="text-[11px] text-psa-mute italic">sem sugestão automática</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-[12px] text-psa-smoke leading-snug">
                    {row.suggested?.applyAt ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
