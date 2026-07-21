// Modelo de PACE — meta de inscritos TBS 2026 e a trajetória PROJETADA dia a dia.
// Portado fielmente de projecao_tbs_100k.html. Determinístico (sem Date.now()).
// A aba "Pace" compara o REAL (ao vivo do HubSpot) contra esta curva.
//
// DOIS SEGMENTOS CONGELADOS (histórico de re-baselines — não colapsar em "só real"):
//   1) 19/06 → 05/07 · modelo ANTERIOR (71 dias, rampa linear de investimento, CPL 4,50) — congelado,
//      é registro do que foi projetado nessa janela. Ver bloco "SEGMENTO 1".
//   2) 06/07 → 30/08 · modelo ATUAL (56 dias, escalonamento semanal de investimento, CPL 4,19,
//      projecao_tbs_100k v4) — rege a campanha daqui pra frente. Ver bloco "SEGMENTO 2".
// Antes de 19/06 (01/06-18/06) não existia projeção nenhuma — só o realizado.
// Se chegar um v5, criar um SEGMENTO 3 do mesmo jeito em vez de sobrescrever o 2 — cada re-baseline
// fica congelado na janela em que valeu; só o modelo mais recente é "ativo" (rege cards/totals).

export const PACE_META = 100000;
export const PACE_START = '2026-06-19'; // dia 0 da primeira projeção (1º re-baseline)
export const PACE_REBASELINE_2 = '2026-07-06'; // dia 0 do 2º re-baseline (novo investimento em mídia paga — v4)
export const PACE_END = '2026-08-30';
// Total de dias cobertos pela tabela (19/06 → 30/08) — usado por quem calcula "dias decorridos/restantes".
// NÃO confundir com o tamanho do modelo ATIVO (NEW_SEG_DAYS, 56) nem do antigo (OLD_SEG_DAYS, 17).
export const PACE_DAYS = 73;
// Início da EXIBIÇÃO da tabela de trajetória: mostra o REAL desde 01/06, mesmo antes do 1º re-baseline.
// Antes de PACE_START (01/06-18/06) não há projeção ("deveria") — só o realizado.
export const PACE_DISPLAY_START = '2026-06-01';

// ── Funil de participação (mesmas taxas nos dois modelos) ──
const TX_CADASTRO = 0.30;
const TX_VOTO = 0.50;
const TX_VIDEO = 0.15;
// Meta fixa de vídeos enviados (não é % do funil de inscritos — é um alvo de produto à parte; só o modelo v4 tem isso).
const VIDEO_TARGET = 4500;
const VOTES_TARGET = 2500000;

// ── Taxas & ticket (mesmas nos dois modelos) ──
const CONV_MIDIA = 0.09;
// CRM re-baseado pra "não é mídia paga" (lista 15693): conversão real observada ≈ 20% (829 vendas / 4.096
// inscritos não-pagos). Já valia assim no fim do Segmento 1 (retroativo, sessão anterior) — o arquivo v4
// trouxe de volta 11%, mas mantive 20% de propósito (é dado real validado) e sinalizei o desvio.
const CONV_CRM = 0.20;
const TICKET_MAIN = 26.26;
const TICKET_UPSELL = 185.20;
const UPSELL_TX_MIDIA = 0.10;
const UPSELL_TX_CRM = 0.10;
const CRM_DISPAROS = 1200;
const CRM_INS_DIA = 117;
const TARGET = 100000;
const WDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export type PaceRow = {
  date: string; // ISO YYYY-MM-DD
  ds: string; // DD/MM
  wd: string; // dia da semana abreviado
  budget: number; // investimento mídia/dia
  midiaIns: number; // inscrições via mídia/dia
  vendasMidia: number;
  upsellMidia: number;
  crmDisparos: number; // envios CRM/dia (constante)
  crmInsDay: number; // inscrições via CRM/dia
  vendasCRM: number;
  upsellCRM: number;
  cadastrosDia: number;
  votosPedidosDia: number;
  videosDia: number;
  votosDia: number; // votos/dia (constante)
  dayIns: number; // total inscrições/dia
  vendasDia: number;
  acc: number; // acumulado de inscrições (projetado)
  accVendas: number;
  accInv: number;
  accFat: number; // faturamento acumulado (projetado) — seedado 1x por segmento, não recalcular fora daqui
  accCadastros: number;
  accVotosPedidos: number;
  accVideos: number;
  accVotos: number;
  pct: number; // % da meta
};

export type PaceTotals = {
  budget: number; midiaIns: number; vendasMidia: number; upsellMidia: number;
  crmDisparos: number; crmIns: number; vendasCRM: number; upsellCRM: number;
  dayIns: number; vendasDia: number;
  cadastros: number; votosPedidos: number; videos: number; votos: number;
  accCadastros: number; accVotosPedidos: number; accVideos: number; accVotos: number;
  accIns: number; accVendas: number; accInv: number;
};

