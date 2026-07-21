'use client';
import type { ReactNode } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import type { MetaAdsData } from '@/lib/meta-ads';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

// Janela de cada preço (o gasto do Meta é atribuído por dia). R$ 19,90 = 01→04/06; R$ 29,00 = 05/06+.
const LAUNCH_DAY = '2026-06-01';
const PRICE_CUT_DAY = '2026-06-05';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
// Formata 'YYYY-MM-DD' → 'DD/MM' sem passar por Date (evita shift de fuso que volta 1 dia).
const fmtDiaMes = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
const fmtDiaCompleto = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

// key interno → valor do enum no HubSpot + rótulo + cor
const STATUS: { key: string; enumValue: string; label: string; color: string }[] = [
  { key: 'concluido', enumValue: 'true', label: 'Finalizou a compra', color: '#22C55E' },
  { key: 'abandonou', enumValue: 'false', label: 'Abandonou o carrinho', color: '#F59E0B' },
  { key: 'aguardando', enumValue: 'Aguardando pagamento', label: 'Aguardando pagamento', color: '#9090A8' },
];

export function TheBestSchoolBlock({ data, meta }: { data: Snapshot; meta?: MetaAdsData }) {
  const { open } = useDrill();
  const { theme } = useTheme();
  const t = data.tbschool;
  if (!t) return null;

  const iniciaram = t.concluido + t.abandonou + t.aguardando; // sem os "perdidos" (artefatos sem pedido Kiwify)
  const taxaConclusao = iniciaram > 0 ? t.concluido / iniciaram : 0;

  // ROAS de mídia paga por IDADE DO LEAD — agora com ROAS PRÓPRIO de cada grupo.
  // O gasto do Meta não vem separado por idade do lead, então rateamos o gasto total do lançamento
  // pela PARTICIPAÇÃO de cada grupo nos INSCRITOS de mídia paga (mesma verba, ~mesmo custo por lead).
  // Assim base e novos têm ROAS independente; o geral é a média ponderada (não a soma dos dois).
  const daily = meta?.daily ?? [];
  const gastoLancamento = daily.filter((d) => d.date >= LAUNCH_DAY).reduce((a, d) => a + d.spend, 0);
  const roi = data.paidRoi;
  const recAntigos = roi?.paidReceitaAntigos ?? 0; // receita de mídia paga de leads já no Hub antes de 01/06
  const recNovos = roi?.paidReceitaNovos ?? 0; // receita de mídia paga de leads criados a partir de 01/06
  const vAntigos = roi?.paidCompraAntigos ?? 0;
  const vNovos = roi?.paidCompraNovos ?? 0;
  const inscAntigos = roi?.paidInscritosAntigos ?? 0; // inscritos de mídia paga já na base antes de 01/06
  const inscNovos = roi?.paidInscritosNovos ?? 0; // inscritos de mídia paga criados a partir de 01/06
  const inscPaid = inscAntigos + inscNovos;
  const shareAntigos = inscPaid > 0 ? inscAntigos / inscPaid : 0;
  const shareNovos = inscPaid > 0 ? inscNovos / inscPaid : 0;
  const gastoAntigos = gastoLancamento * shareAntigos; // gasto atribuído à base reativada
  const gastoNovos = gastoLancamento * shareNovos; // gasto atribuído aos novos
  const roasCards = [
    { title: 'ROAS geral', sub: 'todos de mídia paga', receita: recAntigos + recNovos, vendas: vAntigos + vNovos, gasto: gastoLancamento, insc: inscPaid, share: 1 },
    { title: 'Base reativada', sub: 'já no Hub antes de 01/06 · mídia paga', receita: recAntigos, vendas: vAntigos, gasto: gastoAntigos, insc: inscAntigos, share: shareAntigos },
    { title: 'Novos da campanha', sub: 'criados a partir de 01/06 · mídia paga', receita: recNovos, vendas: vNovos, gasto: gastoNovos, insc: inscNovos, share: shareNovos },
  ];
  const temRoas = !!roi && gastoLancamento > 0;

  const days = data.tbschoolDaily ?? [];
  const chartData = days.map((d) => {
    const row: Record<string, string | number> = { date: d.date };
    for (const s of STATUS) row[s.key] = d.byStatus[s.key] ?? 0;
    return row;
  });
  // Faturamento (R$) por dia, pela data de pagamento real (Kiwify).
  const receitaDays = data.tbschoolReceitaDaily ?? [];
  const totalFaturamento = receitaDays.reduce((acc, d) => acc + d.receita, 0);
  const midiaDays = data.tbschoolMidiaDaily ?? [];
  const totalVendasMidia = midiaDays.reduce((a, d) => a + d.vendas, 0);
  const totalReceitaMidia = midiaDays.reduce((a, d) => a + d.receita, 0);
  const brlCompacto = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k` : `R$ ${v.toFixed(0)}`);
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">The Best School · checkout</h2>
          <p className="card-subtitle">
            funil de compra · <code>pipeline de negócios The Best School</code> (1 pedido = 1 negócio)
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Taxa de conclusão</div>
          <div className="kpi-value text-2xl text-tbs-orange-deep dark:text-tbs-orange-light">{(taxaConclusao * 100).toFixed(0)}%</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Negócios fechados" value={t.concluido} sub="etapa = Negócio fechado" tone="success"
          onClick={() => open({ type: 'tbschool_deal', value: 'concluido' })} />
        <StatCard title="Valor vendido (fechados)" valueText={brl(t.receitaTotal)} sub="soma dos negócios fechados" tone="success"
          onClick={() => open({ type: 'tbschool_deal', value: 'concluido' })} />
        <StatCard title="Abandonaram o carrinho" value={t.abandonou} sub="etapa = Abandonou carrinho" tone="warn"
          onClick={() => open({ type: 'tbschool_deal', value: 'abandonou' })} />
        <StatCard title="Aguardando pagamento" value={t.aguardando} sub="etapa = Aguardando pagamento" tone="muted"
          onClick={() => open({ type: 'tbschool_deal', value: 'aguardando' })} />
      </div>

      {/* ROAS (mídia paga) — geral · antes (R$ 19,90) · depois (R$ 29,00) */}
      {temRoas && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-2">
            ROAS (mídia paga) · geral · base reativada · novos da campanha
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {roasCards.map((c) => {
              const r = c.gasto > 0 ? c.receita / c.gasto : 0;
              const pctShare = (c.share * 100).toFixed(0);
              const hint = c.title === 'ROAS geral'
                ? `Receita ${brl(c.receita)} ÷ gasto Meta do lançamento ${brl(c.gasto)} = ${r.toFixed(2)}x. É a média ponderada dos dois grupos.`
                : `Receita ${brl(c.receita)} ÷ gasto atribuído ${brl(c.gasto)} = ${r.toFixed(2)}x. Gasto = ${pctShare}% do total do Meta (${brl(gastoLancamento)}), rateado pela fatia do grupo nos inscritos de mídia paga (${formatNumber(c.insc)} de ${formatNumber(inscPaid)}).`;
              return (
                <StatCard
                  key={c.title}
                  title={c.title}
                  valueText={<>{`${r.toFixed(2)}x`} <span className="text-sm font-mono text-yellow-500 dark:text-yellow-400">({formatNumber(c.vendas)} vendas)</span></>}
                  sub={c.sub}
                  tone={r >= 1 ? 'success' : 'warn'}
                  hint={hint}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-2">Agora cada grupo tem seu <strong>ROAS próprio</strong>: o gasto do Meta é <strong>rateado pela fatia de cada grupo nos inscritos de mídia paga</strong> (base reativada {(shareAntigos * 100).toFixed(0)}% · novos {(shareNovos * 100).toFixed(0)}% do gasto). Por isso <strong>base e novos não somam o geral</strong> — o geral é a média ponderada. "Base reativada" = já estava no Hub antes de 01/06; "novos" = criados a partir de 01/06. Passe o mouse para a prova real.</p>
        </div>
      )}

      {/* Receita por produto */}
      {t.porProduto && t.porProduto.length > 0 && (
        <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-3">
            Receita por produto · negócios fechados <span className="text-tbs-orange-deep dark:text-tbs-orange-light normal-case tracking-normal">· clique para ver os negócios</span>
          </h3>
          <div className="space-y-3">
            {t.porProduto.map((p) => {
              const share = t.receitaTotal > 0 ? p.receita / t.receitaTotal : 0;
              const isUpsell = p.label.toLowerCase().includes('upsell') || p.label.toLowerCase().includes('formato de aulas');
              const ticket = p.count > 0 ? p.receita / p.count : 0;
              const cor = isUpsell ? '#A855F7' : '#FF6B1A';
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => open({ type: 'tbschool_deal', value: 'concluido', produto: isUpsell ? 'upsell' : 'tripwire' })}
                  title={`${formatNumber(p.count)} vendas × ticket médio ${brl(ticket)} = ${brl(p.receita)} (${(share * 100).toFixed(1)}% da receita total). Clique para ver os negócios.`}
                  className="w-full text-left rounded-xl p-4 bg-white dark:bg-tbs-bg-3/30 border border-tbs-line-light dark:border-tbs-line hover:border-tbs-orange/60 hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: cor }} />
                      <span className="text-sm font-semibold text-tbs-ink-light dark:text-white truncate">{p.label}</span>
                    </span>
                    <span className="shrink-0 text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">{brl(p.receita)}</span>
                  </div>
                  <div className="w-full bg-tbs-line-light dark:bg-tbs-line rounded-full h-2.5 mb-2">
                    <div className="h-2.5 rounded-full" style={{ width: `${(share * 100).toFixed(1)}%`, background: cor }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-tbs-mute-light dark:text-tbs-mute font-mono">
                    <span><strong className="text-tbs-ink-light dark:text-white">{formatNumber(p.count)}</strong> {p.count === 1 ? 'venda' : 'vendas'} · ticket médio <strong className="text-tbs-ink-light dark:text-white">{brl(ticket)}</strong></span>
                    <span className="text-tbs-orange-deep dark:text-tbs-orange-light font-semibold">{(share * 100).toFixed(1)}% da receita →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico diário */}
      <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
        <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-3">
          Vendas por dia · concluídas pela data do pagamento (Kiwify) · horário de Brasília
        </h3>
        {chartData.length === 0 ? (
          <div className="text-center py-10 text-sm text-tbs-mute-light dark:text-tbs-mute">
            Nenhum checkout registrado ainda — o gráfico popula conforme os inscritos passam pelo upsell.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisStroke}
                fontSize={11}
                tickFormatter={(d: string) => fmtDiaMes(d)}
              />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip
                formatter={(v: number, name: string) => [formatNumber(v), name]}
                labelFormatter={(d) => fmtDiaCompleto(d as string)}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="square" />
              {STATUS.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="tbschool"
                  fill={s.color}
                  cursor="pointer"
                  onClick={(payload: { date?: string } | undefined) => {
                    if (payload?.date) open({ type: 'tbschool_status', value: s.enumValue, month: payload.date });
                    else open({ type: 'tbschool_status', value: s.enumValue });
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
          Cartões e gráfico vêm do <strong>pipeline de negócios The Best School</strong> (mesma fonte do Kiwify). As <strong>vendas concluídas</strong> são distribuídas pela <strong>data do pagamento real do Kiwify</strong> (horário de Brasília) — então bate com o relatório diário do Kiwify. Aguardando/abandono usam a data de criação do negócio.
        </p>
      </div>

      {/* Faturamento por dia (R$ realizado) */}
      <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
            Faturamento por dia · receita das vendas concluídas (Kiwify) · horário de Brasília
          </h3>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total</span>{' '}
            <span className="kpi-value text-lg text-emerald-600 dark:text-emerald-400">{brl(totalFaturamento)}</span>
          </div>
        </div>
        {receitaDays.length === 0 ? (
          <div className="text-center py-10 text-sm text-tbs-mute-light dark:text-tbs-mute">
            Sem faturamento registrado ainda — popula conforme os pagamentos entram.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={receitaDays} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickFormatter={(d: string) => fmtDiaMes(d)} />
              <YAxis stroke={axisStroke} fontSize={11} tickFormatter={(v: number) => brlCompacto(v)} width={56} />
              <Tooltip
                formatter={(v: number) => [brl(v), 'Faturamento']}
                labelFormatter={(d) => fmtDiaCompleto(d as string)}
                cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
              />
              <Bar
                dataKey="receita"
                name="Faturamento"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(payload: { date?: string } | undefined) => {
                  if (payload?.date) open({ type: 'tbschool_status', value: 'true', month: payload.date });
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
          Soma do <strong>valor líquido</strong> dos negócios fechados em cada dia, pela <strong>data do pagamento real do Kiwify</strong> — então o total bate com o faturamento do Kiwify. Clique numa barra pra ver as vendas daquele dia.
        </p>
      </div>

      {/* Vendas por dia · mídia paga (Social Pago + Pesquisa Paga) */}
      {midiaDays.length > 0 && (
        <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
              Vendas por dia · mídia paga (Meta · Social Pago) · data do pagamento
            </h3>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total</span>{' '}
              <span className="kpi-value text-lg text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(totalVendasMidia)}</span>
              <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute"> · {brl(totalReceitaMidia)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={midiaDays} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickFormatter={(d: string) => fmtDiaMes(d)} />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip
                formatter={(v: number, _n: string, p: { payload?: { receita?: number } }) => [`${formatNumber(v)} vendas · ${brl(p.payload?.receita ?? 0)}`, 'Mídia paga']}
                labelFormatter={(d) => fmtDiaCompleto(d as string)}
                cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
              />
              <Bar dataKey="vendas" name="Vendas (mídia paga)" fill="#FF6B1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
            Vendas do The Best School cujo comprador veio de <strong>mídia paga (Meta · Social Pago)</strong>, por <strong>dia do pagamento</strong>. Google desvinculado, então fica fora. No período: <strong>{formatNumber(totalVendasMidia)} vendas</strong> · {brl(totalReceitaMidia)}.
          </p>
        </div>
      )}

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        {iniciaram === 0
          ? 'Nenhum negócio no pipeline The Best School ainda — popula conforme os pedidos entram.'
          : `${formatNumber(iniciaram)} negócios no pipeline The Best School. Clique em qualquer número ou barra pra ver os contatos.`}
      </p>
    </section>
  );
}

function StatCard({
  title,
  value,
  valueText,
  sub,
  tone,
  onClick,
  hint,
}: {
  title: string;
  value?: number;
  valueText?: ReactNode;
  sub: string;
  tone: 'success' | 'warn' | 'muted';
  onClick?: () => void;
  hint?: string;
}) {
  const accent =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-tbs-ink-light dark:text-white';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      title={hint}
      className={`text-left rounded-xl p-4 border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30 ${onClick ? 'hover:border-tbs-orange/60 hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60 transition cursor-pointer' : hint ? 'cursor-help' : ''}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">{title}</div>
      <div className={`kpi-value ${valueText ? 'text-2xl' : 'text-3xl'} mt-2 ${accent}`}>{valueText ?? formatNumber(value ?? 0)}</div>
      <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 font-mono truncate" title={sub}>{sub}</div>
    </Tag>
  );
}
