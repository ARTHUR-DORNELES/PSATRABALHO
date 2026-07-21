'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeProvider';
import { useDrill } from './DrillProvider';

const MAX_BUCKETS = 48; // últimas 48h (blocos de 1 hora)

const horaLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' }) + 'h';
const diaHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit' }) + 'h';

export function Inscricoes30minChart({ data }: { data: Snapshot }) {
  const { theme } = useTheme();
  const { open } = useDrill();
  const openHora = (p: { bucket?: string } | undefined) => p?.bucket && open({ type: 'inscricao_hora', value: p.bucket });
  const all = data.inscricoesHora ?? [];
  const series = all.slice(-MAX_BUCKETS).map((b) => ({ bucket: b.bucket, paga: b.paid, outras: Math.max(b.total - b.paid, 0), compra: b.compra, total: b.total }));

  const totalJanela = series.reduce((s, b) => s + b.total, 0);
  const pagasJanela = series.reduce((s, b) => s + b.paga, 0);
  const comprasJanela = series.reduce((s, b) => s + b.compra, 0);
  const pico = series.reduce((m, b) => Math.max(m, b.total), 0);
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Ritmo de inscrições · por hora</h2>
          <p className="card-subtitle">
            inscrições por hora · quantas vieram de mídia paga · <code>horário da inscrição</code>
          </p>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Na janela</div>
            <div className="kpi-value text-2xl">{formatNumber(totalJanela)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Pico /hora</div>
            <div className="kpi-value text-2xl text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(pico)}</div>
          </div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {series.length === 0 ? (
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem inscrições ainda. Conforme entrarem, aparecem aqui em blocos de 1 hora.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" stroke={axisStroke} fontSize={10} tickFormatter={horaLabel} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                formatter={(v: number, name: string) => [formatNumber(v), name]}
                labelFormatter={(b) => diaHora(b as string)}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="square" />
              <Bar dataKey="paga" name="Mídia paga" stackId="i" fill="#FF6B1A" cursor="pointer" onClick={openHora} />
              <Bar dataKey="outras" name="Outras origens" stackId="i" fill={theme === 'dark' ? '#3A3A48' : '#C9C9D4'} radius={[3, 3, 0, 0]} cursor="pointer" onClick={openHora} />
              <Line type="monotone" dataKey="compra" name="Compraram (TBSchool)" stroke="#22C55E" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
            Janela: últimas {series.length} horas. Dessa janela,{' '}
            <strong>{formatNumber(pagasJanela)}</strong> de {formatNumber(totalJanela)} vieram de mídia paga
            {totalJanela > 0 ? ` (${((pagasJanela / totalJanela) * 100).toFixed(0)}%)` : ''} e{' '}
            <strong>{formatNumber(comprasJanela)}</strong> compraram o The Best School (linha verde). Horário de Brasília. <strong>Clique numa barra</strong> pra ver as origens das inscrições daquela hora.
          </p>
        </>
      )}
    </section>
  );
}