export type PaceCards = {
  // projeção
  inscritosProjetados: number; histInsTot: number; target: number;
  invRestante: number; histSpent: number; cpl: number; totalInvest: number;
  crmTotal: number; histInsCrm: number; crmInsDia: number; days: number;
  rampDay1: number; rampDayLast: number;
  // resultado
  vendasMain: number; mainMidia: number; mainCRM: number; histVendas: number;
  totalUpsell: number; upsellMidia: number; upsellCRM: number;
  faturamento: number; fatMain: number; fatUpsell: number; ticketMain: number; ticketUpsell: number;
  roas: number;
  // funil
  totCad: number; txCadastro: number;
  totVotPed: number; txVoto: number;
  totVid: number; txVideo: number;
  totVotTotal: number; votesTarget: number; votesAlready: number; votosDia: number;
};

export type PaceModel = { rows: PaceRow[]; totals: PaceTotals; cards: PaceCards };

// ══════════════════════════════════════════════════════════════════════════
// SEGMENTO 1 (CONGELADO) — modelo do 1º re-baseline, 19/06 → 05/07 (17 dias).
// Não é mais o modelo ativo; existe só pra a tabela mostrar o "deveria" que valia nessa janela.
// Truncado em 17 dias (dos 71 originais) porque foi substituído pelo Segmento 2 em 06/07 — a lógica de
// "último dia encaixa exato na meta" do modelo original nunca chegou a rodar (só ativava no dia 71).
// ══════════════════════════════════════════════════════════════════════════
const OLD_SEG_DAYS = 17;
const OLD_PACE_DAYS_FULL = 71; // tamanho ORIGINAL do modelo (pra reconstruir a mesma rampa/TOTAL_INV)
const OLD_CPL = 4.50;
const OLD_VOTES_ALREADY = 4344;
const OLD_VOTOS_DIA = 35151;
const OLD_HIST_SPENT = 25678;
const OLD_HIST_INS_PAID = 6123;
const OLD_HIST_INS_CRM = 2631;
const OLD_HIST_VENDAS = 923;
const OLD_HIST_INS_TOT = OLD_HIST_INS_PAID + OLD_HIST_INS_CRM; // 8754
const OLD_HIST_FAT = 35298; // faturamento já realizado até 18/06 (seed do Segmento 1)

const _OLD_CRM_FUT = CRM_INS_DIA * OLD_PACE_DAYS_FULL;
const OLD_TOTAL_INV = (TARGET - OLD_HIST_INS_TOT - _OLD_CRM_FUT) * OLD_CPL;
// Rampa linear: dia 71 = 2× dia 1, soma = totalInv (106.5·a = totalInv).
function oldRamp(idx: number): number {
  const a = OLD_TOTAL_INV / 106.5;
  return a + idx * (a / 70);
}

function oldSegmentRows(): PaceRow[] {
  let acc = OLD_HIST_INS_TOT, accInv = OLD_HIST_SPENT, accVendas = OLD_HIST_VENDAS, accFat = OLD_HIST_FAT;
  let accCadastros = 0, accVotosPedidos = 0, accVideos = 0, accVotos = OLD_VOTES_ALREADY;
  const startMs = Date.UTC(2026, 5, 19); // 19/06/2026
  const rows: PaceRow[] = [];

  for (let i = 0; i < OLD_SEG_DAYS; i++) {
    const dMs = startMs + i * 86400000;
    const d = new Date(dMs);

    const budget = oldRamp(i);
    const crmInsDay = CRM_INS_DIA;
    const midiaIns = Math.round(budget / OLD_CPL);
    const dayIns = midiaIns + crmInsDay;
    const vendasMidia = Math.round(midiaIns * CONV_MIDIA);
    const vendasCRM = Math.round(crmInsDay * CONV_CRM);
    const vendasDia = vendasMidia + vendasCRM;
    const upsellMidia = Math.round(vendasMidia * UPSELL_TX_MIDIA);
    const upsellCRM = Math.round(vendasCRM * UPSELL_TX_CRM);
    const cadastrosDia = Math.round(dayIns * TX_CADASTRO);
    const votosPedidosDia = Math.round(cadastrosDia * TX_VOTO);
    const videosDia = Math.round(dayIns * TX_VIDEO);
    const fatDia = vendasDia * TICKET_MAIN + (upsellMidia + upsellCRM) * TICKET_UPSELL;

    acc += dayIns; accInv += budget; accVendas += vendasDia; accFat += fatDia;
    accCadastros += cadastrosDia; accVotosPedidos += votosPedidosDia; accVideos += videosDia; accVotos += OLD_VOTOS_DIA;

    const pct = Math.min(100, Math.round((acc / TARGET) * 100));
    const ds = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    rows.push({
      date: new Date(dMs).toISOString().slice(0, 10),
      ds, wd: WDAYS[d.getUTCDay()],
      budget, midiaIns, vendasMidia, upsellMidia,
      crmDisparos: CRM_DISPAROS, crmInsDay, vendasCRM, upsellCRM,
      cadastrosDia, votosPedidosDia, videosDia, votosDia: OLD_VOTOS_DIA,
      dayIns, vendasDia, acc, accVendas, accInv, accFat,
      accCadastros, accVotosPedidos, accVideos, accVotos, pct,
    });
  }
  return rows;
}

