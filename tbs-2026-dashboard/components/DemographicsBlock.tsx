'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';

export function DemographicsBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { interesse2026 } = data.demografia;
  const totalRespondeu = interesse2026.true + interesse2026.false;
  const pctSim = totalRespondeu ? interesse2026.true / totalRespondeu : 0;

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Interesse pré-lançamento</h2>
          <p className="card-subtitle">contatos com intent declarado antes da abertura</p>
        </div>
      </div>
      <div className="divider-accent mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => open({ type: 'interesse_2026' })}
          className="text-left p-4 rounded-lg border border-tbs-orange/40 bg-gradient-to-br from-tbs-orange/15 to-tbs-orange/5 hover:from-tbs-orange/25 hover:to-tbs-orange/10 transition cursor-pointer"
        >
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">disseram SIM</div>
          <div className="kpi-value text-4xl mt-2 text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(interesse2026.true)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-1 font-mono">
            {(pctSim * 100).toFixed(0)}% dos que responderam
          </div>
        </button>
        <div className="p-4 rounded-lg border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/40">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">disseram NÃO</div>
          <div className="kpi-value text-3xl mt-2 text-tbs-mute-light dark:text-tbs-mute">{formatNumber(interesse2026.false)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-1 font-mono">opt-out</div>
        </div>
        <div className="p-4 rounded-lg border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/40">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">total respondeu</div>
          <div className="kpi-value text-3xl mt-2">{formatNumber(totalRespondeu)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-1 font-mono">interesse_tbs_2026</div>
        </div>
      </div>
    </section>
  );
}
