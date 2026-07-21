'use client';
import type { Ga4Data } from '@/lib/ga4';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeProvider';

export function PageviewsBlock({ ga4, inscritos }: { ga4?: Ga4Data; inscritos?: number }) {
  const { theme } = useTheme();
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  // Não configurado → placeholder explicando o que falta.
  if (!ga4 || !ga4.configured) {
    return (
      <section className="card">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <h2 className="card-title">Pageviews & conversão da LP</h2>
            <p className="card-subtitle">/inscricoes/ · quem acessou, de onde veio e não converteu</p>
          </div>
          <span className="tbs-pill bg-tbs-line-light dark:bg-tbs-line text-tbs-mute-light dark:text-tbs-mute">aguardando GA4</span>
        </div>
        <div className="divider-accent mb-5" />
        <div className="text-sm text-tbs-mute-light dark:text-tbs-mute leading-relaxed max-w-2xl">
          O HubSpot CRM só conhece quem JÁ CONVERTEU. Pra ver quem ACESSOU a LP mas não converteu, conecte o GA4:
          adicione <code>GA4_PROPERTY_ID</code> e <code>GA4_SA_KEY</code> nas variáveis da Vercel. Ligado, mostra
          pageviews/dia, top fontes de tráfego e a taxa pageviews → inscritos.
          {ga4?.error && <span className="block mt-2 text-red-600 dark:text-red-400 text-xs">Erro GA4: {ga4.error}</span>}
        </div>
      </section>
    );
  }

  const conv = ga4.totalPageviews > 0 && inscritos != null ? inscritos / ga4.totalPageviews : null;

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Pageviews & conversão da LP</h2>
          <p className="card-subtitle">/inscricoes/ · pageviews, fontes de tráfego e conversão · GA4 ao vivo</p>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Pageviews</div>
            <div className="kpi-value text-2xl">{formatNumber(ga4.totalPageviews)}</div>
          </div>
          {conv != null && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Pageviews → inscritos</div>
              <div className="kpi-value text-2xl text-tbs-orange-deep dark:text-tbs-orange-light">{(conv * 100).toFixed(1)}%</div>
            </div>
          )}
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-2">Pageviews por dia</h3>
          {ga4.daily.length === 0 ? (
            <div className="text-center py-10 text-sm text-tbs-mute-light dark:text-tbs-mute">Sem pageviews no período ainda.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ga4.daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={axisStroke}
                  fontSize={11}
                  tickFormatter={(d: string) => {
                    const dt = new Date(d);
                    return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                  }}
                />
                <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [formatNumber(v), 'pageviews']}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
                />
                <Bar dataKey="pageviews" fill="#F08220" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-2">Top fontes de tráfego</h3>
          <ul className="space-y-1">
            {ga4.sources.length === 0 ? (
              <li className="text-xs text-tbs-mute-light dark:text-tbs-mute italic">—</li>
            ) : (
              ga4.sources.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60">
                  <span className="font-mono truncate max-w-[180px]" title={s.label}>{s.label}</span>
                  <span className="font-semibold">{formatNumber(s.sessions)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Pageviews e sessões da <code>/inscricoes/</code> via GA4 (inclui quem NÃO converteu). Taxa = inscritos no HubSpot ÷ pageviews.
      </p>
    </section>
  );
}