// ══════════════════════════════════════════════════════════════════════════
// SEGMENTO 2 (ATIVO) — modelo do 2º re-baseline, 06/07 → 30/08 (56 dias). projecao_tbs_100k v4.
// Este é o modelo que rege "cards"/"totals" (metas e resultado esperado da campanha inteira).
// ══════════════════════════════════════════════════════════════════════════
const NEW_SEG_DAYS = 56;
const CPL = 4.19; // 306.600 investido ÷ 73.096 inscrições pagas necessárias
const VOTES_ALREADY = 15945;
const VOTOS_DIA = 44359;
const HIST_SPENT = 77000;
const HIST_INS_PAID = 16200;
const HIST_INS_CRM = 4152;
const HIST_VENDAS = 2031;
const HIST_CADASTROS = 1141;
const HIST_VIDEOS = 157;
const HIST_INS_TOT = HIST_INS_PAID + HIST_INS_CRM; // 20.352
export const HIST_FAT = 77804.23; // faturamento já realizado até 05/07 (seed do Segmento 2)

// Escalonamento semanal de investimento (semanas 6–13 da campanha, 8 semanas × 7 dias = 56 dias).
const WEEKLY_BUDGET = [3200, 3850, 4500, 5150, 5800, 6450, 7100, 7750];
function weeklyBudget(idx: number): number {
  return WEEKLY_BUDGET[Math.min(Math.floor(idx / 7), WEEKLY_BUDGET.length - 1)];
}
const _CRM_FUT = CRM_INS_DIA * NEW_SEG_DAYS;
const TOTAL_INV = WEEKLY_BUDGET.reduce((sum, d) => sum + d * 7, 0); // 306.600

function newSegmentRows(): PaceRow[] {
  let acc = HIST_INS_TOT, accInv = HIST_SPENT, accVendas = HIST_VENDAS, accFat = HIST_FAT;
  let accCadastros = HIST_CADASTROS, accVotosPedidos = 0, accVideos = HIST_VIDEOS, accVotos = VOTES_ALREADY;
  const startMs = Date.UTC(2026, 6, 6); // 06/07/2026
  const rows: PaceRow[] = [];

  for (let i = 0; i < NEW_SEG_DAYS; i++) {
    const dMs = startMs + i * 86400000;
    const d = new Date(dMs);

    const budget = weeklyBudget(i);
    const crmInsDay = CRM_INS_DIA;
    const midiaIns = acc >= TARGET ? 0 : i === NEW_SEG_DAYS - 1 ? Math.max(0, TARGET - acc - crmInsDay) : Math.round(budget / CPL);
    const dayIns = midiaIns + crmInsDay;
    const vendasMidia = Math.round(midiaIns * CONV_MIDIA);
    const vendasCRM = Math.round(crmInsDay * CONV_CRM);
    const vendasDia = vendasMidia + vendasCRM;
    const upsellMidia = Math.round(vendasMidia * UPSELL_TX_MIDIA);
    const upsellCRM = Math.round(vendasCRM * UPSELL_TX_CRM);
    const cadastrosDia = Math.round(dayIns * TX_CADASTRO);
    const votosPedidosDia = Math.round(cadastrosDia * TX_VOTO);
    const videosDia = Math.round(dayIns * TX_VIDEO);
    const fatDia = vendasDia * TICKET_MAIN + (upsellMidia + upsellCRM) * TICKET_UPSELL;

    acc += dayIns; accInv += budget; accVendas += vendasDia; accFat += fatDia;
    accCadastros += cadastrosDia; accVotosPedidos += votosPedidosDia; accVideos += videosDia; accVotos += VOTOS_DIA;

    const pct = Math.min(100, Math.round((acc / TARGET) * 100));
    const ds = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    rows.push({
      date: new Date(dMs).toISOString().slice(0, 10),
      ds, wd: WDAYS[d.getUTCDay()],
      budget, midiaIns, vendasMidia, upsellMidia,
      crmDisparos: CRM_DISPAROS, crmInsDay, vendasCRM, upsellCRM,
      cadastrosDia, votosPedidosDia, videosDia, votosDia: VOTOS_DIA,
      dayIns, vendasDia, acc, accVendas, accInv, accFat,
      accCadastros, accVotosPedidos, accVideos, accVotos, pct,
    });
  }
  return rows;
}

