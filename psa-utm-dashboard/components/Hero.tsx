import type { Dataset } from '@/lib/data';

const nfmt = new Intl.NumberFormat('pt-BR');
const fmt = (n: number) => nfmt.format(n);
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;

export function Hero({ data }: { data: Dataset }) {
  const c = data.coverage.pct;
  const tone =
    c >= 0.8 ? { label: 'Saudável',  text: 'text-psa-good', dot: 'bg-psa-good' } :
    c >= 0.5 ? { label: 'Mediano',   text: 'text-psa-warn', dot: 'bg-psa-warn' } :
               { label: 'Crítico',   text: 'text-psa-bad',  dot: 'bg-psa-bad' };

  const negativeCount = data.insights.filter((i) => i.tone !== 'positive').length;
  const positiveCount = data.insights.filter((i) => i.tone === 'positive').length;

  return (
    <section className="bg-white border border-psa-line rounded-3xl px-8 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-block w-2 h-2 rounded-full ${tone.dot}`} />
            <span className={`text-[11px] uppercase tracking-[0.22em] font-semibold ${tone.text}`}>
              {tone.label} · cobertura de UTM
            </span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-7xl font-semibold tracking-tight ${tone.text}`}>{pctFmt(c)}</span>
            <span className="text-base text-psa-mute">
              {fmt(data.coverage.withUtm)} de {fmt(data.totals.leads)} leads com UTM
            </span>
          </div>
          <p className="text-sm text-psa-mute mt-3 max-w-xl">
            {c < 0.3
              ? `Praticamente toda aquisição da PSA nos últimos ${data.period} está chegando sem UTM. O HubSpot está classificando ${fmt(data.coverage.withoutUtm)} leads como Direct ou Other Campaigns.`
              : c < 0.7
              ? `Parte significativa da aquisição não está sendo atribuída a canal. ${fmt(data.coverage.withoutUtm)} leads chegaram sem UTM nesta janela.`
              : `A maior parte da aquisição está sendo atribuída corretamente. Continue padronizando os ${fmt(data.coverage.withoutUtm)} que ainda chegam sem UTM.`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-right">
          <Stat label="Completude na amostra" value={pctFmt(data.completeness.pct)} sub={`${fmt(data.completeness.complete)}/${fmt(data.completeness.tagged)} atendem a regra do source`} />
          <Stat label="Insights críticos" value={fmt(negativeCount)} sub="ver lista abaixo" tone="bad" />
          <Stat label="Insights positivos" value={fmt(positiveCount)} sub="o que manter" tone="good" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'good' | 'bad' }) {
  const textColor = tone === 'good' ? 'text-psa-good' : tone === 'bad' ? 'text-psa-bad' : 'text-psa-ink';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-psa-mute mb-1">{label}</div>
      <div className={`text-3xl font-semibold ${textColor}`}>{value}</div>
      <div className="text-[11px] text-psa-mute mt-1">{sub}</div>
    </div>
  );
}
