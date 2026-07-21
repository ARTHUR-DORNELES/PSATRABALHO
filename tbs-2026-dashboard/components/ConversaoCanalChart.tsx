'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

export function ConversaoCanalChart({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();

  // Taxa de conversão usa COMPRADORES do lançamento (vendasCohort) ÷ inscritos do lançamento — mesma base, ≤ 100%.
  const canais = (data.conversaoCanal ?? [])
    .filter((c) => c.inscritos > 0)
    .map((c) => ({ ...c, vendasCohort: c.vendasCohort ?? c.vendas, taxa: c.inscritos > 0 ? Math.min((c.vendasCohort ?? c.vendas) / c.inscritos, 1) : 0 }))
    .sort((a, b) => b.taxa - a.taxa);

  const totalInscritos = canais.reduce((s, c) => s + c.inscritos, 0);
  const totalCompradores = canais.reduce((s, c) => s + c.vendasCohort, 0);
  const taxaGeral = totalInscritos > 0 ? totalCompradores / totalInscritos : 0;
  const melhor = canais.filter((c) => c.vendasCohort > 0)[0];

  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';
  const tickColor = theme === 'dark' ? '#fff' : '#0E0E10';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Conversão em vendas por canal</h2>
          <p className="card-subtitle">
% de inscritos do lançamento que compraram o The Best School, por origem · compradores ÷ inscritos (mesma base)
          </p>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Conversão geral</div>
            <div className="kpi-value text-2xl text-tbs-orange-deep dark:text-tbs-orange-light">{(taxaGeral * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {canais.length === 0 ? (
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem inscritos classificados por canal ainda.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(canais.length * 46 + 20, 180)}>
            <BarChart data={canais} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={11} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="label" stroke={axisStroke} fontSize={11} width={110} tick={{ fill: tickColor }} />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                formatter={(_v: number, _n: string, p: { payload?: { vendasCohort: number; inscritos: number; taxa: number } }) => {
                  const d = p.payload;
                  if (!d) return ['', ''];
                  return [`${formatNumber(d.vendasCohort)} compradores / ${formatNumber(d.inscritos)} inscritos`, `${(d.taxa * 100).toFixed(1)}% conversão`];
                }}
              />
              <Bar dataKey="taxa" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(p: { key?: string }) => p?.key && open({ type: 'tbs_fonte', value: p.key, edition: '2026' })}>
                {canais.map((c) => (
                  <Cell key={c.key} fill={c.color} />
                ))}
                <LabelList
                  dataKey="taxa"
                  position="right"
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  style={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Detalhe numérico por canal */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {canais.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => open({ type: 'tbs_fonte', value: c.key, edition: '2026' })}
                className="flex items-center justify-between gap-3 text-xs px-2 py-1 rounded-md hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60 transition"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="truncate text-tbs-ink-light dark:text-white">{c.label}</span>
                </span>
                <span className="font-mono shrink-0 text-tbs-mute-light dark:text-tbs-mute">
                  {formatNumber(c.inscritos)} inscritos · <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(c.vendasCohort)} compraram</strong> · {(c.taxa * 100).toFixed(1)}%
                </span>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
            {totalCompradores === 0
              ? 'Nenhuma venda de The Best School registrada por canal ainda.'
              : melhor
              ? `${melhor.label} é o canal que mais converte (${(melhor.taxa * 100).toFixed(1)}%). Taxa = compradores ÷ inscritos do lançamento (mesma base). Para volume total de vendas use o gráfico "Total de vendas por canal".`
              : ''}
          </p>
        </>
      )}
    </section>
  );
}
