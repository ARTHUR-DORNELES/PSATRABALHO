'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function OtavianoBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const o = data.otavianoInfluencia;
  if (!o) return null;

  const totalInsc = o.pago.inscritos + o.organico.inscritos;
  const totalVendas = o.pago.vendas + o.organico.vendas;
  if (totalInsc === 0) return null;

  const segs = [
    {
      key: 'pago' as const,
      label: 'Otaviano pago',
      desc: 'criativo dele em anúncio do Meta · medium paga',
      color: '#FF6B1A',
      ...o.pago,
      tag: 'conta no Social Pago',
    },
    {
      key: 'organico' as const,
      label: 'Otaviano orgânico',
      desc: 'redes / ManyChat dele · não pago',
      color: '#D946EF',
      ...o.organico,
      tag: 'fonte própria',
    },
  ];

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Influência Otaviano</h2>
          <p className="card-subtitle">
            quanto o Otaviano trouxe · separando <strong>pago</strong> (criativo no anúncio) de <strong>orgânico</strong> (redes dele)
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Inscritos (total)</div>
          <div className="kpi-value text-2xl text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(totalInsc)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {segs.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => open({ type: 'otaviano', value: s.key, edition: '2026' })}
            className="text-left rounded-xl border border-tbs-line-light dark:border-tbs-line p-4 hover:border-tbs-orange/60 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">{s.label}</span>
              <span className="ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-tbs-surface-light dark:bg-tbs-bg-3/60 text-tbs-mute-light dark:text-tbs-mute">{s.tag}</span>
            </div>
            <div className="kpi-value text-3xl">{formatNumber(s.inscritos)}</div>
            <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-0.5">
              inscritos · <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(s.vendas)} vendas</strong>
              {s.receita > 0 ? ` · ${brl(s.receita)}` : ''}
            </div>
            <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-1">{s.desc}</div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        <strong>Pago</strong> = anúncios do Meta cujo criativo é o Otaviano (<code>utm_content</code>) — esses <strong>continuam contando em Social Pago</strong> pro ROAS, aqui é só pra enxergar a influência dele.
        <strong> Orgânico</strong> = tráfego das redes/ManyChat dele (<code>utm_term</code> redes-otavianocosta) — esse é a fonte própria do Otaviano.
        Total Otaviano: <strong>{formatNumber(totalInsc)} inscritos</strong> · {formatNumber(totalVendas)} vendas. Clique num card pra ver os contatos.
      </p>
    </section>
  );
}
