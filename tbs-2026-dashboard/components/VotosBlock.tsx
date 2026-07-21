'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VOTOS_ORDER, VOTOS_META, type VotoTipo, type VotoReport, type VotoRow } from '@/lib/votos';
import { useTheme } from './ThemeProvider';

const nf = new Intl.NumberFormat('pt-BR');
const fmtNum = (n: unknown) => nf.format(Number(n) || 0);
const fmtDia = (s: string) => { const p = String(s).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : s; };
const fmtDateTime = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
};

const COR_UNICOS = '#F08220';
const COR_TORCIDA = '#FFA52A';

export function VotosBlock() {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axis = theme === 'dark' ? '#9090A8' : '#6B6B72';
  const tipBg = theme === 'dark' ? '#1A1A24' : '#FFFFFF';
  const tipText = theme === 'dark' ? '#FFFFFF' : '#0E0E10';

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Record<VotoTipo, VotoReport | null>>({} as Record<VotoTipo, VotoReport | null>);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Partial<Record<VotoTipo, boolean>>>({});
  const [errByTipo, setErrByTipo] = useState<Partial<Record<VotoTipo, string>>>({});

  // filtros / interação
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [diaDe, setDiaDe] = useState('');
  const [diaAte, setDiaAte] = useState('');
  const [rankBusca, setRankBusca] = useState('');
  const [rankSort, setRankSort] = useState<'total' | 'unicos' | 'torcida'>('total');
  const [rankAll, setRankAll] = useState(false);
  const [listaBusca, setListaBusca] = useState('');
  const [listaVideo, setListaVideo] = useState<'todos' | 'com' | 'sem'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/votos', { cache: 'no-store' });
      const j = await r.json();
      setConfigured(!!j.configured);
      setReports((j.reports || {}) as Record<VotoTipo, VotoReport | null>);
    } catch {
      setConfigured(false);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = useCallback(async (tipo: VotoTipo, file: File) => {
    setBusy((b) => ({ ...b, [tipo]: true }));
    setErrByTipo((e) => ({ ...e, [tipo]: undefined }));
    try {
      const fd = new FormData();
      fd.append('tipo', tipo);
      fd.append('file', file);
      const r = await fetch('/api/votos', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || j.error) setErrByTipo((e) => ({ ...e, [tipo]: j.error || 'Falha ao importar.' }));
      else await load();
    } catch (e) {
      setErrByTipo((er) => ({ ...er, [tipo]: e instanceof Error ? e.message : String(e) }));
    } finally { setBusy((b) => ({ ...b, [tipo]: false })); }
  }, [load]);

  // inicializa o intervalo de datas quando o relatório por dia chega
  const diaRows = reports.dia?.rows as VotoRow[] | undefined;
  useEffect(() => {
    if (!diaRows || diaRows.length === 0) return;
    const dias = diaRows.map((r) => String(r.dia)).filter(Boolean).sort();
    if (!diaDe) setDiaDe(dias[0]);
    if (!diaAte) setDiaAte(dias[dias.length - 1]);
  }, [diaRows]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && configured === null) {
    return <div className="card text-sm text-tbs-mute-light dark:text-tbs-mute">Carregando relatórios de votos…</div>;
  }
  if (configured === false) {
    return (
      <div className="card">
        <h2 className="card-title">Votos</h2>
        <p className="card-subtitle">importação de relatórios da plataforma TBS</p>
        <div className="divider-accent mb-4" />
        <p className="text-sm text-amber-600 dark:text-amber-400">Armazenamento não configurado (REDIS_URL) — não dá pra salvar as importações ainda.</p>
      </div>
    );
  }

  const tudoVazio = VOTOS_ORDER.every((t) => !reports[t]);

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="card-title">Votos · TBS 2026</h2>
            <p className="card-subtitle">5 relatórios da plataforma — importe o .xlsx do backoffice em cada card pra atualizar</p>
          </div>
          {estadoFiltro && (
            <button onClick={() => setEstadoFiltro(null)} className="text-[11px] rounded-full px-3 py-1 bg-tbs-orange/15 text-tbs-orange-deep dark:text-tbs-orange-light border border-tbs-orange/30 hover:bg-tbs-orange/25 transition">
              filtrando: {estadoFiltro} ✕
            </button>
          )}
        </div>
        {tudoVazio && (
          <p className="text-[12px] text-tbs-mute-light dark:text-tbs-mute mt-3">
            Nenhum relatório importado ainda. Em cada card abaixo, clique em <strong>Importar</strong> e selecione o arquivo correspondente
            (ex.: <code>{VOTOS_META.dia.arquivo}</code>). Só o <strong>Votos por período</strong> tem data — os demais são totais do momento da exportação.
          </p>
        )}
      </section>

      <ReportCard tipo="dia" report={reports.dia} busy={!!busy.dia} err={errByTipo.dia} onImport={upload}>
        <DiaReport report={reports.dia} de={diaDe} ate={diaAte} setDe={setDiaDe} setAte={setDiaAte} grid={grid} axis={axis} tipBg={tipBg} tipText={tipText} />
      </ReportCard>

      <ReportCard tipo="etapa" report={reports.etapa} busy={!!busy.etapa} err={errByTipo.etapa} onImport={upload}>
        <EtapaReport report={reports.etapa} />
      </ReportCard>

      <ReportCard tipo="estado" report={reports.estado} busy={!!busy.estado} err={errByTipo.estado} onImport={upload}>
        <EstadoReport report={reports.estado} estadoFiltro={estadoFiltro} setEstadoFiltro={setEstadoFiltro} />
      </ReportCard>

      <ReportCard tipo="participante" report={reports.participante} busy={!!busy.participante} err={errByTipo.participante} onImport={upload}>
        <RankingReport report={reports.participante} estadoFiltro={estadoFiltro} setEstadoFiltro={setEstadoFiltro}
          busca={rankBusca} setBusca={setRankBusca} sort={rankSort} setSort={setRankSort} all={rankAll} setAll={setRankAll} />
      </ReportCard>

      <ReportCard tipo="participantes" report={reports.participantes} busy={!!busy.participantes} err={errByTipo.participantes} onImport={upload}>
        <ListaReport report={reports.participantes} estadoFiltro={estadoFiltro} setEstadoFiltro={setEstadoFiltro}
          busca={listaBusca} setBusca={setListaBusca} video={listaVideo} setVideo={setListaVideo} />
      </ReportCard>
    </div>
  );
}

