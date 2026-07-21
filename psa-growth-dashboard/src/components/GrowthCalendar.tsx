"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, ArrowRight, CalendarDays } from "lucide-react";
import clsx from "clsx";
import { Pill } from "./Pill";
import type { ChannelKind, ExperimentStatus, Recommendation } from "@/lib/types";
import {
  CHANNEL_LABEL,
  FRONTS,
  NO_FRONT_COLOR,
  frontColor,
  frontName,
  RECO_LABEL,
  RECO_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/ui";
import { fmtDate, fmtLift, fmtPct } from "@/lib/format";

export type CalendarEvent = {
  id: string;
  code: string | null;
  name: string;
  channelKind: ChannelKind;
  channelName: string;
  front: string | null;
  startedAt: string; // YYYY-MM-DD
  endedAt: string | null;
  deadline: string | null;
  status: ExperimentStatus;
  hypothesis: string;
  targetMetricLabel: string | null;
  relativeLift: number | null;
  confidence: number | null;
  recommendation: Recommendation | null;
};

type Day = { date: string; day: number; inMonth: boolean };
type Bar = { ev: CalendarEvent; colStart: number; colEnd: number; lane: number; isStart: boolean };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function GrowthCalendar({
  events,
  initialYear,
  initialMonth,
  today,
}: {
  events: CalendarEvent[];
  initialYear: number;
  initialMonth: number;
  today: string;
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [filterFront, setFilterFront] = useState<string | null>(null);
  const [savingFront, setSavingFront] = useState(false);

  const visibleEvents = useMemo(() => {
    if (filterFront === null) return events;
    if (filterFront === "none") return events.filter((e) => !e.front);
    return events.filter((e) => e.front === filterFront);
  }, [events, filterFront]);

  // Fim efetivo da barra: data de fim, ou hoje (se em andamento), nunca antes do início.
  const endEff = (ev: CalendarEvent) => {
    const e = ev.endedAt ?? today;
    return e < ev.startedAt ? ev.startedAt : e;
  };

  // 6 semanas × 7 dias, com datas reais (inclui dias de meses vizinhos).
  const weeks = useMemo(() => {
    const startWeekday = new Date(year, month, 1).getDay();
    const ws: Day[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: Day[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(year, month, 1 - startWeekday + w * 7 + d);
        row.push({
          date: ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()),
          day: dt.getDate(),
          inMonth: dt.getMonth() === month,
        });
      }
      ws.push(row);
    }
    return ws;
  }, [year, month]);

  function buildWeekBars(days: Day[]): { bars: Bar[]; laneCount: number } {
    const first = days[0].date;
    const last = days[6].date;
    const active = visibleEvents
      .filter((ev) => ev.startedAt <= last && endEff(ev) >= first)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || endEff(b).localeCompare(endEff(a)));
    const laneEnds: number[] = [];
    const bars: Bar[] = active.map((ev) => {
      const e = endEff(ev);
      let colStart = days.findIndex((d) => d.date >= ev.startedAt);
      if (colStart < 0) colStart = 0;
      let colEnd = 6;
      for (let i = 6; i >= 0; i--) {
        if (days[i].date <= e) { colEnd = i; break; }
      }
      if (colEnd < colStart) colEnd = colStart;
      let lane = laneEnds.findIndex((le) => colStart > le);
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(colEnd); } else { laneEnds[lane] = colEnd; }
      return { ev, colStart, colEnd, lane, isStart: ev.startedAt >= first };
    });
    return { bars, laneCount: laneEnds.length };
  }

  function prev() {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  }
  function next() {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  }
  function goToday() {
    const [tya, tma] = today.split("-").map(Number);
    setYear(tya); setMonth(tma - 1);
  }

  async function changeFront(ev: CalendarEvent, newFront: string) {
    setSavingFront(true);
    try {
      await fetch(`/api/experiments/${ev.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ front: newFront || null }),
      });
      setSelected({ ...ev, front: newFront || null });
      router.refresh();
    } finally {
      setSavingFront(false);
    }
  }

  // Conta ações ativas em algum dia do mês visível.
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
  const monthCount = visibleEvents.filter((e) => e.startedAt <= monthEnd && endEff(e) >= monthStart).length;

  const chipCls = (active: boolean) =>
    clsx(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
      active ? "bg-psa-accent/15 text-white ring-1 ring-psa-accent/50" : "bg-white/5 text-psa-muted hover:text-white",
    );

  return (
    <div className="p-8">
      {/* Navegação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="psa-btn-ghost px-2" aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <h2 className="min-w-52 text-center font-display text-xl tracking-tight text-white">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={next} className="psa-btn-ghost px-2" aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
          <button onClick={goToday} className="psa-btn-ghost ml-1 text-xs">Hoje</button>
          <span className="ml-2 text-xs text-psa-muted">
            {monthCount} ação{monthCount === 1 ? "" : "s"} ativa{monthCount === 1 ? "" : "s"} neste mês
          </span>
        </div>
        <Link href="/experiments/new" className="psa-btn-primary" prefetch={false}>
          <Plus size={16} /> Novo experimento
        </Link>
      </div>

      {/* Filtro por frente (também é a legenda de cores) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-psa-muted">Frente:</span>
        <button onClick={() => setFilterFront(null)} className={chipCls(filterFront === null)}>Todas</button>
        {FRONTS.map((f) => (
          <button key={f.key} onClick={() => setFilterFront(f.key)} className={chipCls(filterFront === f.key)}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: f.color }} />
            {f.name}
          </button>
        ))}
        <button onClick={() => setFilterFront("none")} className={chipCls(filterFront === "none")}>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NO_FRONT_COLOR }} />
          Sem frente
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 overflow-hidden rounded-t-xl border border-psa-border bg-psa-surface">
        {WEEKDAYS.map((w) => (
          <div key={w} className="border-l border-psa-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-psa-muted first:border-l-0">
            {w}
          </div>
        ))}
      </div>

      {/* Semanas com barras de duração */}
      <div className="overflow-hidden rounded-b-xl border border-t-0 border-psa-border bg-psa-card">
        {weeks.map((days, wi) => {
          const { bars, laneCount } = buildWeekBars(days);
          const minH = 34 + laneCount * 22 + 8;
          return (
            <div key={wi} className={clsx("relative", wi > 0 && "border-t border-psa-border")}>
              <div className="grid grid-cols-7">
                {days.map((d, di) => (
                  <div
                    key={di}
                    style={{ minHeight: minH }}
                    className={clsx("group border-l border-psa-border p-1.5 first:border-l-0", !d.inMonth && "bg-psa-bg/40")}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          d.date === today
                            ? "bg-psa-accent font-bold text-[#06231a]"
                            : d.inMonth ? "text-psa-muted" : "text-psa-muted/40",
                        )}
                      >
                        {d.day}
                      </span>
                      {d.inMonth && (
                        <Link
                          href={`/experiments/new?date=${d.date}`}
                          prefetch={false}
                          title="Adicionar teste neste dia"
                          className="flex h-5 w-5 items-center justify-center rounded text-psa-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-psa-accent group-hover:opacity-100"
                        >
                          <Plus size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {bars.map((bar) => (
                <button
                  key={bar.ev.id}
                  onClick={() => setSelected(bar.ev)}
                  title={`${bar.ev.name} · ${frontName(bar.ev.front)}`}
                  className="absolute truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-[#06231a] transition hover:brightness-110"
                  style={{
                    left: `calc(${(bar.colStart / 7) * 100}% + 3px)`,
                    width: `calc(${((bar.colEnd - bar.colStart + 1) / 7) * 100}% - 6px)`,
                    top: 32 + bar.lane * 22,
                    backgroundColor: frontColor(bar.ev.front),
                  }}
                >
                  {bar.isStart ? bar.ev.name : `↳ ${bar.ev.name}`}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Painel de detalhe */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} aria-hidden />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-psa-border bg-psa-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-psa-muted">
                  {selected.channelName}
                  {selected.code && <span className="text-psa-border">·</span>}
                  {selected.code}
                </div>
                <h3 className="mt-1 font-display text-lg leading-tight tracking-tight text-white">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-psa-muted hover:text-white" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className="psa-pill"
                style={{ backgroundColor: `${frontColor(selected.front)}22`, color: frontColor(selected.front) }}
              >
                {frontName(selected.front)}
              </span>
              <Pill tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Pill>
              {selected.recommendation && (
                <Pill tone={RECO_TONE[selected.recommendation]}>{RECO_LABEL[selected.recommendation]}</Pill>
              )}
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="psa-label">Frente</dt>
                <dd>
                  <select
                    value={selected.front ?? ""}
                    onChange={(e) => changeFront(selected, e.target.value)}
                    disabled={savingFront}
                    className="psa-select"
                  >
                    <option value="">Sem frente</option>
                    {FRONTS.map((f) => (
                      <option key={f.key} value={f.key}>{f.name}</option>
                    ))}
                  </select>
                  {savingFront && <span className="mt-1 block text-[11px] text-psa-muted">salvando…</span>}
                </dd>
              </div>
              <div>
                <dt className="psa-label">Período</dt>
                <dd className="flex items-center gap-2 text-psa-ice">
                  <CalendarDays size={14} className="text-psa-muted" />
                  {fmtDate(selected.startedAt)}
                  {selected.endedAt ? ` → ${fmtDate(selected.endedAt)}` : " → em andamento"}
                </dd>
                {selected.deadline && (
                  <dd className="mt-1 text-xs text-psa-muted">Prazo de decisão: {fmtDate(selected.deadline)}</dd>
                )}
              </div>
              <div>
                <dt className="psa-label">Canal</dt>
                <dd className="text-psa-ice">{CHANNEL_LABEL[selected.channelKind]}</dd>
              </div>
              <div>
                <dt className="psa-label">Hipótese</dt>
                <dd className="text-psa-ice">{selected.hypothesis}</dd>
              </div>
              {selected.targetMetricLabel && (
                <div className="grid grid-cols-3 gap-3 border-t border-psa-border pt-3">
                  <div>
                    <dt className="text-xs text-psa-muted">Métrica</dt>
                    <dd className="text-sm font-semibold text-white">{selected.targetMetricLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-psa-muted">Lift</dt>
                    <dd className="text-sm font-semibold text-white">{fmtLift(selected.relativeLift)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-psa-muted">Confiança</dt>
                    <dd className="text-sm font-semibold text-white">{fmtPct(selected.confidence)}</dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="mt-auto pt-6">
              <Link href={`/experiments/${selected.id}`} className="psa-btn-primary w-full" prefetch={false}>
                Ver detalhe completo <ArrowRight size={15} />
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
