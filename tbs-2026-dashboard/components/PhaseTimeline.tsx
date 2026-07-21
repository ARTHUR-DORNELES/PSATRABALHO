import type { Snapshot } from '@/lib/snapshot';

const TODAY = new Date();

export function PhaseTimeline({ data }: { data: Snapshot }) {
  const phases = data.phases;
  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="card-title">Fases do evento</h2>
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">cronograma oficial · TBS 2026</span>
      </div>
      <div className="divider-accent mb-5" />
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {phases.map((p) => {
          // Parse ao meio-dia local pra evitar off-by-one de fuso (datas vêm como YYYY-MM-DD UTC).
          const start = new Date(p.start + 'T12:00:00');
          const end = new Date(p.end + 'T12:00:00');
          const singleDay = p.start === p.end;
          const status = TODAY < start ? 'futuro' : TODAY > end ? 'passado' : 'em curso';
          const isActive = status === 'em curso';
          const isPast = status === 'passado';
          return (
            <li
              key={p.key}
              className={`rounded-lg p-4 transition border ${
                isActive
                  ? 'border-tbs-orange bg-tbs-orange/10'
                  : isPast
                  ? 'border-tbs-line-light dark:border-tbs-line/60 bg-tbs-line-light/30 dark:bg-tbs-bg-3/40 opacity-60'
                  : 'border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`tbs-pill ${
                    isActive
                      ? 'bg-tbs-orange text-white dark:text-tbs-bg'
                      : isPast
                      ? 'bg-tbs-line-light dark:bg-tbs-line text-tbs-mute-light dark:text-tbs-mute'
                      : 'border border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute'
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="font-semibold text-sm text-tbs-ink-light dark:text-white">{p.label}</div>
              <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute font-mono mt-1">
                {singleDay
                  ? start.toLocaleDateString('pt-BR')
                  : `${start.toLocaleDateString('pt-BR')} → ${end.toLocaleDateString('pt-BR')}`}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
