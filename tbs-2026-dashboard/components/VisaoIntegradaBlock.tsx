'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import {
  ComposedChart, Bar, BarChart, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer,
} from 'recharts';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDiaMes = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
const fmtDiaCompleto = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

export function VisaoIntegradaBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();
  const vi = data.visaoIntegrada;

  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';
  const tickColor = theme === 'dark' ? '#fff' : '#0E0E10';
  const tooltipStyle = {
    contentStyle: { borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` },
    itemStyle: { color: theme === 'dark' ? '#fff' : '#0E0E10' },
    labelStyle: { color: theme === 'dark' ? '#fff' : '#0E0E10' },
  };

  if (!vi) {
    return (
      <section className="card">
        <h2 className="card-title">Visão integrada</h2>
        <div className="text-center py-12 text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem dados de vendas ainda — assim que houver negócios fechados, os cruzamentos aparecem aqui.
        </div>
      </section>
    );
  }

  const diario = vi.diario;
  const canais = (data.conversaoCanal ?? [])
    .map((c) => ({ ...c, taxa: c.inscritos > 0 ? c.vendasCohort / c.inscritos : 0 }))
    .filter((c) => c.inscritos > 0)
    .sort((a, b) => b.taxa - a.taxa);
  const qc = vi.quemCompra;
  const qcTotal = qc.base + qc.novos;
  const inscritosTotal = vi.funil.find((s) => s.key === 'inscritos')?.value ?? 0;
  const quemCompraPie = [
    { name: 'Base reativada', value: qc.base, color: '#9B7BE8' },
    { name: 'Novos da campanha', value: qc.novos, color: '#F08220' },
  ];
  const tempoMax = Math.max(1, ...vi.tempoAteCompra.map((t) => t.vendas));
  const regiaoMax = Math.max(1, ...vi.porRegiao.map((r) => r.taxa));

  return (
    <div className="space-y-5">
      {/* 1 · Funil unificado Speaker → School */}
      <section className="card">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <h2 className="card-title">Funil unificado · Speaker → School</h2>
            <p className="card-subtitle">do topo de funil (inscrição) até virar receita · % sempre sobre o total de inscritos</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Receita</div>
            <div className="kpi-value text-2xl text-emerald-600 dark:text-emerald-400">{brl(vi.receita)}</div>
          </div>
        </div>
        <div className="divider-accent mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {vi.funil.map((s, i) => {
            const clickable = s.key === 'compra' || s.key === 'upsell' || s.key === 'plataforma';
            const onClick = clickable
              ? () => {
                  if (s.key === 'plataforma') open({ type: 'funnel', value: 'completou_cadastro' });
                  else open({ type: 'tbschool_deal', value: 'concluido', produto: s.key === 'upsell' ? 'upsell' : 'tripwire' });
                }
              : undefined;
            return (
              <div
                key={s.key}
                onClick={onClick}
                className={`rounded-xl border border-tbs-line-light dark:border-tbs-line p-3 bg-tbs-surface-light dark:bg-tbs-bg-3/40 ${clickable ? 'cursor-pointer hover:border-tbs-orange/60' : ''}`}
              >
                <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute leading-tight">{s.label}</div>
                <div className={`kpi-value text-2xl ${i === 0 ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : s.key === 'compra' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {formatNumber(s.value)}
                </div>
                <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">
                  {s.key === 'inscritos'
                    ? 'total de inscritos (base do funil)'
                    : `${formatNumber(s.value)} de ${formatNumber(inscritosTotal)} inscritos · ${formatPct(s.pctTopo)}`}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">
          Ticket médio <strong>{brl(vi.ticketMedio)}</strong> · {formatNumber(vi.compradores)} compradores únicos. Clique em “Compraram”, “Upsell” ou “Plataforma” pra ver a lista.
        </p>
        <p className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-1 leading-relaxed">
          “Compraram a live” e “Upsell” contam <strong>compradores únicos</strong> (contatos), não negócios. “Entrou na plataforma (Speaker)” é da <strong>jornada do The Best Speaker</strong> (envio de vídeo) — fica fora da sequência de compra, por isso não segue a ordem decrescente do funil.
        </p>
      </section>

      {/* 2 · Inscrição × venda por dia (atividade do dia: inscrição pela data de inscrição, venda pela data da venda) */}
      <section className="card">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <h2 className="card-title">Inscrição × venda por dia</h2>
            <p className="card-subtitle">
              inscrições pela <code>data de inscrição</code> · vendas pela <code>data da venda</code> (pagamento Kiwify) — o que aconteceu em cada dia
            </p>
          </div>
        </div>
        <div className="divider-accent mb-5" />
        <div className="flex gap-4 mb-2 text-[11px] text-tbs-mute-light dark:text-tbs-mute">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#F08220' }} />Inscrições do dia</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#34D399' }} />Vendas do dia</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={diario} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickFormatter={fmtDiaMes} />
            <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
              labelFormatter={(l: string) => fmtDiaCompleto(l)}
            />
            <Bar dataKey="inscritos" name="Inscrições do dia" fill="#F08220" radius={[3, 3, 0, 0]} />
            <Bar dataKey="vendas" name="Vendas do dia" fill="#34D399" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3">
          <strong>Inscrições</strong> são contadas pela data de inscrição; <strong>vendas</strong> pela data do pagamento (Kiwify). Como são datas diferentes, a venda de um dia pode ser de quem se inscreveu antes (inclui base reativada) — cada barra mostra o que de fato aconteceu naquele dia.
        </p>
      </section>

      {/* 3 · Conversão por canal + 4 · Quem compra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card">
          <h2 className="card-title">Conversão por canal</h2>
          <p className="card-subtitle mb-4">qual canal traz quem <strong>compra</strong> — não só quem se inscreve</p>
          <div className="space-y-2.5">
            {canais.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => open({ type: 'tbs_fonte', value: c.key, edition: '2026', comprou: true })}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="truncate text-tbs-ink-light dark:text-white group-hover:underline">{c.label}</span>
                  </span>
                  <span className="font-mono shrink-0">
                    <strong className="text-tbs-ink-light dark:text-white">{formatPct(c.taxa)}</strong>
                    <span className="text-tbs-mute-light dark:text-tbs-mute"> · {formatNumber(c.vendasCohort)}/{formatNumber(c.inscritos)}</span>
                  </span>
                </div>
                <div className="h-2 rounded bg-tbs-surface-light dark:bg-tbs-bg-3/60 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.min(100, c.taxa * 100)}%`, background: c.color }} />
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">
            Taxa = compradores do lançamento ÷ inscritos do mesmo canal. Clique pra ver quem comprou.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">Quem compra</h2>
          <p className="card-subtitle mb-4">base já no Hub (reativada) × leads novos da campanha</p>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative shrink-0" style={{ width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={quemCompraPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="none">
                    {quemCompraPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [formatNumber(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">compradores</div>
                <div className="kpi-value text-2xl">{formatNumber(qcTotal)}</div>
              </div>
            </div>
            <div className="flex-1 min-w-[160px] space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#9B7BE8' }} />
                  <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">Base reativada</span>
                </div>
                <div className="kpi-value text-2xl mt-0.5">{formatNumber(qc.base)} <span className="text-sm font-normal text-tbs-mute-light dark:text-tbs-mute">· {qcTotal > 0 ? formatPct(qc.base / qcTotal) : '—'}</span></div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{brl(qc.receitaBase)}</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F08220' }} />
                  <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">Novos da campanha</span>
                </div>
                <div className="kpi-value text-2xl mt-0.5">{formatNumber(qc.novos)} <span className="text-sm font-normal text-tbs-mute-light dark:text-tbs-mute">· {qcTotal > 0 ? formatPct(qc.novos / qcTotal) : '—'}</span></div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{brl(qc.receitaNovos)}</div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">
            “Base reativada” = contato criado no Hub antes de 01/06; “novos” = criados a partir de 01/06. Receita = soma dos negócios fechados.
          </p>
        </section>
      </div>

      {/* 5 · Conversão por região + 6 · Tempo até a compra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="card">
          <h2 className="card-title">Conversão por região</h2>
          <p className="card-subtitle mb-4">onde a galera não só se inscreve, mas <strong>compra</strong></p>
          <div className="space-y-2.5">
            {vi.porRegiao.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => open({ type: 'regiao', value: r.label, edition: '2026' })}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-tbs-ink-light dark:text-white group-hover:underline">{r.label}</span>
                  <span className="font-mono">
                    <strong className="text-tbs-ink-light dark:text-white">{formatPct(r.taxa)}</strong>
                    <span className="text-tbs-mute-light dark:text-tbs-mute"> · {formatNumber(r.vendas)}/{formatNumber(r.inscritos)}</span>
                  </span>
                </div>
                <div className="h-2 rounded bg-tbs-surface-light dark:bg-tbs-bg-3/60 overflow-hidden">
                  <div className="h-full rounded bg-tbs-orange" style={{ width: `${(r.taxa / regiaoMax) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">Taxa = compradores ÷ inscritos da região. Barra relativa ao maior.</p>
        </section>

        <section className="card">
          <h2 className="card-title">Tempo até a compra</h2>
          <p className="card-subtitle mb-4">quanto tempo entre se inscrever e comprar — a “janela quente”</p>
          <div className="space-y-2.5">
            {vi.tempoAteCompra.map((t) => (
              <div key={t.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-tbs-ink-light dark:text-white">{t.label}</span>
                  <span className="font-mono text-tbs-ink-light dark:text-white">{formatNumber(t.vendas)}</span>
                </div>
                <div className="h-2 rounded bg-tbs-surface-light dark:bg-tbs-bg-3/60 overflow-hidden">
                  <div className="h-full rounded bg-emerald-500" style={{ width: `${(t.vendas / tempoMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">
            Diferença entre a data de inscrição e a data do pagamento (Kiwify). Concentração no “mesmo dia / 1 dia” = remarketing rápido converte.
          </p>
        </section>
      </div>

      {/* 7 · Perfil do comprador */}
      <section className="card">
        <h2 className="card-title">Perfil do comprador</h2>
        <p className="card-subtitle mb-5">quem realmente paga — área de atuação e faixa etária dos compradores</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-3">Área de atuação</h3>
            <ResponsiveContainer width="100%" height={Math.max(vi.perfilComprador.area.length * 38 + 10, 120)}>
              <BarChart data={vi.perfilComprador.area} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" stroke={axisStroke} fontSize={11} width={130} tick={{ fill: tickColor }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), 'compradores']} />
                <Bar dataKey="vendas" fill="#9B7BE8" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="vendas" position="right" formatter={(v: number) => formatNumber(v)} style={{ fill: tickColor, fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-3">Faixa etária</h3>
            <ResponsiveContainer width="100%" height={Math.max(vi.perfilComprador.idade.length * 38 + 10, 120)}>
              <BarChart data={vi.perfilComprador.idade} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" stroke={axisStroke} fontSize={11} width={60} tick={{ fill: tickColor }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), 'compradores']} />
                <Bar dataKey="vendas" fill="#F08220" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="vendas" position="right" formatter={(v: number) => formatNumber(v)} style={{ fill: tickColor, fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4">Faixa etária aproximada pelo ano de nascimento informado na inscrição. Só compradores com o dado preenchido.</p>
      </section>
    </div>
  );
}
