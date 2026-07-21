'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeProvider';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const fmtDiaMes = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
const fmtDiaCompleto = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

// Painel separado do "The Best School" padrão (que agora só conta inscritos do TBS 2026): compradores da
// LIVE que NÃO são inscritos — a campanha de mídia paga que vende só a live pra fora do funil de inscrição.
export function TheBestSchoolNaoInscritoBlock({ data }: { data: Snapshot }) {
  const { theme } = useTheme();
  const t = data.tbschoolNaoInscrito;
  if (!t) return null;

  const days = t.daily ?? [];
  const totalVendas = days.reduce((a, d) => a + d.vendas, 0);
  const gridStroke = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axisStroke = theme === 'dark' ? '#6B6B80' : '#9CA3AF';

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">The Best School · comprou a live sem ser inscrito no TBS</h2>
          <p className="card-subtitle">
            campanha nova (mídia paga só da live) · <code>inscrito_tbs_2026 ≠ Sim</code>
          </p>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Negócios fechados</div>
          <div className="kpi-value text-3xl mt-2 text-emerald-600 dark:text-emerald-400">{formatNumber(t.concluido)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 font-mono">comprou sem estar inscrito no TBS</div>
        </div>
        <div className="rounded-xl p-4 border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Valor vendido</div>
          <div className="kpi-value text-2xl mt-2 text-emerald-600 dark:text-emerald-400">{brl(t.receitaTotal)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 font-mono">soma dos negócios fechados</div>
        </div>
      </div>

      {t.porProduto && t.porProduto.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {t.porProduto.map((p) => {
            const isUpsell = p.label.toLowerCase().includes('upsell') || p.label.toLowerCase().includes('formato de aulas');
            const ticket = p.count > 0 ? p.receita / p.count : 0;
            return (
              <div key={p.label} className="rounded-lg px-3 py-2 bg-tbs-line-light/40 dark:bg-tbs-bg-3/40 text-[11px] font-mono flex items-center justify-between gap-2">
                <span className="truncate text-tbs-mute-light dark:text-tbs-mute" title={p.label}>{isUpsell ? 'Upsell (gravação)' : 'Live (tripwire)'}</span>
                <span className="shrink-0 text-tbs-ink-light dark:text-white">{formatNumber(p.count)} · {brl(p.receita)} <span className="text-tbs-mute-light dark:text-tbs-mute">(tkt {brl(ticket)})</span></span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
            Vendas por dia · data do pagamento (Kiwify) · horário de Brasília
          </h3>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total</span>{' '}
            <span className="kpi-value text-lg text-tbs-orange-deep dark:text-tbs-orange-light">{formatNumber(totalVendas)}</span>
          </div>
        </div>
        {days.length === 0 ? (
          <div className="text-center py-10 text-sm text-tbs-mute-light dark:text-tbs-mute">
            Nenhuma venda ainda desse público — popula conforme a campanha nova gerar compras.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={days} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickFormatter={(d: string) => fmtDiaMes(d)} />
              <YAxis stroke={axisStroke} fontSize={11} allowDecimals={false} />
              <Tooltip
                formatter={(v: number, _n: string, p: { payload?: { receita?: number } }) => [`${formatNumber(v)} vendas · ${brl(p.payload?.receita ?? 0)}`, 'Vendas']}
                labelFormatter={(d) => fmtDiaCompleto(d as string)}
                cursor={{ fill: theme === 'dark' ? '#ffffff10' : '#00000008' }}
                contentStyle={{ borderRadius: 8, background: theme === 'dark' ? '#1A1A24' : '#fff', border: `1px solid ${theme === 'dark' ? '#2A2A38' : '#E6E6EA'}` }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
              />
              <Bar dataKey="vendas" name="Vendas" fill="#FF6B1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Mesmo pipeline de negócios The Best School, só que restrito a compradores cujo contato <strong>não</strong> tem <code>inscrito_tbs_2026 = Sim</code> — ou seja, chegaram só pela campanha da live, sem passar pelo funil de inscrição do TBS 2026.
      </p>
    </section>
  );
}
