'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

export function VendasPorCanalChart({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();

  const canais = (data.conversaoCanal ?? [])
    .map((c) => ({ ...c, taxa: c.inscritos > 0 ? c.vendas / c.inscritos : 0 }))
    .filter((c) => c.vendas > 0)
    .sort((a, b) => b.vendas - a.vendas);

  const totalVendas = canais.reduce((s, c) => s + c.vendas, 0);
  const lider = canais[0];

  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';
  const tickColor = theme === 'dark' ? '#fff' : '#0E0E10';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Total de vendas por canal</h2>
          <p className="card-subtitle">
            nº de vendas do The Best School por origem · volume absoluto (não a taxa)
          </p>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total de vendas</div>
            <div className="kpi-value text-2xl text-emerald-600 dark:text-emerald-400">{formatNumber(totalVendas)}</div>
          </div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {canais.length === 0 ? (
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Nenhuma venda registrada por canal ainda.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(canais.length * 46 + 20, 180)}>
            <BarChart data={canais} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="label" stroke={axisStroke} fontSize={11} width={110} tick={{ fill: tickColor }} />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                formatter={(_v: number, _n: string, p: { payload?: { vendas: number } }) => {
                  const d = p.payload;
                  if (!d) return ['', ''];
                  const share = totalVendas > 0 ? (d.vendas / totalVendas) * 100 : 0;
                  return [`${formatNumber(d.vendas)} vendas`, `${share.toFixed(0)}% do total vendido`];
                }}
              />
              <Bar dataKey="vendas" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(p: { key?: string }) => p?.key && open({ type: 'tbs_fonte', value: p.key, edition: '2026', comprou: true })}>
                {canais.map((c) => (
                  <Cell key={c.key} fill={c.color} />
                ))}
                <LabelList dataKey="vendas" position="right" formatter={(v: number) => formatNumber(v)} style={{ fill: tickColor, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Detalhe numérico por canal */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {canais.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => open({ type: 'tbs_fonte', value: c.key, edition: '2026', comprou: true })}
                className="flex items-center justify-between gap-3 text-xs px-2 py-1 rounded-md hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60 transition"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="truncate text-tbs-ink-light dark:text-white">{c.label}</span>
                </span>
                <span className="font-mono shrink-0 text-tbs-mute-light dark:text-tbs-mute">
                  <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(c.vendas)} vendas</strong> · {totalVendas > 0 ? ((c.vendas / totalVendas) * 100).toFixed(0) : 0}% do total
                </span>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
            {lider
              ? `${lider.label} é o canal que mais traz vendas em volume (${formatNumber(lider.vendas)} de ${formatNumber(totalVendas)}). Diferente da taxa de conversão, aqui o que conta é o tamanho absoluto. Clique num canal pra ver quem comprou (não os inscritos).`
              : ''}
          </p>
        </>
      )}
    </section>
  );
}
