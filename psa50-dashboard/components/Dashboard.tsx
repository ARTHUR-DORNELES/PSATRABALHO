'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';

const STATUS = [
  { key: 'concluido', label: 'Finalizou a compra', color: '#22C55E' },
  { key: 'aguardando', label: 'Aguardando pagamento', color: '#9090A8' },
  { key: 'abandonou', label: 'Abandonou o carrinho', color: '#F59E0B' },
] as const;

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const pct = (n: number) =>
  `${(n * 100).toFixed(1)}%`;

const fmtDiaMes = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

const fmtUpdated = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

function MetricCard({
  title, value, sub, color, big,
}: {
  title: string;
  value: string | number;
  sub?: string;
  color: string;
  big?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="card-title">{title}</div>
      <div
        className="font-black tabular-nums leading-none"
        style={{ fontSize: big ? '2.4rem' : '2.8rem', color }}
      >
        {value}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const w = total > 0 ? Math.max((value / total) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-36 text-right text-subtle text-xs shrink-0">{label}</div>
      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: color }} />
      </div>
      <div className="w-10 text-right font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="w-12 text-right text-subtle text-xs">{total > 0 ? pct(value / total) : '—'}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0C0C12] border border-border rounded-lg p-3 text-xs shadow-xl">
      <div className="text-subtle mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.color }} />
          <span className="text-subtle">{p.name}:</span>
          <span className="font-bold" style={{ color: p.fill || p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard({ initialData }: { initialData: Snapshot }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/snapshot?force=1');
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const iniciaram = data.concluido + data.abandonou + data.aguardando;

  const chartData = data.daily.map((d) => ({
    date: fmtDiaMes(d.date),
    Finalizou: d.byStatus.concluido || 0,
    Aguardando: d.byStatus.aguardando || 0,
    Abandonou: d.byStatus.abandonou || 0,
  }));

  const totalVendasDia = data.daily.reduce((acc, d) => acc + (d.byStatus.concluido || 0), 0);

  return (
    <main className="min-h-screen bg-bg p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="text-accent text-xs font-bold tracking-widest uppercase mb-1">
            PSA · Palestras
          </div>
          <h1 className="text-2xl font-black leading-tight">
            50 Palestras Mais Bem Avaliadas
          </h1>
          <div className="text-subtle text-xs mt-1">
            Atualizado em {fmtUpdated(data.generatedAt)}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium
                     hover:border-accent hover:text-accent transition-colors disabled:opacity-40
                     disabled:cursor-not-allowed"
        >
          {refreshing ? '↻  Atualizando…' : '↻  Atualizar dados'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          Erro ao atualizar: {error}
        </div>
      )}

      {/* ── Métricas principais ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Finalizou a compra"
          value={data.concluido}
          sub={`${pct(data.taxaConversao)} de taxa de conversão`}
          color="#22C55E"
        />
        <MetricCard
          title="Aguardando pagamento"
          value={data.aguardando}
          sub={iniciaram > 0 ? `${pct(data.aguardando / iniciaram)} do total` : undefined}
          color="#9090A8"
        />
        <MetricCard
          title="Abandonou o carrinho"
          value={data.abandonou}
          sub={iniciaram > 0 ? `${pct(data.abandonou / iniciaram)} do total` : undefined}
          color="#F59E0B"
        />
        <MetricCard
          title="Receita total"
          value={brl(data.receitaTotal)}
          sub={`Ticket médio líquido: ${brl(data.ticketMedio)}`}
          color="#F5C842"
          big
        />
      </div>

      {/* ── Linha 2: Funil + Resumo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Funil de checkout */}
        <div className="card lg:col-span-2">
          <div className="card-title">Funil de checkout</div>
          <FunnelBar label="Iniciaram" value={iniciaram} total={iniciaram} color="#6366F1" />
          <FunnelBar label="Finalizaram" value={data.concluido} total={iniciaram} color="#22C55E" />
          <FunnelBar label="Aguardando" value={data.aguardando} total={iniciaram} color="#9090A8" />
          <FunnelBar label="Abandonaram" value={data.abandonou} total={iniciaram} color="#F59E0B" />
          {data.cancelado > 0 && (
            <FunnelBar label="Cancelado" value={data.cancelado} total={iniciaram} color="#EF4444" />
          )}
        </div>

        {/* Resumo financeiro */}
        <div className="card flex flex-col justify-between">
          <div className="card-title">Resumo financeiro</div>
          <div className="space-y-4">
            <div>
              <div className="text-subtle text-xs mb-1">Receita total (líquido Kiwify)</div>
              <div className="text-2xl font-black text-accent">{brl(data.receitaTotal)}</div>
            </div>
            <div>
              <div className="text-subtle text-xs mb-1">Vendas confirmadas</div>
              <div className="text-2xl font-black text-[#22C55E]">{data.concluido}</div>
            </div>
            <div>
              <div className="text-subtle text-xs mb-1">Ticket médio líquido</div>
              <div className="text-xl font-bold text-white">{brl(data.ticketMedio)}</div>
            </div>
            <div>
              <div className="text-subtle text-xs mb-1">Preço de venda</div>
              <div className="text-xl font-bold text-white">R$ 19,90</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-subtle text-xs">Taxa de conversão</span>
              <span className="text-lg font-black text-white">{pct(data.taxaConversao)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico: Vendas por dia ── */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="flex items-baseline justify-between mb-4">
            <div className="card-title mb-0">Vendas por dia</div>
            <div className="text-subtle text-xs">
              {totalVendasDia} venda{totalVendasDia !== 1 ? 's' : ''} confirmada{totalVendasDia !== 1 ? 's' : ''} no total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9090A8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9090A8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E1E2E' }} />
              <Legend
                formatter={(v) => <span style={{ color: '#9090A8', fontSize: 11 }}>{v}</span>}
              />
              <Bar dataKey="Finalizou" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Aguardando" stackId="a" fill="#9090A8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Abandonou" stackId="a" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-8 text-center text-subtle text-xs">
        PSA · As 50 palestras mais bem avaliadas · Dashboard interno
      </div>
    </main>
  );
}