// ─────────── Card genérico: header + importar + timestamp ───────────
function ReportCard({ tipo, report, busy, err, onImport, children }: {
  tipo: VotoTipo; report: VotoReport | null; busy: boolean; err?: string;
  onImport: (t: VotoTipo, f: File) => void; children: React.ReactNode;
}) {
  const meta = VOTOS_META[tipo];
  const inputRef = useRef<HTMLInputElement>(null);
  const ts = fmtDateTime(report?.importedAt);
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h2 className="card-title">{meta.label}</h2>
          <p className="card-subtitle">{meta.sub}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border border-tbs-orange/50 bg-tbs-orange/10 text-tbs-orange-deep dark:text-tbs-orange-light hover:bg-tbs-orange/20 hover:border-tbs-orange transition disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
            {busy ? 'Importando…' : report ? 'Reimportar' : 'Importar'}
          </button>
          <span className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">
            {ts ? <>última importação: <strong>{ts}</strong>{report?.rows ? ` · ${fmtNum(report.rows.length)} linhas` : ''}</> : 'nunca importado'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(tipo, f); e.target.value = ''; }}
          />
        </div>
      </div>
      <div className="divider-accent mb-4" />
      {err && <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">⚠ {err}</p>}
      {!report ? (
        <p className="text-sm text-tbs-mute-light dark:text-tbs-mute">
          Sem dados. Clique em <strong>Importar</strong> e envie <code>{meta.arquivo}</code>.
        </p>
      ) : children}
    </section>
  );
}

const num = (v: unknown) => Number(v) || 0;
const kpi = (label: string, value: number, color?: string) => (
  <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3 bg-tbs-surface-light dark:bg-tbs-bg-3/40">
    <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute leading-tight">{label}</div>
    <div className="kpi-value text-2xl" style={color ? { color } : undefined}>{fmtNum(value)}</div>
  </div>
);

