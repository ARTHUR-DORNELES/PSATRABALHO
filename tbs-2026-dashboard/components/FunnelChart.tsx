'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';

export function FunnelChart({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const stages = data.funnel.stages;
  // Funil de filtros sobrepostos (não soma): a base é o topo do funil (1ª etapa).
  const topValue = stages[0]?.value ?? 0;
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Funil de Leads · TBS 2026</h2>
          <p className="card-subtitle">
            cada etapa é um filtro do HubSpot · a partir de <code>01/06/2026</code> · clique pra ver os contatos
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Topo do funil</div>
          <div className="kpi-value text-3xl text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(topValue)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <ol className="space-y-1.5">
        {stages.map((s) => {
          const stageKey = s.key as string;
          const pct = topValue > 0 ? s.value / topValue : 0;
          const barWidth = maxValue > 0 ? (s.value / maxValue) * 100 : 0;
          const isZero = s.value === 0;
          return (
            <li
              key={s.key}
              onClick={() => open({ type: 'funnel', value: stageKey })}
              className="flex items-center gap-4 rounded-md cursor-pointer hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3/60 -mx-2 px-2 py-2 transition group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open({ type: 'funnel', value: stageKey });
                }
              }}
            >
              <div
                className={`w-52 text-sm truncate transition ${
                  isZero ? 'text-tbs-mute-light dark:text-tbs-mute-2' : 'text-tbs-ink-light dark:text-white group-hover:text-tbs-orange-deep dark:group-hover:text-tbs-orange-light'
                }`}
                title={s.label}
              >
                {s.label}
              </div>
              <div className="flex-1 h-6 bg-tbs-line-light dark:bg-tbs-bg-3/60 rounded overflow-hidden">
                {!isZero && (
                  <div
                    className="h-full bg-gradient-to-r from-tbs-orange-deep via-tbs-orange to-tbs-orange-light rounded transition-all"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                )}
              </div>
              <div className={`w-16 text-right kpi-value text-sm ${isZero ? 'text-tbs-mute-light dark:text-tbs-mute-2 font-normal' : ''}`}>
                {formatNumber(s.value)}
              </div>
              <div className="w-14 text-right text-xs text-tbs-mute-light dark:text-tbs-mute font-mono">
                {isZero ? '0%' : formatPct(pct, 1)}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