export function paceModel(): PaceModel {
  const newRows = newSegmentRows();
  const rows: PaceRow[] = [...oldSegmentRows(), ...newRows];

  // totals/cards refletem só o modelo ATIVO (Segmento 2) — são as metas/resultado esperado da campanha
  // daqui pra frente, não o que o modelo antigo (já substituído) previa.
  const sum = (f: (r: PaceRow) => number) => newRows.reduce((a, r) => a + f(r), 0);
  const last = newRows[newRows.length - 1];
  const totals: PaceTotals = {
    budget: sum((r) => r.budget), midiaIns: sum((r) => r.midiaIns), vendasMidia: sum((r) => r.vendasMidia), upsellMidia: sum((r) => r.upsellMidia),
    crmDisparos: CRM_DISPAROS * NEW_SEG_DAYS, crmIns: sum((r) => r.crmInsDay), vendasCRM: sum((r) => r.vendasCRM), upsellCRM: sum((r) => r.upsellCRM),
    dayIns: sum((r) => r.dayIns), vendasDia: sum((r) => r.vendasDia),
    cadastros: sum((r) => r.cadastrosDia), votosPedidos: sum((r) => r.votosPedidosDia), videos: sum((r) => r.videosDia), votos: VOTOS_DIA * NEW_SEG_DAYS,
    accCadastros: last.accCadastros, accVotosPedidos: last.accVotosPedidos, accVideos: last.accVideos, accVotos: last.accVotos,
    accIns: last.acc, accVendas: last.accVendas, accInv: last.accInv,
  };

  // ── Cards (renderCards do HTML) ──
  const crmFuturo = _CRM_FUT;
  const crmTotal = HIST_INS_CRM + crmFuturo;
  const paidFuturo = TOTAL_INV / CPL;
  const paidTotal = HIST_INS_PAID + paidFuturo;
  const totalInvest = HIST_SPENT + TOTAL_INV;

  const mainMidia = Math.round(paidTotal * CONV_MIDIA);
  const mainCRM = Math.round(crmTotal * CONV_CRM);
  const vendasMain = mainMidia + mainCRM;
  const upsellMidiaC = Math.round(mainMidia * UPSELL_TX_MIDIA);
  const upsellCRMc = Math.round(mainCRM * UPSELL_TX_CRM);
  const totalUpsell = upsellMidiaC + upsellCRMc;
  const fatMain = vendasMain * TICKET_MAIN;
  const fatUpsell = totalUpsell * TICKET_UPSELL;
  const faturamento = fatMain + fatUpsell;
  const roas = faturamento / totalInvest;

  const totCad = Math.round(TARGET * TX_CADASTRO);
  const totVotPed = Math.round(totCad * TX_VOTO);
  const totVid = VIDEO_TARGET;
  const totVotTotal = VOTES_ALREADY + VOTOS_DIA * NEW_SEG_DAYS;

  const cards: PaceCards = {
    inscritosProjetados: last.acc, histInsTot: HIST_INS_TOT, target: TARGET,
    invRestante: TOTAL_INV, histSpent: HIST_SPENT, cpl: CPL, totalInvest,
    crmTotal, histInsCrm: HIST_INS_CRM, crmInsDia: CRM_INS_DIA, days: NEW_SEG_DAYS,
    rampDay1: weeklyBudget(0), rampDayLast: weeklyBudget(NEW_SEG_DAYS - 1),
    vendasMain, mainMidia, mainCRM, histVendas: HIST_VENDAS,
    totalUpsell, upsellMidia: upsellMidiaC, upsellCRM: upsellCRMc,
    faturamento, fatMain, fatUpsell, ticketMain: TICKET_MAIN, ticketUpsell: TICKET_UPSELL, roas,
    totCad, txCadastro: TX_CADASTRO,
    totVotPed, txVoto: TX_VOTO,
    totVid, txVideo: TX_VIDEO,
    totVotTotal, votesTarget: VOTES_TARGET, votesAlready: VOTES_ALREADY, votosDia: VOTOS_DIA,
  };

  return { rows, totals, cards };
}

export type ExpectedDay = { date: string; acc: number; add: number };

// Trajetória esperada de inscritos acumulados, por dia (19/06 → 30/08, os 2 segmentos). Derivada do modelo.
export function expectedTrajectory(): ExpectedDay[] {
  return paceModel().rows.map((r) => ({ date: r.date, acc: r.acc, add: r.dayIns }));
}

// Dia de hoje em horário de Brasília (YYYY-MM-DD).
export function todayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
