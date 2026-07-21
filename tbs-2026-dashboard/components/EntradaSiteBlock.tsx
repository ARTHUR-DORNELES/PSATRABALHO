'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';

export function EntradaSiteBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const entry = data.entrySite;
  if (!entry) return null;

  const { total, withReferrer, referrers } = entry;
  const max = Math.max(...referrers.map((r) => r.value), 1);

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">De onde vieram · referrer</h2>
          <p className="card-subtitle">
            site que referenciou o inscrito antes de chegar na LP · <code>hs_analytics_first_referrer</code>
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Com referrer</div>
          <div className="kpi-value text-2xl">{formatNumber(withReferrer)}<span className="text-sm text-tbs-mute-light dark:text-tbs-mute font-normal"> / {formatNumber(total)}</span></div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {referrers.length === 0 ? (
        <div className="text-center py-10 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem dados de referrer ainda.
        </div>
      ) : (
        <ul className="space-y-1">
          {referrers.map((r) => {
            const pct = total > 0 ? r.value / total : 0;
            const isDireto = r.label.startsWith('Direto');
            return (
              <li key={r.label}>
                <button
                  onClick={() => open({ type: 'referrer', value: isDireto ? '__direto__' : r.label, edition: '2026' })}
                  className="w-full flex items-center gap-3 rounded-md px-2 py-1 -mx-2 hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3/60 transition cursor-pointer text-left"
                >
                  <span className="w-44 text-sm truncate text-tbs-ink-light dark:text-white" title={r.label}>
                    {r.label}
                  </span>
                  <div className="flex-1 h-5 bg-tbs-line-light dark:bg-tbs-bg-3/60 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${isDireto ? 'bg-tbs-mute-light dark:bg-tbs-mute-2' : 'bg-gradient-to-r from-tbs-orange-deep to-tbs-orange-light'}`}
                      style={{ width: `${Math.max((r.value / max) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right kpi-value text-sm">{formatNumber(r.value)}</span>
                  <span className="w-12 text-right text-xs text-tbs-mute-light dark:text-tbs-mute font-mono">
                    {(pct * 100).toFixed(0)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Só de quem se inscreveu (virou contato). Pageviews de visitantes que <strong>não</strong> converteram não vêm do
        HubSpot CRM — precisariam do Traffic Analytics (Marketing Hub) ou GA4.
      </p>
    </section>
  );
}