// ─────────── 1 · Votos por período (com filtro de data) ───────────
function DiaReport({ report, de, ate, setDe, setAte, grid, axis, tipBg, tipText }: {
  report: VotoReport | null; de: string; ate: string; setDe: (s: string) => void; setAte: (s: string) => void;
  grid: string; axis: string; tipBg: string; tipText: string;
}) {
  const all = useMemo(() => (report?.rows ?? []).slice().sort((a, b) => String(a.dia).localeCompare(String(b.dia))), [report]);
  const rows = useMemo(() => all.filter((r) => { const d = String(r.dia); return (!de || d >= de) && (!ate || d <= ate); }), [all, de, ate]);
  const tot = rows.reduce((a, r) => a + num(r.total), 0);
  const totU = rows.reduce((a, r) => a + num(r.unicos), 0);
  const totT = rows.reduce((a, r) => a + num(r.torcida), 0);
  const chart = rows.map((r) => ({ dia: String(r.dia), Únicos: num(r.unicos), Torcida: num(r.torcida), total: num(r.total) }));
  const inputCls = 'rounded-lg border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-bg-2 px-2.5 py-1.5 text-sm text-tbs-ink-light dark:text-white focus:outline-none focus:border-tbs-orange';

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">De<br /><input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inputCls} /></label>
        <label className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">Até<br /><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inputCls} /></label>
        <div className="grid grid-cols-3 gap-2.5 flex-1 min-w-[260px]">
          {kpi('Total no período', tot)}
          {kpi('Únicos', totU, COR_UNICOS)}
          {kpi('Torcida', totT, COR_TORCIDA)}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chart} margin={{ top: 5, right: 12, left: 6, bottom: 5 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="dia" stroke={axis} fontSize={11} tickFormatter={fmtDia} minTickGap={16} />
          <YAxis stroke={axis} fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, background: tipBg, border: `1px solid ${grid}`, fontSize: 12 }}
            itemStyle={{ color: tipText }} labelStyle={{ color: tipText }}
            formatter={(v: number, n: string) => [fmtNum(v), n]}
            labelFormatter={(l) => fmtDia(l as string)}
          />
          <Bar dataKey="Únicos" stackId="v" fill={COR_UNICOS} />
          <Bar dataKey="Torcida" stackId="v" fill={COR_TORCIDA} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[11px] text-tbs-mute-light dark:text-tbs-mute">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_UNICOS }} />Únicos (votantes distintos)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_TORCIDA }} />Torcida (votos extras)</span>
      </div>
      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2">Total do dia = Únicos + Torcida. Ajuste o intervalo nos campos De/Até.</p>
    </div>
  );
}

