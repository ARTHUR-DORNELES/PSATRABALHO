import Link from 'next/link';
import { Section } from './Section';
import type { Dataset } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');

export function TopLists({ data }: { data: Dataset }) {
  const params = `period=${data.period}&obj=${data.objectType}`;
  const period = data.period;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Section
        eyebrow="utm_source"
        title="Top sources"
        description="De onde os leads estão dizendo que vieram. Marcado verde quando o nome bate com o padrão PSA. Clique pra ver os leads de cada source."
      >
        <List
          rows={data.topSources.map((s) => ({
            name: s.name,
            count: s.count,
            ok: s.isCanonical,
            okLabel: 'canônico',
            badLabel: 'fora do padrão',
            href: `/segment/utm_source/${encodeURIComponent(s.name)}?${params}`,
          }))}
          emptyMsg="Nenhum source na amostra taggeada."
        />
      </Section>

      <Section
        eyebrow="utm_medium"
        title="Top mediums"
        description="Tipo de canal. Só 4 valores são válidos: social, paid_social, cpc, email. Clique pra abrir a lista de leads daquele medium."
      >
        <List
          rows={data.topMediums.map((m) => ({
            name: m.name,
            count: m.count,
            ok: m.isValid,
            okLabel: 'válido',
            badLabel: 'inválido',
            href: `/segment/utm_medium/${encodeURIComponent(m.name)}?${params}`,
          }))}
          emptyMsg="Nenhum medium na amostra taggeada."
        />
      </Section>

      <Section
        eyebrow="utm_campaign"
        title="Top campaigns"
        description="Campanhas ativas no período. O badge ⚠ mostra quantos leads daquela campanha vieram com source/medium fora do padrão. Clique pra abrir os leads."
      >
        <ul className="space-y-2">
          {data.topCampaigns.length === 0 && <li className="text-sm text-psa-mute italic">Nenhuma campanha na amostra.</li>}
          {data.topCampaigns.map((c) => (
            <li key={c.name}>
              <Link
                href={`/segment/utm_campaign/${encodeURIComponent(c.name)}?${params}`}
                prefetch={false}
                className="group flex items-center justify-between gap-2 py-0.5 px-1 -mx-1 rounded hover:bg-psa-bg"
              >
                <span className="mono text-[12px] text-psa-ink truncate group-hover:text-psa-accent" title={c.name}>{c.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {c.nonStandardCount > 0 && (
                    <span className="pill-warn" title={`${c.nonStandardCount} leads com medium/source fora do padrão`}>
                      ⚠ {fmt.format(c.nonStandardCount)}
                    </span>
                  )}
                  <span className="mono text-xs text-psa-mute tabular-nums">{fmt.format(c.count)}</span>
                  <span className="text-psa-mute group-hover:text-psa-accent text-xs">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function List({ rows, emptyMsg }: {
  rows: { name: string; count: number; ok: boolean; okLabel: string; badLabel: string; href: string }[];
  emptyMsg: string;
}) {
  return (
    <ul className="space-y-1">
      {rows.length === 0 && <li className="text-sm text-psa-mute italic">{emptyMsg}</li>}
      {rows.map((r) => (
        <li key={r.name}>
          <Link
            href={r.href}
            prefetch={false}
            className="group flex items-center justify-between gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-psa-bg"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="mono text-[12px] text-psa-ink truncate group-hover:text-psa-accent" title={r.name}>{r.name || '(vazio)'}</span>
              <span className={r.ok ? 'pill-good' : 'pill-bad'}>{r.ok ? r.okLabel : r.badLabel}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="mono text-xs text-psa-mute tabular-nums">{fmt.format(r.count)}</span>
              <span className="text-psa-mute group-hover:text-psa-accent text-xs">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
