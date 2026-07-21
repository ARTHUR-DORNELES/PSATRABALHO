'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHANGELOG, TIPO_LABEL, DIA_MARCO, type ChangeTipo, type ChangelogEntry } from '@/lib/changelog';
import { AREAS } from '@/lib/areas';
import type { Ocorrencia, Status } from '@/lib/registros-store';

const TIPO_STYLE: Record<ChangeTipo, string> = {
  novo: 'bg-tbs-orange/15 text-tbs-orange-deep dark:text-tbs-orange-light border-tbs-orange/30',
  melhoria: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  ajuste: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  correcao: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
};
const STATUS_META: Record<Status, { label: string; chip: string; dot: string }> = {
  aberto: { label: 'Aberto', chip: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', dot: 'bg-red-500' },
  andamento: { label: 'Em andamento', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  resolvido: { label: 'Resolvido', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
};
const STATUS_KEYS: Status[] = ['aberto', 'andamento', 'resolvido'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtData = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const fmtHora = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d); };
const DIA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const fmtDiaLongo = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${pad(d)}/${pad(m)}/${y} · ${DIA_SEMANA[new Date(y, m - 1, d).getDay()]}`; };

const inputCls = 'w-full rounded-lg border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-bg-2 px-3 py-2 text-sm text-tbs-ink-light dark:text-white placeholder:text-tbs-mute-light/60 dark:placeholder:text-tbs-mute/60 focus:outline-none focus:border-tbs-orange';
const labelCls = 'block text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-1';

type FormState = { id?: string; data: string; titulo: string; descricao: string; areaOrigem: string; areaResponsavel: string; relator: string };
const emptyForm = (): FormState => ({ data: todayStr(), titulo: '', descricao: '', areaOrigem: '', areaResponsavel: '', relator: '' });

export function RegistrosBlock() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [changelogDin, setChangelogDin] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | 'todas'>('todas');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const r = await fetch('/api/registros', { cache: 'no-store' });
      const j = await r.json();
      setConfigured(!!j.configured);
      setOcorrencias(Array.isArray(j.ocorrencias) ? j.ocorrencias : []);
      setChangelogDin(Array.isArray(j.changelog) ? j.changelog : []);
      if (j.error) setErro(j.error);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); setConfigured(false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const porDia = useMemo(() => {
    const m = new Map<string, Ocorrencia[]>();
    for (const o of ocorrencias) { const a = m.get(o.data) || []; a.push(o); m.set(o.data, a); }
    return m;
  }, [ocorrencias]);

  const visiveis = useMemo(() => {
    let list = ocorrencias;
    if (selectedDay) list = list.filter((o) => o.data === selectedDay);
    if (statusFilter !== 'todas') list = list.filter((o) => o.status === statusFilter);
    return list;
  }, [ocorrencias, selectedDay, statusFilter]);

  const abertosCount = ocorrencias.filter((o) => o.status !== 'resolvido').length;

  // changelog = seed estático + dinâmico (Redis, adicionado a cada deploy), dedupe e agrupado por dia
  const changelogMerged = useMemo(() => {
    const seen = new Set<string>();
    const out: ChangelogEntry[] = [];
    for (const c of [...CHANGELOG, ...changelogDin]) {
      const k = `${c.date}|${c.time}|${c.titulo}`;
      if (seen.has(k)) continue;
      seen.add(k); out.push(c);
    }
    return out;
  }, [changelogDin]);

  const changelogPorDia = useMemo(() => {
    const m = new Map<string, ChangelogEntry[]>();
    for (const c of changelogMerged) { const a = m.get(c.date) || []; a.push(c); m.set(c.date, a); }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, items: items.slice().sort((x, y) => y.time.localeCompare(x.time)) }));
  }, [changelogMerged]);

  // ── grid do mês ──
  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const prevMonth = () => { const m = viewM - 1; if (m < 0) { setViewM(11); setViewY(viewY - 1); } else setViewM(m); };
  const nextMonth = () => { const m = viewM + 1; if (m > 11) { setViewM(0); setViewY(viewY + 1); } else setViewM(m); };

  const startEdit = (o: Ocorrencia) => {
    setForm({ id: o.id, data: o.data, titulo: o.titulo, descricao: o.descricao, areaOrigem: o.areaOrigem, areaResponsavel: o.areaResponsavel, relator: o.relator });
    setShowForm(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetForm = () => { setForm({ ...emptyForm(), data: selectedDay || todayStr() }); setShowForm(false); };

  const submit = async () => {
    setBusy(true); setErro(null);
    try {
      const editing = !!form.id;
      const r = await fetch('/api/registros', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      const o: Ocorrencia = j.ocorrencia;
      setOcorrencias((prev) => editing ? prev.map((x) => x.id === o.id ? o : x) : [o, ...prev]);
      resetForm();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const setStatus = async (o: Ocorrencia, status: Status) => {
    setOcorrencias((prev) => prev.map((x) => x.id === o.id ? { ...x, status } : x)); // otimista
    try {
      const r = await fetch('/api/registros', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, status }) });
      if (!r.ok) throw new Error();
    } catch { load(); }
  };
  const remover = async (o: Ocorrencia) => {
    if (typeof window !== 'undefined' && !window.confirm(`Excluir a ocorrência "${o.titulo}"?`)) return;
    setOcorrencias((prev) => prev.filter((x) => x.id !== o.id));
    try { await fetch(`/api/registros?id=${encodeURIComponent(o.id)}`, { method: 'DELETE' }); } catch { load(); }
  };

  return (
    <div className="space-y-5">
      {/* ───────── Changelog ───────── */}
      <section className="rounded-2xl border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-surface p-5">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="text-lg font-semibold text-tbs-ink-light dark:text-white">Atualizações do painel</h2>
          <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">{changelogMerged.length} registros · {changelogPorDia.length} dias · horário de Brasília</span>
        </div>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mb-4">Tudo que foi ajustado, melhorado ou corrigido no painel — desde a criação (18/05), dia a dia e por hora.</p>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {changelogPorDia.map(({ date, items }) => (
            <div key={date}>
              <div className="sticky top-0 z-10 flex flex-wrap items-baseline gap-2 py-1 bg-tbs-surface-light dark:bg-tbs-surface">
                <span className="text-[12px] font-bold text-tbs-ink-light dark:text-white font-mono">{fmtDiaLongo(date)}</span>
                {DIA_MARCO[date] && <span className="text-[10px] uppercase tracking-wider text-tbs-orange-deep dark:text-tbs-orange-light font-semibold">· {DIA_MARCO[date]}</span>}
                <span className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">({items.length})</span>
              </div>
              <ol className="relative border-l border-tbs-line-light dark:border-tbs-line ml-1.5 mt-1 space-y-2.5">
                {items.map((c, i) => (
                  <li key={i} className="ml-4">
                    <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-tbs-orange" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute font-mono tabular-nums">{c.time}</span>
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${TIPO_STYLE[c.tipo]}`}>{TIPO_LABEL[c.tipo]}</span>
                      <span className="text-[13px] font-medium text-tbs-ink-light dark:text-white">{c.titulo}</span>
                    </div>
                    {c.desc && <p className="text-[12px] text-tbs-mute-light dark:text-tbs-mute mt-0.5 leading-relaxed">{c.desc}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Ocorrências (calendário editável) ───────── */}
      <section className="rounded-2xl border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-lg font-semibold text-tbs-ink-light dark:text-white">Ocorrências do TBS</h2>
          <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">
            {abertosCount > 0 ? `${abertosCount} em aberto` : 'nenhuma em aberto'} · {ocorrencias.length} no total
          </span>
        </div>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mb-4">Relate qualquer impedimento, problema ou erro durante o TBS. Diga a <strong>área de origem</strong> e a <strong>área responsável por resolver</strong> pra todo mundo ficar ciente.</p>

        {loading && <p className="text-sm text-tbs-mute-light dark:text-tbs-mute py-6 text-center">Carregando…</p>}

        {!loading && configured === false && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <strong>Armazenamento ainda não conectado.</strong> O calendário de ocorrências precisa de um banco compartilhado (Vercel KV) pra guardar os relatos de todo mundo. Assim que conectar, esta seção ativa automaticamente — o histórico de atualizações acima já funciona.
          </div>
        )}

        {!loading && configured && (
          <>
            {erro && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">{erro}</div>}

            <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-5">
              {/* Calendário */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={prevMonth} className="px-2 py-1 rounded-md text-tbs-mute-light dark:text-tbs-mute hover:bg-tbs-orange/10 hover:text-tbs-orange transition" aria-label="Mês anterior">‹</button>
                  <span className="text-sm font-semibold text-tbs-ink-light dark:text-white">{MESES[viewM]} {viewY}</span>
                  <button onClick={nextMonth} className="px-2 py-1 rounded-md text-tbs-mute-light dark:text-tbs-mute hover:bg-tbs-orange/10 hover:text-tbs-orange transition" aria-label="Próximo mês">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS.map((w) => <div key={w} className="text-[10px] uppercase text-tbs-mute-light dark:text-tbs-mute py-1">{w}</div>)}
                  {cells.map((day, i) => {
                    if (day === null) return <div key={i} />;
                    const ds = `${viewY}-${pad(viewM + 1)}-${pad(day)}`;
                    const items = porDia.get(ds) || [];
                    const isToday = ds === todayStr();
                    const isSel = ds === selectedDay;
                    const statuses = new Set(items.map((o) => o.status));
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDay(isSel ? null : ds); setForm((f) => ({ ...f, data: ds })); }}
                        className={`relative aspect-square rounded-lg text-[12px] flex flex-col items-center justify-center transition border ${
                          isSel ? 'border-tbs-orange bg-tbs-orange/15 text-tbs-orange-deep dark:text-tbs-orange-light'
                          : isToday ? 'border-tbs-orange/40 text-tbs-ink-light dark:text-white'
                          : 'border-transparent text-tbs-ink-light dark:text-white hover:bg-tbs-orange/5 hover:border-tbs-line-light dark:hover:border-tbs-line'
                        }`}
                      >
                        <span className={items.length ? 'font-semibold' : ''}>{day}</span>
                        {items.length > 0 && (
                          <span className="flex gap-0.5 mt-0.5">
                            {STATUS_KEYS.filter((s) => statuses.has(s)).map((s) => <span key={s} className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedDay && (
                  <button onClick={() => setSelectedDay(null)} className="mt-2 text-[11px] text-tbs-orange hover:underline">
                    ✕ limpar filtro do dia {fmtData(selectedDay)}
                  </button>
                )}
                <button onClick={() => { setForm({ ...emptyForm(), data: selectedDay || todayStr() }); setShowForm((v) => !v); }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-tbs-orange text-white hover:bg-tbs-orange-light transition">
                  {showForm && !form.id ? '✕ Fechar' : '+ Relatar ocorrência'}
                </button>
              </div>

              {/* Form + lista */}
              <div>
                {(showForm || form.id) && (
                  <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line bg-tbs-bg-light dark:bg-tbs-bg-2 p-4 mb-4">
                    <h3 className="text-sm font-semibold text-tbs-ink-light dark:text-white mb-3">{form.id ? 'Editar ocorrência' : 'Nova ocorrência'}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Título *</label>
                        <input className={inputCls} value={form.titulo} maxLength={160} placeholder="Ex: Link de inscrição fora do ar" onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Descrição</label>
                        <textarea className={inputCls} rows={2} value={form.descricao} placeholder="O que houve, impacto, prints…" onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Data *</label>
                        <input type="date" className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Quem está relatando *</label>
                        <input className={inputCls} value={form.relator} maxLength={80} placeholder="Seu nome" onChange={(e) => setForm({ ...form, relator: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Área de origem (quem está fazendo) *</label>
                        <select className={inputCls} value={form.areaOrigem} onChange={(e) => setForm({ ...form, areaOrigem: e.target.value })}>
                          <option value="">Selecione…</option>
                          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Área responsável (quem resolve) *</label>
                        <select className={inputCls} value={form.areaResponsavel} onChange={(e) => setForm({ ...form, areaResponsavel: e.target.value })}>
                          <option value="">Selecione…</option>
                          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider bg-tbs-orange text-white hover:bg-tbs-orange-light disabled:opacity-50 transition">
                        {busy ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Registrar'}
                      </button>
                      <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:text-tbs-ink-light dark:hover:text-white transition">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Filtros de status */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(['todas', ...STATUS_KEYS] as const).map((s) => {
                    const active = statusFilter === s;
                    const lbl = s === 'todas' ? 'Todas' : STATUS_META[s].label;
                    return (
                      <button key={s} onClick={() => setStatusFilter(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition ${active ? 'bg-tbs-orange text-white border-tbs-orange' : 'border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:border-tbs-orange/50'}`}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>

                {/* Lista */}
                {visiveis.length === 0 ? (
                  <p className="text-sm text-tbs-mute-light dark:text-tbs-mute py-8 text-center">
                    {selectedDay ? `Nenhuma ocorrência em ${fmtData(selectedDay)}.` : 'Nenhuma ocorrência registrada ainda.'}
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {visiveis.map((o) => (
                      <li key={o.id} className="rounded-xl border border-tbs-line-light dark:border-tbs-line bg-tbs-bg-light dark:bg-tbs-bg-2 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${STATUS_META[o.status].chip}`}>{STATUS_META[o.status].label}</span>
                              <span className="text-sm font-semibold text-tbs-ink-light dark:text-white">{o.titulo}</span>
                            </div>
                            {o.descricao && <p className="text-[12px] text-tbs-mute-light dark:text-tbs-mute mt-1 leading-relaxed whitespace-pre-wrap">{o.descricao}</p>}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px]">
                              <span className="px-2 py-0.5 rounded-full bg-tbs-bg-3/60 dark:bg-tbs-bg-3 text-tbs-mute-light dark:text-tbs-mute border border-tbs-line-light dark:border-tbs-line">{o.areaOrigem}</span>
                              <span className="text-tbs-mute-light dark:text-tbs-mute">→ resolve:</span>
                              <span className="px-2 py-0.5 rounded-full bg-tbs-orange/10 text-tbs-orange-deep dark:text-tbs-orange-light border border-tbs-orange/30 font-medium">{o.areaResponsavel}</span>
                            </div>
                            <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-1.5 font-mono">
                              {fmtData(o.data)} · por {o.relator}{o.atualizadoEm ? ` · editado ${fmtData(o.atualizadoEm.slice(0, 10))} ${fmtHora(o.atualizadoEm)}` : ''}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <select value={o.status} onChange={(e) => setStatus(o, e.target.value as Status)}
                              className="text-[11px] rounded-md border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-surface px-1.5 py-1 text-tbs-ink-light dark:text-white focus:outline-none focus:border-tbs-orange">
                              {STATUS_KEYS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                            </select>
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(o)} className="text-[11px] px-2 py-1 rounded-md text-tbs-mute-light dark:text-tbs-mute hover:text-tbs-orange hover:bg-tbs-orange/10 transition">editar</button>
                              <button onClick={() => remover(o)} className="text-[11px] px-2 py-1 rounded-md text-tbs-mute-light dark:text-tbs-mute hover:text-red-500 hover:bg-red-500/10 transition">excluir</button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
