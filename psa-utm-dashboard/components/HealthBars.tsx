import { Section } from './Section';
import type { Dataset } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');

export function HealthBars({ data }: { data: Dataset }) {
  const total = data.totals.leads;
  const tagged = data.coverage.withUtm;
  const untagged = data.coverage.withoutUtm;

  // Distribuição dentro da amostra extrapolada para todo o tagged
  const sample = data.completeness.tagged || 1;
  const scale = sample > 0 ? tagged / sample : 1;
  const complete   = Math.round(data.totals.complete * scale);
  const incomplete = Math.round(data.totals.incomplete * scale);
  const completeAdj = Math.min(complete, tagged);
  const residual = Math.max(0, tagged - completeAdj - incomplete);

  const segments = [
    {
      label: 'UTM completa',
      value: completeAdj,
      bar: 'bg-psa-good',
      dot: 'bg-psa-good',
      desc: 'atende a regra de completude do source (ex.: facebook → source + campaign)',
    },
    {
      label: 'Incompleta',
      value: incomplete + residual,
      bar: 'bg-psa-warn',
      dot: 'bg-psa-warn',
      desc: 'tem utm_source mas falta o campaign exigido pela regra do source',
    },
    {
      label: 'Sem UTM',
      value: untagged,
      bar: 'bg-psa-bad',
      dot: 'bg-psa-bad',
      desc: 'utm_source vazio · HubSpot atribui a Direct/Other Campaigns',
    },
  ];
  const all = segments.reduce((a, s) => a + s.value, 0) || 1;

  // Métrica secundária: source não canônico (orthogonal — pode até estar "completa")
  const nonCanonicalExtrap = Math.round(data.totals.nonCanonical * scale);

  return (
    <Section
      eyebrow="Distribuição"
      title="Como os leads estão distribuídos por estado de UTM"
      description={`Total ${fmt.format(total)} leads. Os estados Completa / Incompleta vêm da amostra taggeada (${fmt.format(data.completeness.tagged)} leads) e são extrapolados. Regra: organico → só source basta; facebook/linkedin/google + outros → source + campaign.`}
    >
      <div className="flex h-3 rounded-full overflow-hidden bg-psa-line/40">
        {segments.map((s, i) => (
          <div
            key={i}
            className={s.bar}
            style={{ width: `${(s.value / all) * 100}%` }}
            title={`${s.label}: ${fmt.format(s.value)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        {segments.map((s, i) => {
          const p = ((s.value / all) * 100).toFixed(1);
          return (
            <div key={i} className="flex gap-2.5">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-psa-mute">{s.label}</div>
                <div className="text-2xl font-semibold tracking-tight">{fmt.format(s.value)}<span className="text-sm text-psa-mute font-normal ml-1.5">· {p}%</span></div>
                <div className="text-[11px] text-psa-mute mt-1 leading-snug">{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      {nonCanonicalExtrap > 0 && (
        <div className="mt-5 pt-4 border-t border-psa-line text-[12px] text-psa-mute leading-snug">
          <span className="text-[10px] uppercase tracking-[0.16em] text-psa-warn font-semibold mr-2">Alerta paralelo</span>
          <span className="text-psa-ink font-medium mono">{fmt.format(nonCanonicalExtrap)}</span> com source <em>não canônico</em> (adwords, hs_email, etc.) — esses podem estar "completos" pela regra mas vão pra Other Campaigns no HubSpot.
        </div>
      )}
    </Section>
  );
}