// ─────────── 2 · Votos por etapa ───────────
function EtapaReport({ report }: { report: VotoReport | null }) {
  const rows = report?.rows ?? [];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="text-sm font-semibold text-tbs-ink-light dark:text-white mb-2">{String(r.etapa) || '—'}{r.agendamento && String(r.agendamento) !== String(r.etapa) ? <span className="text-tbs-mute-light dark:text-tbs-mute font-normal"> · {String(r.agendamento)}</span> : null}</div>
          <div className="grid grid-cols-3 gap-2.5">
            {kpi('Total', num(r.total))}
            {kpi('Únicos', num(r.unicos), COR_UNICOS)}
            {kpi('Torcida', num(r.torcida), COR_TORCIDA)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────── 3 · Votos por estado (barra clicável) ───────────
function EstadoReport({ report, estadoFiltro, setEstadoFiltro }: {
  report: VotoReport | null; estadoFiltro: string | null; setEstadoFiltro: (s: string | null) => void;
}) {
  const rows = useMemo(() => (report?.rows ?? []).slice().sort((a, b) => num(b.total) - num(a.total)), [report]);
  const max = rows.reduce((m, r) => Math.max(m, num(r.total)), 0) || 1;
  return (
    <div>
      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mb-3">Clique numa UF pra filtrar o ranking e a lista de participantes abaixo.</p>
      <ul className="divide-y divide-tbs-line-light dark:divide-tbs-line">
        {rows.map((r) => {
          const uf = String(r.estado);
          const sel = estadoFiltro === uf;
          const u = num(r.unicos), t = num(r.torcida), tot = num(r.total);
          return (
            <li key={uf}>
              <button onClick={() => setEstadoFiltro(sel ? null : uf)} className={`w-full text-left py-2 px-2 rounded-lg transition ${sel ? 'bg-tbs-orange/15' : 'hover:bg-tbs-surface-light dark:hover:bg-tbs-bg-3/40'}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={`text-sm font-semibold ${sel ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : 'text-tbs-ink-light dark:text-white'}`}>{uf}</span>
                  <span className="text-xs text-tbs-mute-light dark:text-tbs-mute">{fmtNum(tot)} · <span style={{ color: COR_UNICOS }}>{fmtNum(u)} únicos</span> · <span style={{ color: COR_TORCIDA }}>{fmtNum(t)} torcida</span></span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-tbs-line-light dark:bg-tbs-bg-3 flex">
                  <div className="h-full" style={{ width: `${(u / max) * 100}%`, background: COR_UNICOS }} />
                  <div className="h-full" style={{ width: `${(t / max) * 100}%`, background: COR_TORCIDA }} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────── 4 · Ranking de participantes (ordenável, clicável) ───────────
function RankingReport({ report, estadoFiltro, setEstadoFiltro, busca, setBusca, sort, setSort, all, setAll }: {
  report: VotoReport | null; estadoFiltro: string | null; setEstadoFiltro: (s: string | null) => void;
  busca: string; setBusca: (s: string) => void; sort: 'total' | 'unicos' | 'torcida'; setSort: (s: 'total' | 'unicos' | 'torcida') => void;
  all: boolean; setAll: (b: boolean) => void;
}) {
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (report?.rows ?? [])
      .filter((r) => (!estadoFiltro || String(r.estado) === estadoFiltro) && (!q || String(r.participante).toLowerCase().includes(q)))
      .slice()
      .sort((a, b) => num(b[sort]) - num(a[sort]));
  }, [report, estadoFiltro, busca, sort]);
  const view = all ? filtered : filtered.slice(0, 30);
  const inputCls = 'rounded-lg border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-bg-2 px-2.5 py-1.5 text-sm text-tbs-ink-light dark:text-white focus:outline-none focus:border-tbs-orange';
  const Th = ({ k, label }: { k: 'total' | 'unicos' | 'torcida'; label: string }) => (
    <th className="px-2.5 py-2 text-right cursor-pointer select-none hover:text-tbs-orange-deep dark:hover:text-tbs-orange-light" onClick={() => setSort(k)}>
      {label}{sort === k ? ' ▾' : ''}
    </th>
  );
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar participante…" className={inputCls} />
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">{fmtNum(filtered.length)} participantes{estadoFiltro ? ` · ${estadoFiltro}` : ''}</span>
      </div>
      <div className="overflow-auto max-h-[460px] rounded-xl border border-tbs-line-light dark:border-tbs-line">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 bg-tbs-surface-light dark:bg-tbs-bg-2 z-10">
            <tr className="text-tbs-mute-light dark:text-tbs-mute border-b border-tbs-line-light dark:border-tbs-line">
              <th className="px-2.5 py-2 text-left">#</th>
              <th className="px-2.5 py-2 text-left">Participante</th>
              <th className="px-2.5 py-2 text-left">UF</th>
              <Th k="total" label="Total" /><Th k="unicos" label="Únicos" /><Th k="torcida" label="Torcida" />
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={i} className="border-t border-tbs-line-light dark:border-tbs-line hover:bg-tbs-surface-light dark:hover:bg-tbs-bg-3/40">
                <td className="px-2.5 py-1.5 text-tbs-mute-light dark:text-tbs-mute">{i + 1}</td>
                <td className="px-2.5 py-1.5 text-tbs-ink-light dark:text-white">{String(r.participante)}</td>
                <td className="px-2.5 py-1.5">
                  <button onClick={() => setEstadoFiltro(estadoFiltro === String(r.estado) ? null : String(r.estado))} className="text-tbs-orange-deep dark:text-tbs-orange-light hover:underline">{String(r.estado)}</button>
                </td>
                <td className="px-2.5 py-1.5 text-right font-semibold text-tbs-ink-light dark:text-white">{fmtNum(num(r.total))}</td>
                <td className="px-2.5 py-1.5 text-right" style={{ color: COR_UNICOS }}>{fmtNum(num(r.unicos))}</td>
                <td className="px-2.5 py-1.5 text-right" style={{ color: COR_TORCIDA }}>{fmtNum(num(r.torcida))}</td>
              </tr>
            ))}
            {view.length === 0 && <tr><td colSpan={6} className="px-2.5 py-4 text-center text-tbs-mute-light dark:text-tbs-mute">nenhum participante</td></tr>}
          </tbody>
        </table>
      </div>
      {filtered.length > 30 && (
        <button onClick={() => setAll(!all)} className="text-[12px] text-tbs-orange-deep dark:text-tbs-orange-light hover:underline mt-2">
          {all ? 'ver só o top 30' : `ver todos os ${fmtNum(filtered.length)}`}
        </button>
      )}
    </div>
  );
}

// ─────────── 5 · Lista de participantes (inscritos) ───────────
function ListaReport({ report, estadoFiltro, setEstadoFiltro, busca, setBusca, video, setVideo }: {
  report: VotoReport | null; estadoFiltro: string | null; setEstadoFiltro: (s: string | null) => void;
  busca: string; setBusca: (s: string) => void; video: 'todos' | 'com' | 'sem'; setVideo: (v: 'todos' | 'com' | 'sem') => void;
}) {
  const temVideo = (r: VotoRow) => String(r.temVideo).trim().toLowerCase() === 'sim';
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (report?.rows ?? []).filter((r) => {
      if (estadoFiltro && String(r.estado) !== estadoFiltro) return false;
      if (video === 'com' && !temVideo(r)) return false;
      if (video === 'sem' && temVideo(r)) return false;
      if (q) { const hay = `${r.nome} ${r.sobrenome} ${r.email} ${r.cidade}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }, [report, estadoFiltro, busca, video]);
  const comVideo = (report?.rows ?? []).filter(temVideo).length;
  const total = report?.rows?.length ?? 0;
  const inputCls = 'rounded-lg border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-bg-2 px-2.5 py-1.5 text-sm text-tbs-ink-light dark:text-white focus:outline-none focus:border-tbs-orange';
  const chip = (v: 'todos' | 'com' | 'sem', label: string) => (
    <button onClick={() => setVideo(v)} className={`text-[11px] rounded-full px-3 py-1 border transition ${video === v ? 'bg-tbs-orange/15 border-tbs-orange/40 text-tbs-orange-deep dark:text-tbs-orange-light' : 'border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:border-tbs-orange/40'}`}>{label}</button>
  );
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar nome, email, cidade…" className={inputCls} />
        {chip('todos', 'Todos')}{chip('com', 'Com vídeo')}{chip('sem', 'Sem vídeo')}
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute ml-auto">{fmtNum(filtered.length)} de {fmtNum(total)} · {fmtNum(comVideo)} com vídeo{estadoFiltro ? ` · ${estadoFiltro}` : ''}</span>
      </div>
      <div className="overflow-auto max-h-[460px] rounded-xl border border-tbs-line-light dark:border-tbs-line">
        <table className="w-full text-[12px] border-collapse">
          <thead className="sticky top-0 bg-tbs-surface-light dark:bg-tbs-bg-2 z-10">
            <tr className="text-tbs-mute-light dark:text-tbs-mute border-b border-tbs-line-light dark:border-tbs-line">
              <th className="px-2.5 py-2 text-left">Nome</th>
              <th className="px-2.5 py-2 text-left">Email</th>
              <th className="px-2.5 py-2 text-left">Cidade</th>
              <th className="px-2.5 py-2 text-left">UF</th>
              <th className="px-2.5 py-2 text-left">Região</th>
              <th className="px-2.5 py-2 text-left">Vídeo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-tbs-line-light dark:border-tbs-line hover:bg-tbs-surface-light dark:hover:bg-tbs-bg-3/40">
                <td className="px-2.5 py-1.5 text-tbs-ink-light dark:text-white whitespace-nowrap">{`${r.nome} ${r.sobrenome}`.trim()}</td>
                <td className="px-2.5 py-1.5 text-tbs-mute-light dark:text-tbs-mute">{String(r.email)}</td>
                <td className="px-2.5 py-1.5 text-tbs-mute-light dark:text-tbs-mute">{String(r.cidade) || '—'}</td>
                <td className="px-2.5 py-1.5">
                  <button onClick={() => setEstadoFiltro(estadoFiltro === String(r.estado) ? null : String(r.estado))} className="text-tbs-orange-deep dark:text-tbs-orange-light hover:underline">{String(r.estado)}</button>
                </td>
                <td className="px-2.5 py-1.5 text-tbs-mute-light dark:text-tbs-mute">{String(r.regiao)}</td>
                <td className="px-2.5 py-1.5">
                  <span className={temVideo(r) ? 'text-emerald-600 dark:text-emerald-400' : 'text-tbs-mute-light dark:text-tbs-mute'}>{temVideo(r) ? `✓ ${String(r.statusVideo) || 'Sim'}` : String(r.statusVideo) || 'Não'}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-2.5 py-4 text-center text-tbs-mute-light dark:text-tbs-mute">nenhum participante</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
