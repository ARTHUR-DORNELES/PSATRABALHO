'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { useTheme } from './ThemeProvider';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FONTE_BUCKETS, type FonteKey } from '@/lib/tbs-fonte';

type BucketKey = FonteKey;

// Cores das origens TBS (fonte da lib/tbs-fonte)
const PIE_COLORS = Object.fromEntries(FONTE_BUCKETS.map((b) => [b.key, b.color])) as Record<BucketKey, string>;

export function CanaisEntradaBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const { theme } = useTheme();
  const c = data.channels;
  const tipBg = theme === 'dark' ? '#1A1A24' : '#FFFFFF';
  const tipBorder = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const tipText = theme === 'dark' ? '#FFFFFF' : '#0E0E10';

  const mainBuckets = c.buckets.filter((b) => b.key !== 'untracked');
  const untracked = c.buckets.find((b) => b.key === 'untracked');
  const isEmpty = c.totalInPeriod === 0;

  const donutData = c.buckets.map((b) => ({
    key: b.key,
    name: b.label,
    value: b.count,
    pct: b.pct,
  }));

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Origens de entrada</h2>
          <p className="card-subtitle">origem dos inscritos TBS 2026 · fonte [TBS] via UTM</p>
        </div>
        {!isEmpty && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Total</div>
            <div className="kpi-value text-2xl">{formatNumber(c.totalInPeriod)}</div>
          </div>
        )}
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2 flex items-center justify-center">
          {isEmpty ? (
            <div className="w-[200px] h-[200px] rounded-full border-2 border-dashed border-tbs-line-light dark:border-tbs-line/60 flex items-center justify-center">
              <span className="text-xs text-tbs-mute-light dark:text-tbs-mute text-center px-6">sem dados ainda</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={1}
                  cursor="pointer"
                  onClick={(slice: { key?: string }) => slice?.key && drillForBucket(slice.key, open)}
                >
                  {donutData.map((d) => (
                    <Cell key={d.key} fill={PIE_COLORS[d.key as BucketKey]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: `1px solid ${tipBorder}`, background: tipBg, fontSize: 12 }}
                  itemStyle={{ color: tipText }}
                  labelStyle={{ color: tipText }}
                  formatter={(v: number) => formatNumber(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-3 flex flex-col justify-center">
          <ul className="divide-y divide-tbs-line-light dark:divide-tbs-line">
            {c.buckets.map((b) => {
              const k = b.key as BucketKey;
              const isZero = b.count === 0;
              return (
                <li key={b.key}>
                  <button
                    onClick={() => drillForBucket(b.key, open)}
                    className="w-full flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3/60 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: PIE_COLORS[k] }} />
                      <span className={`text-sm truncate ${isZero ? 'text-tbs-mute-light dark:text-tbs-mute' : 'text-tbs-ink-light dark:text-white'}`}>
                        {b.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`kpi-value text-sm ${isZero ? 'text-tbs-mute-light dark:text-tbs-mute font-normal' : ''}`}>
                        {formatNumber(b.count)}
                      </span>
                      <span className="text-xs text-tbs-mute-light dark:text-tbs-mute font-mono w-12 text-right">
                        {isZero ? '0%' : formatPct(b.pct, b.pct < 0.01 ? 2 : 0)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Influência Otaviano — pago × orgânico, dentro das origens */}
      {data.otavianoInfluencia && (data.otavianoInfluencia.pago.inscritos + data.otavianoInfluencia.organico.inscritos) > 0 && (() => {
        const o = data.otavianoInfluencia!;
        const total = o.pago.inscritos + o.organico.inscritos;
        const segs = [
          { key: 'organico' as const, label: 'Otaviano orgânico', sub: 'redes / ManyChat dele', color: '#D946EF', ...o.organico, tag: 'conta em Social Orgânico' },
          { key: 'pago' as const, label: 'Otaviano pago', sub: 'criativo dele em anúncio', color: '#FF6B1A', ...o.pago, tag: 'conta no Social Pago' },
        ];
        return (
          <div className="border-t border-tbs-line-light dark:border-tbs-line pt-4 mt-2">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Influência Otaviano</span>
              <span className="text-xs text-tbs-mute-light dark:text-tbs-mute">total {formatNumber(total)} inscritos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {segs.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => open({ type: 'otaviano', value: s.key, edition: '2026' })}
                  className="text-left rounded-lg border border-tbs-line-light dark:border-tbs-line px-3 py-2.5 hover:border-tbs-orange/60 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-tbs-ink-light dark:text-white">{s.label}</span>
                    <span className="ml-auto kpi-value text-lg">{formatNumber(s.inscritos)}</span>
                  </div>
                  <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-0.5">
                    {s.sub} · <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(s.vendas)} vendas</strong> · <strong className="text-tbs-ink-light dark:text-white" title="vendas ÷ inscritos">{s.inscritos > 0 ? ((s.vendas / s.inscritos) * 100).toFixed(1).replace('.', ',') : '0'}% conv</strong>
                  </div>
                  <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-0.5">{s.tag}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
O Otaviano não é um canal próprio — é um <strong>overlay</strong>. <strong>Orgânico</strong> (redes/ManyChat dele, <code>utm_term</code>) conta em <strong>Social Orgânico</strong>; <strong>Pago</strong> (criativo dele no anúncio, <code>utm_content</code>) segue contando em <strong>Social Pago</strong> pro ROAS. Aqui é só pra enxergar a influência total. Clique pra ver os contatos.
            </p>
          </div>
        );
      })()}

      {/* Influência Karnal — criativo dele em anúncio (overlay de Social Pago) */}
      {data.karnalInfluencia && (data.karnalInfluencia.pago.inscritos + data.karnalInfluencia.organico.inscritos) > 0 && (() => {
        const o = data.karnalInfluencia!;
        const total = o.pago.inscritos + o.organico.inscritos;
        const segs = [
          { key: 'organico' as const, label: 'Karnal orgânico', sub: 'mesmo criativo fora de mídia paga', color: '#6366F1', ...o.organico, tag: 'não pago' },
          { key: 'pago' as const, label: 'Karnal pago', sub: 'criativo dele em anúncio', color: '#0EA5E9', ...o.pago, tag: 'conta no Social Pago' },
        ];
        return (
          <div className="border-t border-tbs-line-light dark:border-tbs-line pt-4 mt-2">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Influência Karnal</span>
              <span className="text-xs text-tbs-mute-light dark:text-tbs-mute">total {formatNumber(total)} inscritos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {segs.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => open({ type: 'karnal', value: s.key, edition: '2026' })}
                  className="text-left rounded-lg border border-tbs-line-light dark:border-tbs-line px-3 py-2.5 hover:border-tbs-orange/60 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-tbs-ink-light dark:text-white">{s.label}</span>
                    <span className="ml-auto kpi-value text-lg">{formatNumber(s.inscritos)}</span>
                  </div>
                  <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-0.5">
                    {s.sub} · <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(s.vendas)} vendas</strong> · <strong className="text-tbs-ink-light dark:text-white" title="vendas ÷ inscritos">{s.inscritos > 0 ? ((s.vendas / s.inscritos) * 100).toFixed(1).replace('.', ',') : '0'}% conv</strong>
                  </div>
                  <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-0.5">{s.tag}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
              <strong>Pago</strong> = anúncios do Meta com o criativo do Karnal (<code>utm_content</code>) — esses <strong>seguem contando em Social Pago</strong> pro ROAS. Diferente do Otaviano, o Karnal <strong>não tem canal próprio de tráfego</strong>; é um overlay pra enxergar quanto ele converteu. Clique pra ver os contatos.
            </p>
          </div>
        );
      })()}

      {/* Cobertura */}
      <div className="border-t border-tbs-line-light dark:border-tbs-line pt-4 mt-2">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
            Cobertura de tagueamento
          </span>
          <span className="text-xs text-tbs-mute-light dark:text-tbs-mute">
            {formatNumber(c.coverage.withSignal)} com sinal · {formatNumber(c.coverage.noSignal)} sem
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-tbs-line-light dark:bg-tbs-bg-3">
          <div
            className="h-full bg-gradient-to-r from-tbs-orange-deep to-tbs-orange-light"
            style={{ width: `${c.coverage.withSignalPct * 100}%` }}
          />
        </div>
      </div>

      {/* Top UTMs — se houver */}
      {!isEmpty && (c.topUtmSource.length > 0 || c.topUtmMedium.length > 0 || c.topUtmCampaign.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
          <UtmList
            title="utm_source_tbs"
            items={c.topUtmSource}
            onClick={(v) => open({ type: 'utm_source_tbs', value: v, edition: '2026' })}
          />
          <UtmList
            title="utm_medium_tbs"
            items={c.topUtmMedium}
            onClick={(v) => open({ type: 'utm_medium_tbs', value: v, edition: '2026' })}
          />
          <UtmList
            title="utm_campaign_tbs"
            items={c.topUtmCampaign}
            onClick={(v) => open({ type: 'utm_campaign_tbs', value: v, edition: '2026' })}
          />
        </div>
      )}

      {/* Nota */}
      {c.note && (
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">{c.note}</p>
      )}
    </section>
  );
}

function UtmList({
  title,
  items,
  onClick,
}: {
  title: string;
  items: { label: string; value: number }[];
  onClick?: (label: string) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-1.5 font-mono">{title}</h3>
      <ul className="space-y-0.5">
        {items.length === 0 ? (
          <li className="text-[11px] text-tbs-mute-light dark:text-tbs-mute italic">—</li>
        ) : (
          items.map((it) => (
            <li key={it.label}>
              <button
                disabled={!onClick}
                onClick={onClick ? () => onClick(it.label) : undefined}
                className={`w-full flex items-center justify-between text-xs px-2 py-1 rounded ${
                  onClick ? 'hover:bg-tbs-orange-50/40 cursor-pointer' : 'cursor-default'
                } transition`}
              >
                <span className="font-mono truncate max-w-[170px]" title={it.label}>
                  {it.label}
                </span>
                <span className="text-tbs-ink font-semibold">{it.value}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function drillForBucket(key: string, open: ReturnType<typeof useDrill>['open']) {
  open({ type: 'tbs_fonte', value: key, edition: '2026' });
}
