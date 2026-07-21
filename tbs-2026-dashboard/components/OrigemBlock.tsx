'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDrill } from './DrillProvider';
import { isInscriptionOpen } from '@/lib/dates';
import { AwaitingState } from './AwaitingState';

const PIE_COLORS = ['#D14A0F', '#F08220', '#FFA52A', '#FFD580', '#FFE1BF'];
const BAR_COLOR = '#F08220';

export function OrigemBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();

  if (!isOpen) {
    return (
      <section className="card">
        <div className="flex items-end justify-between mb-1">
          <h2 className="display uppercase text-lg">Origem & canais</h2>
          <span className="text-xs text-tbs-mute">de onde vêm os inscritos</span>
        </div>
        <div className="divider-gradient w-16 mb-4" />
        <AwaitingState
          title="Origem aguardando inscrições"
          hint="Distribuição por origem macro (Lead Nativo / TBS 2024 / 2025) e canal de aquisição (UTMs / Meta / Google) só faz sentido com inscrições reais. Começa a popular pós 01/06."
        />
      </section>
    );
  }

  const macro = data.origem.macro.filter((m) => m.value > 0);
  const src = data.origem.analyticsSource;
  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">Origem & canais</h2>
        <span className="text-xs text-tbs-mute">de onde vêm os inscritos · clique pra explorar</span>
      </div>
      <div className="divider-gradient w-16 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">tbs___origem_macro</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={macro}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                onClick={(slice: { label?: string }) => slice?.label && open({ type: 'origem_macro', value: slice.label })}
                cursor="pointer"
              >
                {macro.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatNumber(v)} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="text-xs space-y-1 mt-2">
            {macro.map((m, i) => (
              <li key={m.label}>
                <button
                  onClick={() => open({ type: 'origem_macro', value: m.label })}
                  className="w-full flex items-center justify-between hover:bg-tbs-orange-50/40 px-2 py-1 -mx-2 rounded transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {m.label}
                  </span>
                  <span className="font-semibold">{formatNumber(m.value)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-tbs-mute mt-2">{data.origem.noteOrigem}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">hs_analytics_source</h3>
          <ul className="space-y-2">
            {src.map((s) => (
              <li key={s.label}>
                <button
                  onClick={() => open({ type: 'analytics_source', value: s.label, edition: '2025' })}
                  className="w-full flex items-center gap-3 text-xs hover:bg-tbs-orange-50/40 px-2 py-1 -mx-2 rounded transition cursor-pointer"
                >
                  <span className="w-28 truncate text-left">{s.label}</span>
                  <span className="flex-1 h-3 bg-tbs-orange-50 rounded-sm overflow-hidden">
                    <span className="block h-full" style={{ width: `${s.pct * 100}%`, background: BAR_COLOR }} />
                  </span>
                  <span className="w-20 text-right text-tbs-mute">
                    {formatNumber(s.value)} ({formatPct(s.pct, 1)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-tbs-mute mt-3 p-2 bg-red-50 border border-red-100 rounded">
            ⚠️ {data.origem.noteSource}
          </p>
        </div>
      </div>
    </section>
  );
}
