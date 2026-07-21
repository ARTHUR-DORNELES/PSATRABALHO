'use client';
import { useMemo } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { FONTE_BUCKETS } from '@/lib/tbs-fonte';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from './ThemeProvider';

const fmtDiaMes = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };

type TipEntry = { name?: string; value?: number; color?: string };
function DailyTip({ active, payload, label, tipBg, tipBorder, tipText }: {
  active?: boolean; payload?: TipEntry[]; label?: string; tipBg: string; tipBorder: string; tipText: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter((p) => (p.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const total = payload.reduce((a, p) => a + (p.value ?? 0), 0);
  return (
    <div style={{ background: tipBg, border: `1px solid ${tipBorder}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: tipText }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label ? fmtDiaMes(label) : ''} · {formatNumber(total)} inscritos</div>
      {items.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{formatNumber(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

export function OrigensDiariasBlock({ data }: { data: Snapshot }) {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axis = theme === 'dark' ? '#9090A8' : '#6B6B72';
  const tipBg = theme === 'dark' ? '#1A1A24' : '#FFFFFF';
  const tipText = theme === 'dark' ? '#FFFFFF' : '#0E0E10';

  const { rows, activeFontes, totalGeral } = useMemo(() => {
    const od = data.origemDiaria ?? [];
    const totals: Record<string, number> = {};
    for (const day of od) for (const b of FONTE_BUCKETS) totals[b.key] = (totals[b.key] || 0) + (day.byFonte[b.key] || 0);
    const activeFontes = FONTE_BUCKETS.filter((b) => (totals[b.key] || 0) > 0);
    const rows = od.map((day) => {
      const r: Record<string, number | string> = { date: day.date };
      for (const b of activeFontes) r[b.key] = day.byFonte[b.key] || 0;
      return r;
    });
    const totalGeral = Object.values(totals).reduce((a, b) => a + b, 0);
    return { rows, activeFontes, totalGeral };
  }, [data]);

  if (rows.length === 0) {
    return (
      <section className="card">
        <h2 className="card-title">Origens de entrada por dia</h2>
        <p className="card-subtitle">inscritos TBS 2026 por dia, por origem · fonte [TBS] via UTM</p>
        <div className="divider-accent mb-5" />
        <p className="text-sm text-tbs-mute-light dark:text-tbs-mute">sem dados ainda</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Origens de entrada por dia</h2>
          <p className="card-subtitle">inscritos TBS 2026 por dia, por origem · fonte [TBS] via UTM</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total</div>
          <div className="kpi-value text-2xl">{formatNumber(totalGeral)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={rows} margin={{ top: 5, right: 12, left: 6, bottom: 5 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke={axis} fontSize={11} tickFormatter={fmtDiaMes} minTickGap={18} />
          <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
          <Tooltip
            content={<DailyTip tipBg={tipBg} tipBorder={grid} tipText={tipText} />}
            cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
          />
          {activeFontes.map((b) => (
            <Bar key={b.key} dataKey={b.key} stackId="o" name={b.label} fill={b.color} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legenda — mesmas origens do card acima */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
        {activeFontes.map((b) => (
          <div key={b.key} className="flex items-center gap-1.5 text-[11px] text-tbs-mute-light dark:text-tbs-mute">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: b.color }} />
            {b.label}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Cada barra é um dia (data de inscrição); a altura é o total de inscritos e cada cor é uma origem — mesma classificação do card acima. Passe o mouse para ver a quebra do dia.
      </p>
    </section>
  );
}
