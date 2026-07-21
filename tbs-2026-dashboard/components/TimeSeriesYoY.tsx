'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDrill } from './DrillProvider';
import { isInscriptionOpen } from '@/lib/dates';
import { AwaitingState } from './AwaitingState';

const MONTH_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

export function TimeSeriesYoY({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();

  if (!isOpen) {
    return (
      <section className="card">
        <div className="flex items-end justify-between mb-1">
          <h2 className="display uppercase text-lg">Inscrições por mês — YoY</h2>
          <span className="text-xs text-tbs-mute">comparativo entre edições</span>
        </div>
        <div className="divider-gradient w-16 mb-4" />
        <AwaitingState
          title="Comparativo YoY aguardando"
          hint="A linha TBS 2026 vai aparecer após 01/06 e ser comparada com 2024/2025."
        />
      </section>
    );
  }

  const months = data.timeseries.months;

  const handleDotClick = (year: '2024' | '2025' | '2026', monthLabel: string) => {
    const m = MONTH_MAP[monthLabel];
    if (!m) return;
    const month = `${year}-${String(m).padStart(2, '0')}`;
    open({ type: 'month', month });
  };

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">Inscrições por mês — YoY</h2>
        <span className="text-xs text-tbs-mute">{data.timeseries.label}</span>
      </div>
      <div className="divider-gradient w-16 mb-4" />
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={months} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#E6E6EA" strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke="#6B6B72" fontSize={12} />
          <YAxis stroke="#6B6B72" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E6E6EA' }}
            formatter={(v: number) => formatNumber(v)}
          />
          <Legend />
          <Line
            type="monotone" dataKey="y2024" name="2024" stroke="#6B6B72" strokeWidth={2}
            dot={{ r: 3, cursor: 'pointer' }}
            activeDot={{ r: 6, cursor: 'pointer', onClick: (_, payload) => handleDotClick('2024', (payload as { payload?: { month: string } })?.payload?.month || '') }}
          />
          <Line
            type="monotone" dataKey="y2025" name="2025" stroke="#F08220" strokeWidth={2}
            dot={{ r: 3, cursor: 'pointer' }}
            activeDot={{ r: 6, cursor: 'pointer', onClick: (_, payload) => handleDotClick('2025', (payload as { payload?: { month: string } })?.payload?.month || '') }}
          />
          <Line
            type="monotone" dataKey="y2026" name="2026" stroke="#D14A0F" strokeWidth={3}
            dot={{ r: 3, cursor: 'pointer' }}
            activeDot={{ r: 6, cursor: 'pointer', onClick: (_, payload) => handleDotClick('2026', (payload as { payload?: { month: string } })?.payload?.month || '') }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-tbs-mute mt-2">
        {data.timeseries.note} <span className="text-tbs-orange-deep">· clique em qualquer ponto pra ver os contatos do mês.</span>
      </p>
    </section>
  );
}
