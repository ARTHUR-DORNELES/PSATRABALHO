import type { Snapshot } from '@/lib/snapshot';

const SEVERITY_STYLES = {
  danger: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  info: { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
};

export function DataAlerts({ data }: { data: Snapshot }) {
  const alerts = data.alertasTagueamento;
  if (alerts.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="card-title">Observações sobre os dados</h2>
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">contexto pra ler os números</span>
      </div>
      <div className="divider-accent mb-5" />

      <ul className="space-y-3">
        {alerts.map((a, i) => {
          const s = SEVERITY_STYLES[a.severity];
          return (
            <li key={i} className="flex gap-3 py-2 border-b border-tbs-line-light dark:border-tbs-line/60 last:border-0">
              <div className="flex flex-col items-center pt-1 shrink-0">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${s.text}`}>{a.titulo}</div>
                <p className="text-xs text-tbs-mute-light dark:text-tbs-mute mt-1 leading-relaxed">{a.detalhe}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
