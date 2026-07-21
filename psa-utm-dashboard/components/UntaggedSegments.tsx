import Link from 'next/link';
import { Section } from './Section';
import type { Dataset, SegmentDimension } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');

export function UntaggedSegments({ data }: { data: Dataset }) {
  return (
    <Section
      eyebrow="Inteligência de UTM"
      title="Onde estão concentrados os leads sem UTM"
      description="Pra cada dimensão (canal, etapa do funil, produto, origem), o dash mostra os maiores buracos. Clique em qualquer linha pra abrir a lista de contatos daquele segmento — cada contato vai pro HubSpot."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.untaggedSegments.map((seg) => (
          <SegmentBlock key={seg.dim} seg={seg} period={data.period} objectType={data.objectType} />
        ))}
      </div>
    </Section>
  );
}

function SegmentBlock({ seg, period, objectType }: { seg: SegmentDimension; period: string; objectType: string }) {
  const total = seg.buckets.reduce((a, b) => a + b.count, 0) || 1;
  const top = seg.buckets[0];

  return (
    <div className="border border-psa-line rounded-2xl p-5 bg-white">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-psa-ink">{seg.title}</h3>
        {top && (
          <span className="text-[10px] uppercase tracking-wider text-psa-mute">
            #1 · <span className="text-psa-bad font-semibold">{fmt.format(top.count)}</span> leads
          </span>
        )}
      </div>
      <p className="text-[12px] text-psa-mute mb-4 leading-snug">{seg.description}</p>
      {seg.buckets.length === 0 ? (
        <p className="text-sm text-psa-mute italic">Nada na amostra desta dimensão.</p>
      ) : (
        <ul className="space-y-1.5">
          {seg.buckets.map((b) => {
            const pct = (b.count / total) * 100;
            return (
              <li key={b.key}>
                <Link
                  href={`/segment/${seg.dim}/${encodeURIComponent(b.key)}?period=${period}&obj=${objectType}`}
                  prefetch={false}
                  className="block group rounded-lg px-2 -mx-2 py-1.5 hover:bg-psa-bg transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-psa-ink truncate group-hover:text-psa-accent">{b.label}</span>
                    <span className="flex items-baseline gap-2 shrink-0">
                      <span className="mono text-xs text-psa-mute tabular-nums">{fmt.format(b.count)}</span>
                      <span className="text-[10px] text-psa-mute tabular-nums">{pct.toFixed(1)}%</span>
                      <span className="text-psa-mute group-hover:text-psa-accent text-xs">→</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-psa-line/60 overflow-hidden">
                    <div className="h-full bg-psa-accent/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
