'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

export function SchoolByStageBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();

  const stages = (data.schoolByStage ?? []).map((s) => ({ ...s, pct: s.taxa * 100 }));
  if (stages.length === 0) return null;

  const maisFundo = [...stages].filter((s) => s.total > 0).sort((a, b) => b.taxa - a.taxa)[0];
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';
  const tickColor = theme === 'dark' ? '#fff' : '#0E0E10';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Compra do The Best School por etapa do funil</h2>
          <p className="card-subtitle">
            % de cada etapa do The Best Speaker que comprou o TBSchool · taxa = compradores ÷ contatos na etapa
          </p>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <ResponsiveContainer width="100%" height={Math.max(stages.length * 52 + 20, 200)}>
        <BarChart data={stages} layout="vertical" margin={{ top: 5, right: 64, left: 10, bottom: 5 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke={axisStroke} fontSize={11} tickFormatter={(v: number) => `${v.toFixed(0)}%`} domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="label" stroke={axisStroke} fontSize={10.5} width={150} tick={{ fill: tickColor }} />
          <Tooltip
            cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
            contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
            itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
            labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
            formatter={(_v: number, _n: string, p: { payload?: { buyers: number; total: number; pct: number } }) => {
              const d = p.payload;
              if (!d) return ['', ''];
              return [`${formatNumber(d.buyers)} de ${formatNumber(d.total)} compraram`, `${d.pct.toFixed(1)}% de conversão`];
            }}
          />
          <Bar dataKey="pct" fill="#22C55E" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(p: { key?: string }) => p?.key && open({ type: 'funnel', value: p.key, edition: '2026' })}>
            <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fill: tickColor, fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Detalhe numérico por etapa */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {stages.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => open({ type: 'funnel', value: s.key, edition: '2026' })}
            className="flex items-center justify-between gap-3 text-xs px-2 py-1 rounded-md hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60 transition"
          >
            <span className="truncate text-tbs-ink-light dark:text-white">{s.label}</span>
            <span className="font-mono shrink-0 text-tbs-mute-light dark:text-tbs-mute">
              <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(s.buyers)}</strong> / {formatNumber(s.total)} · {(s.taxa * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        {maisFundoText(maisFundo)} Quanto mais fundo no funil de candidatura, maior tende a ser a propensão de compra do The Best School — útil pra priorizar quem receber a oferta. Clique numa barra pra ver os contatos da etapa.
      </p>
    </section>
  );
}

function maisFundoText(m?: { label: string; taxa: number }) {
  if (!m) return '';
  return `A etapa "${m.label}" tem a maior taxa de compra (${(m.taxa * 100).toFixed(1)}%).`;
}
