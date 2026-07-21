import Link from 'next/link';
import { OBJECT_LIST_URL, OBJECT_LABELS, OBJECT_NOUN_PLURAL, type Dataset } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function KpiCards({ data }: { data: Dataset }) {
  const coverageTone = data.coverage.pct >= 0.8 ? 'good' : data.coverage.pct >= 0.5 ? 'warn' : 'bad';
  const completenessTone = data.completeness.pct >= 0.9 ? 'good' : data.completeness.pct >= 0.7 ? 'warn' : 'bad';

  type Tone = 'good' | 'warn' | 'bad' | 'neutral';
  type Card = {
    title: string;
    value: string;
    sub: string;
    explainer: string;
    tone: Tone;
    href?: string;
    hrefLabel?: string;
  };

  const obj = data.objectType;
  const objLabel = OBJECT_LABELS[obj];
  const nounPlural = OBJECT_NOUN_PLURAL[obj];
  const segParams = `period=${data.period}&obj=${obj}`;

  const cards: Card[] = [
    {
      title: `${objLabel} na janela`,
      value: fmt.format(data.totals.leads),
      sub: `${obj === 'deals' ? 'negócios' : 'contatos'} criados no período`,
      explainer: `Total de novos ${obj === 'deals' ? 'negócios' : 'contatos'} no HubSpot dentro do filtro de período. Inclui todas as origens.`,
      tone: 'neutral',
      href: OBJECT_LIST_URL[obj],
      hrefLabel: `Abrir lista de ${objLabel.toLowerCase()} no HubSpot ↗`,
    },
    {
      title: 'Cobertura UTM',
      value: pct(data.coverage.pct),
      sub: `${fmt.format(data.coverage.withUtm)} com UTM · ${fmt.format(data.coverage.withoutUtm)} sem`,
      explainer: `Porcentagem de ${nounPlural} que tem a propriedade utm_source preenchida ${obj === 'deals' ? 'NO PRÓPRIO NEGÓCIO (independente da UTM do contato).' : 'no contato.'}`,
      tone: coverageTone,
      href: `/segment/utm/with?${segParams}`,
      hrefLabel: `Ver os ${fmt.format(data.coverage.withUtm)} com UTM →`,
    },
    {
      title: 'UTM completa',
      value: pct(data.completeness.pct),
      sub: `${fmt.format(data.completeness.complete)}/${fmt.format(data.completeness.tagged)} atendem a regra (amostra)`,
      explainer: `Regra por source: organico → só utm_source basta; facebook/linkedin/google + outros → utm_source + utm_campaign. utm_source vazio = sem UTM.`,
      tone: completenessTone,
      href: `/segment/utm/with?${segParams}`,
      hrefLabel: `Ver ${nounPlural} taggeados →`,
    },
    {
      title: 'Source não canônico',
      value: fmt.format(data.totals.nonCanonical),
      sub: 'tem utm_source mas valor não está na lista PSA',
      explainer: `${objLabel} com utm_source preenchido mas com valor fora da lista canônica (ex.: adwords, hs_email, site-institucional). Separado da completude — pode até estar "completo" mas o source vai pra Other Campaigns no agrupamento do HubSpot.`,
      tone: data.totals.nonCanonical > 0 ? 'warn' : 'good',
      href: `/segment/utm/non-standard?${segParams}`,
      hrefLabel: `Ver ${nounPlural} com source não canônico →`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <KpiCard key={c.title} {...c} />
      ))}
    </div>
  );
}

function KpiCard({ title, value, sub, explainer, tone, href, hrefLabel }: {
  title: string;
  value: string;
  sub: string;
  explainer: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  href?: string;
  hrefLabel?: string;
}) {
  const accent = {
    good: 'border-psa-good/30 bg-psa-good-soft/40 hover:border-psa-good/60',
    warn: 'border-psa-warn/30 bg-psa-warn-soft/40 hover:border-psa-warn/60',
    bad:  'border-psa-bad/30 bg-psa-bad-soft/40 hover:border-psa-bad/60',
    neutral: 'border-psa-line bg-white hover:border-psa-ink/30',
  }[tone];
  const valueColor = {
    good: 'text-psa-good',
    warn: 'text-psa-warn',
    bad:  'text-psa-bad',
    neutral: 'text-psa-ink',
  }[tone];

  const inner = (
    <>
      <div className="text-[10px] uppercase tracking-[0.18em] text-psa-mute font-medium">{title}</div>
      <div className={`text-5xl font-semibold tracking-tight mt-2 ${valueColor}`}>{value}</div>
      <div className="text-xs text-psa-smoke mt-2">{sub}</div>
      <div className="text-[11px] text-psa-mute mt-3 leading-snug border-t border-psa-line/60 pt-3">{explainer}</div>
      {hrefLabel && (
        <div className="mt-3 text-[11px] font-medium text-psa-accent">{hrefLabel}</div>
      )}
    </>
  );

  const cls = `rounded-2xl border ${accent} p-5 flex flex-col transition-colors`;

  if (href?.startsWith('http')) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  }
  if (href) {
    return <Link href={href} prefetch={false} className={cls}>{inner}</Link>;
  }
  return <div className={cls}>{inner}</div>;
}
