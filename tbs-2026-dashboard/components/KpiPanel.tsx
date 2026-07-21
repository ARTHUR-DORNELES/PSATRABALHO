'use client';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { todayBRT, paceModel, PACE_START, PACE_DAYS } from '@/lib/pace';
import { useTheme } from './ThemeProvider';
import type { RefAdsDaily } from '@/lib/media-ref';

type MetaLike = { daily?: { date: string; spend: number }[]; totalSpend?: number } | null | undefined;
type GoogleLike = { daily?: { date: string; spend: number }[] } | null | undefined;

const fromMsToISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isoToMs = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const fmtBRL = (n: number) => 'R$ ' + new Intl.NumberFormat('pt-BR').format(Math.round(n));
const fmtRoas = (n: number) => (Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0') + 'x';
const fmtDiaMes = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

// Doodles em ASCII pra fechar o resumo do WhatsApp — sorteado a cada cópia (o "desenho aleatório").
// String.raw preserva as barras; vai dentro de um bloco ``` pra alinhar em fonte monoespaçada no WhatsApp.
const ASCII_ARTS: string[] = [
String.raw`   /\
  /  \
  |TB|
  |S |
  |__|
 /|  |\
 |____|
  '||'`,
String.raw` /\_/\
( o.o )
 > ^ <
  TBS`,
String.raw` .-----.
 \ TBS /
  \___/
   | |
  _|_|_
 |_____|`,
String.raw`     |>
     |
    /\
   /  \
  / /\ \
 /_/  \_\
  100k!`,
String.raw` _   _
/ \_/ \
\ TBS /
 \   /
  \ /
   v`,
String.raw`   ) )
  ( (
 ______
|      |}
| TBS  |
 \____/`,
String.raw`  \|/
 --*--
  /|\
  TBS`,
String.raw`  .---.
  | o |
  | o |
  '---'
   | |
  _| |_
 |_____|`,
String.raw` /^ ^\
( o o )
 \ V /
  ---`,
String.raw` ><((('>
   ><(o>
 ><((('>`,
String.raw`   _
  | |__
  |    |
  | TBS|
  |____|`,
String.raw`   /\
  (  )
 ( oo )
 (_~~_)
  \__/`,
String.raw`   __
  /_/
 _/
 \_\
  /_/`,
String.raw`        _
      _| |
    _| | |
  _| | | |
 |_|_|_|_|`,
String.raw` .  .  .
 |\/|\/|
 |    |
 |TBS |
 '----'`,
String.raw`   /\
  /  \
 <    >
  \  /
   \/`,
String.raw` ,___,
 (o,o)
 /)_)
  " "`,
String.raw` .----.
( o  o )
(  --  )
 '----'`,
String.raw` [o_o]
 /|_|\
  | |
 _| |_`,
String.raw`   ___
  /o o\
 (_____)
  \   /
   \ /
 ~beam~`,
String.raw` |\
 | \
 |TB>
 | /
 |/
 |`,
String.raw`  .---.
 / .-. \
| ( o ) |
 \ '-' /
  '---'`,
String.raw`    __
   /  |
  / o |))
 |    |))
  \   |
   \__|`,
String.raw`  .-.
 / ! \
 \   /
  | |
  |_|`,
String.raw`  _$_
 / $ \
| $$$ |
| $$$ |
 \___/`,
String.raw` \    /
  \__/
  (oo)
 /|  |\
  ^  ^`,
String.raw`    __
  _(  )_
 (o   _)
  \__/`,
String.raw`   /\
  /  \
 /____\
   ||
   ||`,
String.raw`   |
  /|
 / |
/__|_
\___/
~~~~~`,
String.raw`   /\
  /__\
 |    |
 | [] |
 |____|`,
String.raw`  .-.
 (   )
  '-'
   |
   '`,
String.raw`  _____
 |_|_|_|
 |  |  |
 |--+--|
 |__|__|`,
String.raw`  .--.
 / || \
| --o  |
 \    /
  '--'`,
String.raw`       /
      /
\    /
 \  /
  \/`,
String.raw` _   _   _
/ \_/ \_/ \
~~~~~~~~~~~`,
String.raw`  .--.
 ( oo )
 /|  |\
  |  |
  ^  ^`,
];

type PresetKey = 'ontem' | 'd7' | '7d' | '15d' | '30d' | 'mes' | 'custom';
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'ontem', label: 'Ontem (mesmo horário)' },
  { key: 'd7', label: 'Sem. passada (mesmo dia e horário)' },
  { key: '7d', label: '7 dias' },
  { key: '15d', label: '15 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'mes', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
];
const PRESET_CURTO: Record<PresetKey, string> = { ontem: 'hoje', d7: 'hoje', '7d': '7 dias', '15d': '15 dias', '30d': '30 dias', mes: 'mês', custom: 'período' };

