'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

// Formata 'YYYY-MM-DD' sem Date (evita shift de fuso).
const fmtDiaMes = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
const fmtDiaCompleto = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

// Tooltip com TOTAL do dia = soma dos segmentos. As etapas são mutuamente exclusivas (cada inscrito aparece
// em UM segmento só, a etapa mais profunda que atingiu), então o total de inscritos do dia = soma de todas as barras.
type TooltipEntry = { dataKey?: string | number; name?: string; value?: number; color?: string };
function StageTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-surface px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1.5 text-tbs-ink-light dark:text-white">{fmtDiaCompleto(label ?? '')}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-tbs-mute-light dark:text-tbs-mute">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono tabular-nums text-tbs-ink-light dark:text-white">{formatNumber(p.value ?? 0)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-tbs-line-light dark:border-tbs-line font-semibold">
        <span className="text-tbs-ink-light dark:text-white">Total inscritos no dia</span>
        <span className="font-mono tabular-nums text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(total)}</span>
      </div>
    </div>
  );
}

// Mesmas 4 etapas do "Funil de Leads · TBS 2026" (lib/funnel.ts), na ordem do funil.
const STAGES: { key: string; label: string; short: string; color: string }[] = [
  { key: 'inscricao_confirmada', label: 'Inscrição confirmada', short: 'Inscrição', color: '#FF6B1A' },
  { key: 'completou_cadastro', label: 'Entrou na plataforma', short: 'Plataforma', color: '#F08220' },
  { key: 'upload_video_concluido', label: 'Upload vídeo concluído', short: 'Vídeo+', color: '#FFC470' },
  { key: 'analise_ia_pronto', label: 'Análise de IA pronto', short: 'IA pronta', color: '#9CA3AF' },
];

export function DailyMetricsChart({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();
  const days = data.daily.edition2026.dailyStages ?? [];

  const chartData = days.map((d) => {
    const row: Record<string, string | number> = { date: d.date };
    for (const s of STAGES) row[s.key] = d.byStage[s.key] ?? 0;
    row.total = STAGES.reduce((sum, s) => sum + ((d.byStage[s.key] ?? 0) as number), 0);
    return row;
  });

  const totalAcrossPeriod = chartData.reduce((sum, d) => sum + (d.total as number), 0);
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Atividade diária por etapa</h2>
          <p className="card-subtitle">
            inscritos por dia, cada um na <strong>etapa mais profunda</strong> que atingiu (segmentos somam o total do dia) · <code>data de inscrição</code> · a partir de 01/06/2026
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">No período</div>
          <div className="kpi-value text-3xl text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(totalAcrossPeriod)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {chartData.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-sm text-tbs-mute-light dark:text-tbs-mute max-w-md mx-auto">
            Sem inscrições ainda. Conforme os contatos entrarem, aparecem aqui agrupados por dia e etapa do funil.
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisStroke}
                fontSize={11}
                tickFormatter={(d: string) => fmtDiaMes(d)}
              />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip content={<StageTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="square" />
              {STAGES.map((stage) => (
                <Bar
                  key={stage.key}
                  dataKey={stage.key}
                  name={stage.label}
                  stackId="funnel"
                  fill={stage.color}
                  cursor="pointer"
                  onClick={(payload: { date?: string } | undefined) => {
                    const day = payload?.date;
                    if (day) open({ type: 'funnel_day', value: stage.key, month: day });
                    else open({ type: 'funnel', value: stage.key });
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-5 border-t border-tbs-line-light dark:border-tbs-line pt-4">
            <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-2">
              Detalhe por dia ({chartData.length} dia{chartData.length === 1 ? '' : 's'} com inscrições)
            </h3>
            <div className="overflow-auto max-h-[420px] rounded-lg border border-tbs-line-light dark:border-tbs-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-tbs-line-light dark:border-tbs-line">
                    <th className="sticky top-0 z-10 bg-white dark:bg-tbs-surface text-left py-2 px-1 font-semibold text-tbs-mute-light dark:text-tbs-mute uppercase tracking-wider text-[10px]">
                      Dia
                    </th>
                    {STAGES.map((stage) => (
                      <th key={stage.key} className="sticky top-0 z-10 bg-white dark:bg-tbs-surface text-right py-2 px-2 font-semibold text-[10px] tracking-tighter text-tbs-mute-light dark:text-tbs-mute" title={stage.label}>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-sm" style={{ background: stage.color }} />
                          {stage.short}
                        </span>
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 bg-white dark:bg-tbs-surface text-right py-2 px-1 font-semibold uppercase tracking-wider text-[10px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.date as string} className="border-b border-tbs-line-light/50 dark:border-tbs-line/40">
                        <td className="py-1.5 px-1 font-mono">
                          {fmtDiaCompleto(row.date as string)}
                        </td>
                        {STAGES.map((stage) => {
                          const v = (row[stage.key] as number) || 0;
                          const isClickable = v > 0;
                          return (
                            <td
                              key={stage.key}
                              onClick={isClickable
                                ? () => open({ type: 'funnel_day', value: stage.key, month: row.date as string })
                                : undefined}
                              className={`text-right py-1.5 px-2 font-mono tabular-nums ${
                                v === 0 ? 'text-tbs-line-light dark:text-tbs-mute-2' : ''
                              } ${isClickable ? 'cursor-pointer hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3/60' : ''}`}
                            >
                              {v || '·'}
                            </td>
                          );
                        })}
                        <td className="text-right py-1.5 px-1 kpi-value">{formatNumber(row.total as number)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {data.daily.edition2026.note && (
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">{data.daily.edition2026.note}</p>
      )}
    </section>
  );
}
