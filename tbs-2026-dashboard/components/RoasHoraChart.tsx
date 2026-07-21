'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import type { MetaAdsData } from '@/lib/meta-ads';
import type { GoogleAdsData } from '@/lib/google-ads';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeProvider';

const MAX_BUCKETS = 48; // últimas 48h (mesma janela do ritmo)

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const horaLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' }) + 'h';
const diaHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit' }) + 'h';

export function RoasHoraChart({ data, meta: metaAds, google: googleAds }: { data: Snapshot; meta?: MetaAdsData; google?: GoogleAdsData }) {
  const { theme } = useTheme();
  const all = data.inscricoesHora ?? [];
  // CPL: custo rateado sobre os leads pagos (ROAS varia com o volume de entrada).
  // CPA: custo atribuído só a quem comprou (ROAS = rentabilidade por venda).
  const [modo, setModo] = useState<'cpl' | 'cpa'>('cpl');

  // Gasto total (só APIs conectadas — manual fica no outro bloco, client-side).
  const spendMeta = metaAds?.configured ? metaAds.totalSpend : 0;
  const spendGoogle = googleAds?.configured ? googleAds.totalSpend : 0;
  const investido = spendMeta + spendGoogle;
  const paidInscritos = data.paidRoi?.paidInscritos ?? 0;
  const paidCompra = data.paidRoi?.paidCompra ?? 0;
  // CPL = investido ÷ inscritos pagos · CPA = investido ÷ vendas pagas (mesmos critérios do painel de mídia paga).
  const cpl = paidInscritos > 0 ? investido / paidInscritos : 0;
  const cpa = paidCompra > 0 ? investido / paidCompra : 0;
  const taxa = modo === 'cpl' ? cpl : cpa; // R$ por unidade
  const temCusto = taxa > 0;
  const taxaLabel = modo === 'cpl' ? 'CPL' : 'CPA';
  const baseLabel = modo === 'cpl' ? 'inscritos pagos' : 'compras pagas';

  const series = all.slice(-MAX_BUCKETS).map((b) => {
    // CPL rateia pelos inscritos pagos da hora; CPA, só pelas compras pagas da hora.
    const base = modo === 'cpl' ? b.paid : b.compraPaga;
    const custo = base * taxa;
    return {
      bucket: b.bucket,
      receita: b.receita,
      custo,
      roas: temCusto && custo > 0 ? b.receita / custo : null,
    };
  });

  const receitaJanela = series.reduce((s, b) => s + b.receita, 0);
  const custoJanela = series.reduce((s, b) => s + b.custo, 0);
  const roasJanela = custoJanela > 0 ? receitaJanela / custoJanela : null;

  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">ROAS &amp; breakeven por hora</h2>
          <p className="card-subtitle">
            receita das vendas pagas × custo estimado ({baseLabel} × {taxaLabel} {temCusto ? brl(taxa) : '—'}) · linha = ROAS · <code>horário da inscrição</code>
          </p>
          <div className="inline-flex mt-2 rounded-lg border border-tbs-line-light dark:border-tbs-line overflow-hidden text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setModo('cpl')}
              className={`px-3 py-1 ${modo === 'cpl' ? 'bg-tbs-orange text-white' : 'text-tbs-mute-light dark:text-tbs-mute hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60'}`}
            >
              CPL · vs volume de leads
            </button>
            <button
              type="button"
              onClick={() => setModo('cpa')}
              className={`px-3 py-1 border-l border-tbs-line-light dark:border-tbs-line ${modo === 'cpa' ? 'bg-tbs-orange text-white' : 'text-tbs-mute-light dark:text-tbs-mute hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60'}`}
            >
              CPA · rentabilidade por venda
            </button>
          </div>
        </div>
        <div className="flex items-end gap-5 text-right">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">ROAS da janela</div>
            <div className={`kpi-value text-2xl ${roasJanela != null && roasJanela >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {roasJanela != null ? `${roasJanela.toFixed(2)}x` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Receita /janela</div>
            <div className="kpi-value text-2xl text-emerald-600 dark:text-emerald-400">{brl(receitaJanela)}</div>
          </div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {series.length === 0 ? (
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem dados ainda. Conforme entrarem inscrições e compras de mídia paga, o ROAS por hora aparece aqui.
        </div>
      ) : !temCusto ? (
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Conecte o gasto de Meta/Google (APIs) e tenha ao menos 1 venda paga pra calcular CPA, custo e ROAS por hora.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" stroke={axisStroke} fontSize={10} tickFormatter={horaLabel} interval="preserveStartEnd" minTickGap={24} />
              <YAxis yAxisId="rs" stroke={axisStroke} fontSize={11} tickFormatter={(v: number) => `R$${formatNumber(Math.round(v))}`} />
              <YAxis yAxisId="roas" orientation="right" stroke={axisStroke} fontSize={11} tickFormatter={(v: number) => `${v}x`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                formatter={(v: number, name: string) => [name === 'ROAS' ? (v != null ? `${Number(v).toFixed(2)}x` : '—') : brl(Number(v)), name]}
                labelFormatter={(b) => diaHora(b as string)}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="square" />
              <ReferenceLine yAxisId="roas" y={1} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'breakeven', position: 'right', fill: '#EF4444', fontSize: 10 }} />
              <Bar yAxisId="rs" dataKey="receita" name="Receita (vendas pagas)" fill="#22C55E" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="rs" dataKey="custo" name={`Custo estimado (${taxaLabel})`} fill={theme === 'dark' ? '#3A3A48' : '#C9C9D4'} radius={[3, 3, 0, 0]} />
              <Line yAxisId="roas" type="monotone" dataKey="roas" name="ROAS" stroke="#FF6B1A" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
            Custo por hora é <strong>estimado</strong> — as APIs de Ads só dão o gasto total, então rateamos pelo {taxaLabel} médio ({brl(taxa)}) × {baseLabel} da hora.{' '}
            {modo === 'cpl'
              ? 'No modo CPL o custo sobe com o volume de leads (mesmo sem venda), então o ROAS cai nas horas de muito tráfego e pouca conversão.'
              : 'No modo CPA o custo só conta quem comprou, então o ROAS reflete a rentabilidade por venda (líquido ÷ CPA) — tende a ser estável.'}{' '}
            Quando a barra verde (receita) passa a cinza (custo), o ROAS fica acima do breakeven (1,0x). Horário de Brasília.
          </p>
        </>
      )}
    </section>
  );
}