const range = (fromMs: number, toMs: number): string[] => { const out: string[] = []; for (let t = fromMs; t <= toMs; t += 86400000) out.push(fromMsToISO(t)); return out; };

function windowsFor(preset: PresetKey, today: string, de: string, ate: string): { cur: string[]; base: string[]; label: string } {
  const tMs = isoToMs(today);
  const D = 86400000;
  if (preset === 'ontem') return { cur: [today], base: [fromMsToISO(tMs - D)], label: 'hoje vs ontem' };
  if (preset === 'd7') return { cur: [today], base: [fromMsToISO(tMs - 7 * D)], label: 'hoje vs mesmo dia da semana passada' };
  if (preset === '7d') return { cur: range(tMs - 6 * D, tMs), base: range(tMs - 13 * D, tMs - 7 * D), label: 'últimos 7 dias vs 7 anteriores' };
  if (preset === '15d') return { cur: range(tMs - 14 * D, tMs), base: range(tMs - 29 * D, tMs - 15 * D), label: 'últimos 15 dias vs 15 anteriores' };
  if (preset === '30d') return { cur: range(tMs - 29 * D, tMs), base: range(tMs - 59 * D, tMs - 30 * D), label: 'últimos 30 dias vs 30 anteriores' };
  if (preset === 'mes') {
    const ini = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, 1);
    const n = Math.round((tMs - ini) / D) + 1;
    return { cur: range(ini, tMs), base: range(ini - n * D, ini - D), label: 'mês atual vs período anterior' };
  }
  const a = isoToMs(de), b = isoToMs(ate);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const n = Math.round((hi - lo) / D) + 1;
  return { cur: range(lo, hi), base: range(lo - n * D, lo - D), label: `${fmtDiaMes(fromMsToISO(lo))}–${fmtDiaMes(fromMsToISO(hi))} vs período anterior` };
}

type Kpi = {
  key: string; label: string; unit: 'num' | 'brl' | 'x'; color: string;
  kind: 'sum' | 'ratio'; series: Map<string, number>; den?: Map<string, number>; nota?: string;
  metaTotal: number; expDaily: Map<string, number>; // meta total e esperado/dia do modelo (rampa)
};

export function KpiPanel({ data, meta, google, refAds }: { data: Snapshot; meta?: MetaLike; google?: GoogleLike; refAds?: RefAdsDaily }) {
  const { theme } = useTheme();
  const grid = theme === 'dark' ? '#2A2A38' : '#E6E6EA';
  const axis = theme === 'dark' ? '#9090A8' : '#6B6B72';
  const today = todayBRT();
  const [preset, setPreset] = useState<PresetKey>('d7'); // padrão: mesmo dia da semana passada (tira o efeito de dia da semana)
  const [de, setDe] = useState(fromMsToISO(isoToMs(today) - 6 * 86400000));
  const [ate, setAte] = useState(today);
  const [copiado, setCopiado] = useState(false);
  const [votos, setVotos] = useState<Record<string, number> | null>(null);
  const [selected, setSelected] = useState('inscritos');

  useEffect(() => {
    let alive = true;
    // Busca os votos com RETRY: se /api/votos falhar (ex.: janela de deploy), tenta de novo em vez de
    // zerar. Só mostra número quando a resposta vem OK — falha persistente mantém null ("carregando"),
    // nunca um "0" falso. (Dado fica no Redis; isto é só leitura.)
    const load = async (tries = 4): Promise<void> => {
      try {
        const res = await fetch('/api/votos', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        const rows = j?.reports?.dia?.rows;
        const map: Record<string, number> = {};
        if (Array.isArray(rows)) for (const r of rows) { const d = String(r.dia || ''); if (d) map[d] = Number(r.unicos) || 0; }
        if (alive) setVotos(map);
      } catch {
        if (tries > 1) { await new Promise((r) => setTimeout(r, 1500)); if (alive) return load(tries - 1); }
        // falhou de vez → mantém null (mostra "carregando…", não zera)
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  // dias decorridos/restantes do pace
  const { diasRestantes, modelDates } = useMemo(() => {
    const { rows } = paceModel();
    const idx = rows.findIndex((r) => r.date === today);
    const dec = idx >= 0 ? idx + 1 : (today < PACE_START ? 0 : PACE_DAYS);
    return { diasRestantes: Math.max(0, PACE_DAYS - dec), modelDates: rows.map((r) => r.date) };
  }, [today]);

  const kpis = useMemo<Kpi[]>(() => {
    const diario = data.visaoIntegrada?.diario ?? [];
    const origem = data.origemDiaria ?? [];
    const stages = data.daily?.edition2026?.dailyStages ?? [];
    const recDay = data.tbschoolReceitaDaily ?? [];
    const upDay = data.tbschoolUpsellDaily ?? [];
    const midiaRec = data.tbschoolMidiaDaily ?? [];
    const spend = meta?.daily ?? [];
    const map = <T,>(arr: T[], k: (t: T) => string, v: (t: T) => number) => new Map(arr.map((x) => [k(x), v(x)]));
    const stageSum = (st: { byStage: Record<string, number> }, keys: string[]) => keys.reduce((a, kk) => a + (st.byStage[kk] || 0), 0);
    const { cards, totals, rows } = paceModel();
    const exp = (f: (r: typeof rows[number]) => number) => new Map(rows.map((r) => [r.date, f(r)]));
    const TM = cards.ticketMain, TU = cards.ticketUpsell;
    const none = new Map<string, number>();
    return [
      { key: 'inscritos', label: 'Inscritos', unit: 'num', color: '#F08220', kind: 'sum', metaTotal: cards.target, series: map(diario, (d) => d.date, (d) => d.inscritos), expDaily: exp((r) => r.dayIns) },
      { key: 'midia', label: 'Inscritos mídia paga', unit: 'num', color: '#FF6B1A', kind: 'sum', metaTotal: Math.max(0, cards.target - cards.crmTotal), series: map(origem, (d) => d.date, (d) => (d.byFonte?.paid_social || 0) + (d.byFonte?.paid_search || 0)), expDaily: exp((r) => r.midiaIns) },
      { key: 'crm', label: 'Inscritos via CRM', unit: 'num', color: '#22C55E', kind: 'sum', metaTotal: cards.crmTotal, series: map(origem, (d) => d.date, (d) => { const bf = d.byFonte || {}; return Object.entries(bf).reduce((s, [kk, v]) => (kk === 'paid_social' || kk === 'paid_search') ? s : s + (v || 0), 0); }), expDaily: exp((r) => r.crmInsDay), nota: 'não é mídia paga' },
      { key: 'vendas', label: 'Vendas (live)', unit: 'num', color: '#27ae60', kind: 'sum', metaTotal: Math.round(totals.accVendas), series: map(diario, (d) => d.date, (d) => d.vendas), expDaily: exp((r) => r.vendasDia) },
      { key: 'upsell', label: 'Upsell (gravação)', unit: 'num', color: '#8e44ad', kind: 'sum', metaTotal: cards.totalUpsell, series: map(upDay, (d) => d.date, (d) => d.vendas), expDaily: exp((r) => r.upsellMidia + r.upsellCRM) },
      { key: 'faturamento', label: 'Faturamento', unit: 'brl', color: '#2980b9', kind: 'sum', metaTotal: cards.faturamento, series: map(recDay, (d) => d.date, (d) => d.receita), expDaily: exp((r) => r.vendasDia * TM + (r.upsellMidia + r.upsellCRM) * TU) },
      { key: 'roas', label: 'ROAS (mídia paga)', unit: 'x', color: '#16a085', kind: 'ratio', metaTotal: cards.roas, series: map(midiaRec, (d) => d.date, (d) => d.receita), den: map(spend, (d) => d.date, (d) => d.spend), expDaily: none, nota: 'receita ÷ gasto Meta' },
      { key: 'cadastros', label: 'Entrou na plataforma', unit: 'num', color: '#7d3c98', kind: 'sum', metaTotal: cards.totCad, series: map(stages, (s) => s.date, (s) => stageSum(s, ['completou_cadastro', 'upload_video_concluido', 'analise_ia_pronto'])), expDaily: exp((r) => r.cadastrosDia), nota: 'pela data de inscrição' },
      { key: 'videos', label: 'Vídeos enviados', unit: 'num', color: '#e67e22', kind: 'sum', metaTotal: cards.totVid, series: map(stages, (s) => s.date, (s) => stageSum(s, ['upload_video_concluido', 'analise_ia_pronto'])), expDaily: exp((r) => r.videosDia), nota: 'pela data de inscrição' },
      { key: 'votos', label: 'Votos únicos', unit: 'num', color: '#D946EF', kind: 'sum', metaTotal: cards.votesTarget, series: new Map(Object.entries(votos || {})), expDaily: exp((r) => r.votosDia), nota: votos === null ? 'carregando…' : 'aba Votos' },
    ];
  }, [data, meta, votos]);

  const win = windowsFor(preset, today, de, ate);
  const sumD = (m: Map<string, number>, dates: string[]) => dates.reduce((a, d) => a + (m.get(d) || 0), 0);
  const sumAll = (m?: Map<string, number>) => { let s = 0; if (m) for (const v of m.values()) s += v; return s; };
  const valueOf = (k: Kpi, dates: string[]): number => (k.kind === 'ratio' ? (sumD(k.den!, dates) > 0 ? sumD(k.series, dates) / sumD(k.den!, dates) : 0) : sumD(k.series, dates));
  const atualOf = (k: Kpi): number => (k.kind === 'ratio' ? (sumAll(k.den) > 0 ? sumAll(k.series) / sumAll(k.den) : 0) : sumAll(k.series));
  const fmt = (k: Kpi, n: number) => (k.unit === 'brl' ? fmtBRL(n) : k.unit === 'x' ? fmtRoas(n) : formatNumber(Math.round(n)));

  // ── Comparação "mesmo horário" p/ presets intraday (vs ontem · vs mesmo dia da semana passada) ──
  // Hoje até a hora atual (BRT) × o MESMO ponto do dia de comparação, via séries horárias (inscricoesHora · vendasHora).
  // Assim o ▲/▼ não fica distorcido por comparar hoje (parcial) com um dia inteiro.
  const D_MS = 86400000;
  const isIntraday = preset === 'ontem' || preset === 'd7';
  const baseDay = preset === 'd7' ? fromMsToISO(isoToMs(today) - 7 * D_MS) : fromMsToISO(isoToMs(today) - D_MS);
  const curH = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  const brtDia = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
  const brtH = (iso: string) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date(iso))) % 24;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sumST = (arr: any[] | undefined, pick: (b: any) => number, dia: string) => { let s = 0; for (const b of (arr || [])) { if (brtDia(b.bucket) === dia && brtH(b.bucket) < curH) s += pick(b) || 0; } return s; };
  const STD: Record<string, { arr: any[] | undefined; pick: (b: any) => number }> = {
    inscritos: { arr: data.inscricoesHora, pick: (b) => b.total },
    midia: { arr: data.inscricoesHora, pick: (b) => b.paid },
    crm: { arr: data.inscricoesHora, pick: (b) => b.crm || 0 },
    cadastros: { arr: data.inscricoesHora, pick: (b) => b.cadastros || 0 },
    videos: { arr: data.inscricoesHora, pick: (b) => b.videos || 0 },
    vendas: { arr: data.vendasHora, pick: (b) => b.vendas },
    faturamento: { arr: data.vendasHora, pick: (b) => b.receita },
    upsell: { arr: data.vendasHora, pick: (b) => b.upsell },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const sameTimeFor = (k: Kpi): { cur: number; base: number } | null => {
    const s = STD[k.key]; if (!s || !s.arr || !s.arr.length) return null;
    return { cur: sumST(s.arr, s.pick, today), base: sumST(s.arr, s.pick, baseDay) };
  };

  const computed = kpis.map((k) => {
    // intraday (vs ontem / vs sem. passada) usa MESMO HORÁRIO p/ os KPIs com série horária; o resto cai na janela diária.
    const st = isIntraday ? sameTimeFor(k) : null;
    const cur = st ? st.cur : valueOf(k, win.cur);
    const base = st ? st.base : valueOf(k, win.base);
    const pct = base > 0 ? (cur - base) / base : null;
    const atual = atualOf(k);
    const pctMeta = k.metaTotal > 0 ? atual / k.metaTotal : null;
    const ritmoNec = k.kind === 'ratio' || diasRestantes <= 0 ? null : Math.max(0, k.metaTotal - atual) / diasRestantes;
    return { k, cur, base, pct, atual, pctMeta, ritmoNec };
  });

  // gráfico de progressão do KPI: onde estamos (real) × onde devemos chegar (esperado/meta) × onde vamos
  // chegar no ritmo atual (projeção: média dos últimos 7 dias × dias restantes).
  const chart = useMemo(() => {
    const k = kpis.find((x) => x.key === selected) ?? kpis[0];
    if (k.kind === 'ratio') return null;
    const D = 86400000;
    const realDates = [...k.series.keys()].sort();
    let run = 0; const realCum = new Map<string, number>();
    for (const d of realDates) { run += k.series.get(d) || 0; realCum.set(d, run); }
    let base = 0; for (const d of realDates) { if (d <= modelDates[0]) base = realCum.get(d)!; else break; }
    // acumulado HOJE e ritmo dos últimos 7 dias completos
    let atual = base; for (const d of realDates) { if (d <= today) atual = realCum.get(d)!; else break; }
    const tMs = isoToMs(today);
    let soma7 = 0; for (let i = 1; i <= 7; i++) soma7 += (k.series.get(fromMsToISO(tMs - i * D)) || 0);
    const rate = soma7 / 7;
    const projFinal = atual + rate * diasRestantes;
    let exp = base, lastReal = base, ri = 0;
    const dataArr = modelDates.map((date) => {
      exp += (k.expDaily.get(date) || 0);
      while (ri < realDates.length && realDates[ri] <= date) { lastReal = realCum.get(realDates[ri])!; ri++; }
      const shift = Math.round((isoToMs(date) - tMs) / D);
      const proj = date < today ? undefined : date === today ? Math.round(atual) : Math.round(atual + rate * shift);
      return { date, esperado: Math.round(exp), real: date <= today ? Math.round(lastReal) : undefined, projecao: proj };
    });
    return { dataArr, meta: k.metaTotal, color: k.color, label: k.label, unit: k.unit, atual, rate, projFinal };
  }, [kpis, selected, today, modelDates, diasRestantes]);

  // Resumo do WhatsApp — baseado na TABELA DE TRAJETÓRIA: o que fizemos ONTEM (vs a meta do dia) +
  // o ACUMULADO ATÉ HOJE (onde estamos × onde deveríamos). Mesmas fontes/projeção da tabela.
  const copiarResumo = useCallback(() => {
    const now = new Date();
    const dataStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    const horaStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(now);
    const wd = WD[new Date(`${today}T12:00:00`).getDay()];
    const pctTxt = (p: number) => { const v = Math.abs(p * 100); return (v < 10 ? v.toFixed(1) : v.toFixed(0)).replace('.', ','); };
    const yest = fromMsToISO(isoToMs(today) - 86400000);

    // Séries REAIS por data (mesmas fontes da tabela de trajetória).
    const diario = data.visaoIntegrada?.diario ?? [];
    const insByD = new Map(diario.map((d) => [d.date, d.inscritos]));
    const vendByD = new Map(diario.map((d) => [d.date, d.vendas]));
    const upByD = new Map((data.tbschoolUpsellDaily ?? []).map((d) => [d.date, d.vendas]));
    const fatByD = new Map((data.tbschoolReceitaDaily ?? []).map((d) => [d.date, d.receita]));
    // Investido = puxado do painel de referência "Mídia Paga" (tbs-meta-ads.vercel.app, lib/media-ref.ts) —
    // mesma régua do Pace (ver PaceBlock.tsx), não o nosso fetch direto ao Graph/Google Ads API.
    const invByD = new Map<string, number>();
    for (const d of refAds?.meta ?? []) invByD.set(d.date, (invByD.get(d.date) || 0) + d.spend);
    for (const d of refAds?.google ?? []) invByD.set(d.date, (invByD.get(d.date) || 0) + d.spend);
    const { rows, cards } = paceModel();
    const TM = cards.ticketMain, TU = cards.ticketUpsell;
    const yR = rows.find((r) => r.date === yest);

    // Acumulado deveria × real ATÉ HOJE (replica o rodapé da tabela de trajetória).
    // Faturamento deveria (r.accFat) já vem PRONTO de lib/pace.ts, seedado por segmento — não recalcular
    // aqui por cima (dobraria a contagem no segmento antigo, 19/06-05/07). Real soma a receita de TODAS
    // as datas anteriores à janela (pré-19/06) como seed — senão fica só a janela e subconta.
    let fatRealSeed = 0; for (const [d, v] of fatByD) if (d < PACE_START) fatRealSeed += v;
    let lastRow = rows[0], upsDev = 0, invRealW = 0, upsRealW = 0, fatRealW = 0;
    for (const r of rows) {
      if (r.date > today) break;
      lastRow = r;
      upsDev += r.upsellMidia + r.upsellCRM;
      invRealW += invByD.get(r.date) ?? 0;
      upsRealW += upByD.get(r.date) ?? 0;
      fatRealW += fatByD.get(r.date) ?? 0;
    }
    const inscRealTot = [...insByD.values()].reduce((a, b) => a + b, 0);
    const vendRealTot = [...vendByD.values()].reduce((a, b) => a + b, 0);

    const fmtV = (brl: boolean, n: number) => (brl ? fmtBRL(n) : formatNumber(Math.round(n)));
    const upsDevDia = yR ? yR.upsellMidia + yR.upsellCRM : 0;
    const ontem = [
      { label: 'Inscritos', brl: false, cmp: true, dev: yR?.dayIns ?? 0, real: insByD.get(yest) ?? 0 },
      { label: 'Vendas', brl: false, cmp: true, dev: yR?.vendasDia ?? 0, real: vendByD.get(yest) ?? 0 },
      { label: 'Upsell', brl: false, cmp: true, dev: upsDevDia, real: upByD.get(yest) ?? 0 },
      { label: 'Faturamento', brl: true, cmp: true, dev: yR ? yR.vendasDia * TM + upsDevDia * TU : 0, real: fatByD.get(yest) ?? 0 },
      { label: 'Investido', brl: true, cmp: false, dev: yR?.budget ?? 0, real: invByD.get(yest) ?? 0 },
    ];
    const acum = [
      { label: 'Inscritos', brl: false, cmp: true, dev: lastRow.acc, real: inscRealTot },
      { label: 'Vendas', brl: false, cmp: true, dev: lastRow.accVendas, real: vendRealTot },
      { label: 'Upsell', brl: false, cmp: true, dev: upsDev, real: upsRealW },
      { label: 'Faturamento', brl: true, cmp: true, dev: lastRow.accFat, real: fatRealSeed + fatRealW },
      { label: 'Investido', brl: true, cmp: false, dev: lastRow.accInv, real: invRealW },
    ];
    const linhaOntem = (x: typeof ontem[number]) => {
      const pct = x.cmp && x.dev > 0 ? x.real / x.dev : null;
      const tag = pct == null ? '' : ` · ${pct >= 1 ? '🟢' : '🔴'}${pctTxt(pct)}%`;
      return `• *${x.label}:* ${fmtV(x.brl, x.real)} _(meta do dia ${fmtV(x.brl, x.dev)}${tag})_`;
    };
    const linhaAcum = (x: typeof acum[number]) => {
      const pct = x.cmp && x.dev > 0 ? x.real / x.dev : null;
      const tag = pct == null ? '' : ` · ${pct >= 1 ? '🟢' : '🔴'}${pctTxt(pct)}% do previsto`;
      return `• *${x.label}:* ${fmtV(x.brl, x.real)} de ${fmtV(x.brl, x.dev)}${tag}`;
    };

    const SEP = '━━━━━━━━━━';
    const head = [`📊 *TBS 2026 — Resumo*`, `🗓️ ${wd}, ${dataStr} · ${horaStr} (Brasília)`, `🎯 Meta 100k · 30/08 · faltam ${diasRestantes} dias`].join('\n');
    const ontemBloco = [`📅 *ONTEM (${fmtDiaMes(yest)})* — o que fizemos no dia`, ...ontem.map(linhaOntem)].join('\n');
    const acumBloco = [`📈 *ACUMULADO ATÉ HOJE* — temos × deveríamos ter`, ...acum.map(linhaAcum)].join('\n');
    const footer = `_real (HubSpot/Kiwify/Meta) × projeção do modelo · painel TBS_`;
    const art = ASCII_ARTS[Math.floor(Math.random() * ASCII_ARTS.length)];
    const txt = [head, SEP, ontemBloco, SEP, acumBloco, footer, '```\n' + art + '\n```'].join('\n\n');
    const ok = () => { setCopiado(true); setTimeout(() => setCopiado(false), 2200); };
    const fb = () => { try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); ok(); } catch { window.prompt('Copie o resumo:', txt); } };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(ok).catch(fb); else fb();
  }, [data, meta, google, refAds, today, diasRestantes]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputCls = 'rounded-lg border border-tbs-line-light dark:border-tbs-line bg-tbs-surface-light dark:bg-tbs-bg-2 px-2 py-1 text-[12px] text-tbs-ink-light dark:text-white focus:outline-none focus:border-tbs-orange';
  const tipBg = theme === 'dark' ? '#1A1A24' : '#fff';

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h2 className="card-title">Metas &amp; KPIs · TBS</h2>
          <p className="card-subtitle">total acumulado, ritmo até a meta e variação ({win.label}) · clique num KPI pra ver a rampa · {diasRestantes} dias restantes</p>
        </div>
        <button onClick={copiarResumo} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border border-tbs-orange/50 bg-tbs-orange/10 text-tbs-orange-deep dark:text-tbs-orange-light hover:bg-tbs-orange/20 hover:border-tbs-orange transition">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
          {copiado ? 'copiado ✓' : 'copiar resumo'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mr-1">comparar:</span>
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => setPreset(p.key)} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition ${preset === p.key ? 'bg-tbs-orange text-white border-tbs-orange' : 'border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:border-tbs-orange/60'}`}>{p.label}</button>
        ))}
        {preset === 'custom' && (
          <span className="flex items-center gap-1.5">
            <input type="date" value={de} max={today} onChange={(e) => setDe(e.target.value)} className={inputCls} />
            <span className="text-tbs-mute-light dark:text-tbs-mute text-xs">→</span>
            <input type="date" value={ate} max={today} onChange={(e) => setAte(e.target.value)} className={inputCls} />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {computed.map(({ k, cur, base, pct, atual, pctMeta, ritmoNec }) => {
          const up = (pct ?? 0) >= 0;
          const sel = selected === k.key;
          const pctMetaStr = pctMeta == null ? '—' : `${(pctMeta * 100).toFixed(pctMeta < 0.1 ? 1 : 0)}%`;
          return (
            <button key={k.key} onClick={() => setSelected(k.key)} className={`text-left rounded-xl border p-3.5 bg-tbs-surface-light dark:bg-tbs-bg-3/40 transition ${sel ? 'border-tbs-orange ring-1 ring-tbs-orange/50' : 'border-tbs-line-light dark:border-tbs-line hover:border-tbs-orange/50'}`} style={{ borderTop: `3px solid ${k.color}` }}>
              <div className="text-[11px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold leading-tight min-h-[26px]">{k.label}</div>
              <div className="kpi-value text-[30px] mt-1 leading-none" style={{ color: k.color }}>{fmt(k, atual)}</div>
              {/* % da meta — fixo */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1 gap-1">
                  <span className="font-bold" style={{ color: k.color }}>{pctMetaStr} <span className="font-normal text-tbs-mute-light dark:text-tbs-mute">da meta</span></span>
                  <span className="text-tbs-mute-light dark:text-tbs-mute truncate">{fmt(k, k.metaTotal)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-tbs-line-light dark:bg-tbs-bg-3">
                  <div className="h-full" style={{ width: `${Math.min(100, (pctMeta ?? 0) * 100)}%`, background: k.color }} />
                </div>
              </div>
              {/* variação no período (filtro) */}
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                <span className="text-tbs-mute-light dark:text-tbs-mute">{PRESET_CURTO[preset]}: {fmt(k, cur)}</span>
                {pct != null && <span className={`font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{up ? '▲' : '▼'}{Math.abs(pct * 100).toFixed(0)}%</span>}
              </div>
              {/* ritmo necessário pra meta */}
              <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-1">
                {ritmoNec == null ? '—' : <>precisa <strong className="text-tbs-ink-light dark:text-white">{fmt(k, ritmoNec)}/dia</strong></>}
              </div>
              {k.nota && <div className="text-[9px] text-tbs-mute-light/80 dark:text-tbs-mute/80 mt-1">{k.nota}</div>}
            </button>
          );
        })}
      </div>

      {/* Progressão do KPI selecionado: onde estamos × onde devemos chegar × onde vamos chegar no ritmo atual */}
      {chart ? (() => {
        const fv = (n: number) => (chart.unit === 'brl' ? fmtBRL(n) : formatNumber(Math.round(n)));
        const pctProj = chart.meta > 0 ? chart.projFinal / chart.meta : 0;
        const bate = chart.projFinal >= chart.meta;
        const projColor = bate ? '#22C55E' : '#E0A100';
        return (
          <div className="mt-5 pt-4 border-t border-tbs-line-light dark:border-tbs-line">
            <div className="text-[12px] font-semibold text-tbs-ink-light dark:text-white mb-3">Progressão — <span style={{ color: chart.color }}>{chart.label}</span> <span className="text-[11px] font-normal text-tbs-mute-light dark:text-tbs-mute">· 19/06 → 30/08</span></div>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3 bg-tbs-surface-light dark:bg-tbs-bg-3/40">
                <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Onde estamos</div>
                <div className="kpi-value text-xl mt-1" style={{ color: chart.color }}>{fv(chart.atual)}</div>
                <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">hoje · ritmo {fv(chart.rate)}/dia</div>
              </div>
              <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3 bg-tbs-surface-light dark:bg-tbs-bg-3/40">
                <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Onde devemos chegar</div>
                <div className="kpi-value text-xl mt-1 text-tbs-ink-light dark:text-white">{fv(chart.meta)}</div>
                <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">meta · 30/08</div>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: projColor, background: `${projColor}14` }}>
                <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: projColor }}>No ritmo atual</div>
                <div className="kpi-value text-xl mt-1" style={{ color: projColor }}>{fv(chart.projFinal)}</div>
                <div className="text-[10px] font-semibold" style={{ color: projColor }}>{bate ? '✓ bate a meta' : `${(pctProj * 100).toFixed(0)}% da meta`}</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart.dataArr} margin={{ top: 5, right: 12, left: 6, bottom: 5 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke={axis} fontSize={11} tickFormatter={fmtDiaMes} minTickGap={28} />
                <YAxis stroke={axis} fontSize={11} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, background: tipBg, border: `1px solid ${grid}`, fontSize: 12 }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }} labelStyle={{ color: theme === 'dark' ? '#fff' : '#0E0E10' }}
                  formatter={(v: number, n: string) => [v == null ? '—' : chart.unit === 'brl' ? fmtBRL(v) : formatNumber(v), n]}
                  labelFormatter={(d) => fmtDiaMes(d as string)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={chart.meta} stroke="#C0392B" strokeDasharray="6 3" />
                <Line type="monotone" dataKey="esperado" name="Onde devemos chegar" stroke="#C0392B" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="projecao" name="No ritmo atual" stroke={projColor} strokeWidth={1.8} strokeDasharray="4 3" dot={false} connectNulls />
                <Line type="monotone" dataKey="real" name="Onde estamos (real)" stroke={chart.color} strokeWidth={2.5} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
              <strong style={{ color: chart.color }}>Real</strong> = onde estamos. <strong style={{ color: '#C0392B' }}>Esperado</strong> = trajetória do modelo até a meta. <strong style={{ color: projColor }}>No ritmo atual</strong> = onde vamos chegar em 30/08 se mantivermos a média dos últimos 7 dias ({fv(chart.rate)}/dia).
            </p>
          </div>
        );
      })() : (
        <div className="mt-5 pt-4 border-t border-tbs-line-light dark:border-tbs-line text-[12px] text-tbs-mute-light dark:text-tbs-mute">O ROAS é uma razão (receita ÷ gasto), não tem progressão acumulada — selecione outro KPI pra ver a trajetória.</div>
      )}
    </section>
  );
}
