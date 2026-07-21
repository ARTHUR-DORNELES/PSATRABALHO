'use client';
import { useMemo, useState } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { paceModel, todayBRT, PACE_META, PACE_START, PACE_REBASELINE_2, PACE_DAYS, PACE_DISPLAY_START, type PaceRow } from '@/lib/pace';
import { KpiPanel } from './KpiPanel';
import type { MetaAdsData } from '@/lib/meta-ads';
import type { GoogleAdsData } from '@/lib/google-ads';
import type { RefAdsDaily } from '@/lib/media-ref';

const fmtR = (n: number) => 'R$ ' + new Intl.NumberFormat('pt-BR').format(Math.round(n));
const nilN = (v: number | null) => (v == null ? '—' : formatNumber(v));
const nilR = (v: number | null) => (v == null ? '—' : fmtR(v));
// Δ% do real vs projetado, colorido por limiar SUAVE (verde ≥ −10% · âmbar −10..−30% · vermelho < −30%).
// Evita "qualquer negativo = vermelho" — a curva projetada é agressiva, então o vermelho fica reservado pro que importa.
function deltaBadge(real: number | null, proj: number): React.ReactNode {
  if (real == null || !proj) return null;
  const p = real / proj - 1;
  const pct = Math.round(p * 100);
  const color = p >= -0.1 ? '#1a9e5f' : p >= -0.3 ? '#c98a00' : '#d24b3e';
  return <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color, marginTop: 1 }}>{pct > 0 ? '+' : ''}{pct}%</span>;
}
// Conversão = vendas/inscritos (em %). Cuidado: a diária é ruidosa (venda de hoje pode vir de inscrito de ontem);
// o número estável é a média do período, no rodapé.
const convPct = (v: number | null, base: number | null) => (v == null || !base ? '—' : (v / base * 100).toFixed(1).replace('.', ',') + '%');
const TRAJ_TABS = [
  { k: 'geral', label: 'Geral' },
  { k: 'midia', label: 'Mídia Paga' },
  { k: 'crm', label: 'CRM' },
  { k: 'funil', label: 'Funil' },
  { k: 'resultado', label: 'Resultado' },
] as const;
type TrajTab = typeof TRAJ_TABS[number]['k'];

export function PaceBlock({ data, meta, google, refAds }: { data: Snapshot; meta?: MetaAdsData; google?: GoogleAdsData; refAds?: RefAdsDaily }) {
  const m = useMemo(() => {
    const model = paceModel();
    const { rows, totals, cards } = model;
    const expByDate = new Map(rows.map((r) => [r.date, r]));

    // Série diária REAL de inscritos (por data de inscrição).
    const diario = data.visaoIntegrada?.diario;
    const realIns: { date: string; insc: number }[] = (diario && diario.length > 0)
      ? diario.map((d) => ({ date: d.date, insc: d.inscritos }))
      : (data.daily?.edition2026?.dailyStages ?? []).map((d) => ({ date: d.date, insc: Object.values(d.byStage).reduce((a, b) => a + b, 0) }));
    realIns.sort((a, b) => a.date.localeCompare(b.date));
    const realInsByDate = new Map(realIns.map((d) => [d.date, d.insc]));
    // Demais séries REAIS por data (vendas/upsell/faturamento/investido) — pro projetado × real da aba Geral.
    const realVendasByDate = new Map((diario ?? []).map((d) => [d.date, d.vendas]));
    const realUpsellByDate = new Map((data.tbschoolUpsellDaily ?? []).map((d) => [d.date, d.vendas]));
    const realFatByDate = new Map((data.tbschoolReceitaDaily ?? []).map((d) => [d.date, d.receita]));
    // Investido real = puxado direto do painel de referência "Mídia Paga" (tbs-meta-ads.vercel.app,
    // lib/media-ref.ts), NÃO do nosso próprio fetch ao Graph/Google Ads API (meta/google acima, usados
    // pelas outras abas). Decisão 08/07/2026: calibrar 1:1 com o painel que a diretoria acompanha, mesmo
    // sabendo que ele tem um gap de dados conhecido (Meta 26-30/06 some de lá) — é a fonte oficial escolhida.
    const realInvByDate = new Map<string, number>();
    for (const d of refAds?.meta ?? []) realInvByDate.set(d.date, (realInvByDate.get(d.date) || 0) + d.spend);
    for (const d of refAds?.google ?? []) realInvByDate.set(d.date, (realInvByDate.get(d.date) || 0) + d.spend);
    // Séries REAIS por domínio (pras abas Mídia/CRM/Funil/Resultado).
    const origemD = data.origemDiaria ?? [];
    const realMidiaInsByDate = new Map(origemD.map((d) => [d.date, d.byFonte?.paid_social || 0]));
    // CRM = tudo que NÃO é mídia paga (Social Pago + Pesquisa Paga fora) — critério da lista 15693.
    const realCrmInsByDate = new Map(origemD.map((d) => {
      const bf = d.byFonte || {};
      const naoPaga = Object.entries(bf).reduce((s, [k, v]) => (k === 'paid_social' || k === 'paid_search') ? s : s + (v || 0), 0);
      return [d.date, naoPaga];
    }));
    const realMidiaVendByDate = new Map((data.tbschoolMidiaDaily ?? []).map((d) => [d.date, d.vendas]));
    const realCrmVendByDate = new Map((data.tbschoolCrmDaily ?? []).map((d) => [d.date, d.vendas])); // CRM = não-paga (lista 15693)
    const stagesD = data.daily?.edition2026?.dailyStages ?? [];
    const realCadByDate = new Map(stagesD.map((s) => [s.date, (s.byStage?.completou_cadastro || 0) + (s.byStage?.upload_video_concluido || 0) + (s.byStage?.analise_ia_pronto || 0)]));
    const realVidByDate = new Map(stagesD.map((s) => [s.date, (s.byStage?.upload_video_concluido || 0) + (s.byStage?.analise_ia_pronto || 0)]));
    const TM = cards.ticketMain, TU = cards.ticketUpsell;

    // Acumulado real (inclui base pré-janela / pré-06/07 → seed correto no início da janela).
    let c = 0;
    const cumArr = realIns.map((d) => { c += d.insc; return { date: d.date, cum: c }; });
    const totalAtual = c;

    const today = todayBRT();
    const idx = rows.findIndex((r) => r.date === today);
    const inWindow = idx >= 0;
    const expectedToday = inWindow ? rows[idx].acc : (today < PACE_START ? rows[0].acc : PACE_META);
    const delta = totalAtual - expectedToday;
    const pctPace = expectedToday > 0 ? totalAtual / expectedToday : 0;
    const diasDecorridos = inWindow ? idx + 1 : (today < PACE_START ? 0 : PACE_DAYS);
    const diasRestantes = Math.max(0, PACE_DAYS - diasDecorridos);
    const faltam = Math.max(0, PACE_META - totalAtual);
    const ritmoNecessario = diasRestantes > 0 ? faltam / diasRestantes : 0;

    const ult7 = realIns.slice(-7);
    const ritmoAtual = ult7.length ? ult7.reduce((a, b) => a + b.insc, 0) / ult7.length : 0;

    // A tabela mostra o REAL desde 01/06 (PACE_DISPLAY_START), mesmo antes do 1º re-baseline (19/06).
    // Linhas 01/06→18/06 são "pré-projeção": só real, sem coluna "deveria" (não existia projeção ainda).
    // A partir de 19/06 JÁ existe "deveria" — vem do lib/pace.ts (2 segmentos: modelo antigo 19/06-05/07
    // congelado + modelo ativo 06/07 em diante) — não colapsar essa janela em "sem projeção" de novo.
    const prePaceRows: (PaceRow & { prePace: true })[] = [];
    {
      const s0 = Date.UTC(2026, 5, 1), s1 = Date.UTC(2026, 5, 19); // 01/06 (incl) → 19/06 (excl) = 01..18/06
      const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      for (let t = s0; t < s1; t += 86400000) {
        const d = new Date(t);
        prePaceRows.push({
          date: new Date(t).toISOString().slice(0, 10),
          ds: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
          wd: WD[d.getUTCDay()],
          budget: 0, midiaIns: 0, vendasMidia: 0, upsellMidia: 0,
          crmDisparos: 0, crmInsDay: 0, vendasCRM: 0, upsellCRM: 0,
          cadastrosDia: 0, votosPedidosDia: 0, videosDia: 0, votosDia: 0,
          dayIns: 0, vendasDia: 0, acc: 0, accVendas: 0, accInv: 0, accFat: 0,
          accCadastros: 0, accVotosPedidos: 0, accVideos: 0, accVotos: 0, pct: 0,
          prePace: true,
        });
      }
    }
    const modelRows: (PaceRow & { prePace?: boolean })[] = [...prePaceRows, ...rows];
    const hitDate = rows.find((r) => r.acc >= PACE_META)?.date;

    // Tabela dia-a-dia: anexa o REAL (carry-forward) a cada linha. Faturamento "deveria" acumulado
    // (r.accFat) já vem PRONTO de lib/pace.ts — cada segmento (antigo/ativo) seeda e acumula o próprio,
    // então não dá pra recalcular aqui somando um HIST_FAT único por cima dos dois (dobraria a contagem
    // no segmento antigo). Faturamento REAL é TOTAL: acumula TODAS as datas, seed corta em PACE_DISPLAY_START
    // (pré-01/06), e essas linhas acumulam o próprio real — sem dupla contagem; os totais da janela batem igual.
    let fatRealSeed = 0; for (const [d, v] of realFatByDate) if (d < PACE_DISPLAY_START) fatRealSeed += v;
    let vendRealSeed = 0; for (const [d, v] of realVendasByDate) if (d < PACE_DISPLAY_START) vendRealSeed += v;
    // Investido real SEM seed pré-01/06 — o "deveria" (HIST_SPENT, nos dois segmentos) nunca contou
    // gasto anterior a 01/06, então real também só acumula a partir daí (mesmo escopo pro acumulado,
    // mas ver nota acima: o "deveria" continua sendo só captação, e o real agora é conta inteira —
    // não é mais uma comparação de mesmo escopo, é intencional pra bater com o painel de referência).
    const invRealSeed = 0;
    let pi = 0, lastCum = 0, accFatReal = fatRealSeed, accVendReal = vendRealSeed, accInvReal = invRealSeed;
    const tableRows = modelRows.map((r) => {
      while (pi < cumArr.length && cumArr[pi].date <= r.date) { lastCum = cumArr[pi].cum; pi++; }
      const isFuture = r.date > today;
      const upsellProj = r.upsellMidia + r.upsellCRM;
      const fatProjDia = r.vendasDia * TM + upsellProj * TU;
      const realInsDia = isFuture ? null : (realInsByDate.get(r.date) ?? 0);
      const realVendasDia = isFuture ? null : (realVendasByDate.get(r.date) ?? 0);
      const realUpsellDia = isFuture ? null : (realUpsellByDate.get(r.date) ?? 0);
      const realFatDia = isFuture ? null : (realFatByDate.get(r.date) ?? 0);
      const realInvDia = isFuture ? null : (realInvByDate.get(r.date) ?? 0);
      const realMidiaIns = isFuture ? null : (realMidiaInsByDate.get(r.date) ?? 0);
      const realMidiaVend = isFuture ? null : (realMidiaVendByDate.get(r.date) ?? 0);
      const realCrmIns = isFuture ? null : (realCrmInsByDate.get(r.date) ?? 0);
      const realCrmVend = isFuture ? null : (realCrmVendByDate.get(r.date) ?? 0); // vendas reais de CRM (e-mail + WhatsApp), não "total − mídia"
      const realCad = isFuture ? null : (realCadByDate.get(r.date) ?? 0);
      const realVid = isFuture ? null : (realVidByDate.get(r.date) ?? 0);
      if (!isFuture) { accFatReal += (realFatDia ?? 0); accVendReal += (realVendasDia ?? 0); accInvReal += (realInvDia ?? 0); }
      return {
        ...r, upsellProj, fatProjDia,
        realInsDia, realVendasDia, realUpsellDia, realFatDia, realInvDia,
        realMidiaIns, realMidiaVend, realCrmIns, realCrmVend, realCad, realVid,
        realAcc: isFuture ? null : lastCum, realAccFat: isFuture ? null : accFatReal,
        realAccVendas: isFuture ? null : accVendReal, realAccInv: isFuture ? null : accInvReal,
        deltaAcc: isFuture ? null : lastCum - r.acc, isToday: r.date === today,
        prePace: !!r.prePace, isHit: r.date === hitDate,
      };
    });

    // Acumulado ATÉ HOJE (deveria × real) — pro rodapé "no total" da aba Geral.
    const lastRow = [...tableRows].reverse().find((r) => r.date <= today) ?? tableRows[tableRows.length - 1];
    let realUpsellSum = 0, upsDevSum = 0;
    let midiaInsDev = 0, midiaInsReal = 0, midiaVendDev = 0, midiaVendReal = 0, upsMidiaDev = 0;
    let crmInsDev = 0, crmInsReal = 0, crmVendDev = 0, crmVendReal = 0, enviosDev = 0, upsCrmDev = 0;
    let cadDev = 0, cadReal = 0, pedDev = 0, vidDev = 0, vidReal = 0, votosDiaDev = 0;
    for (const r of tableRows) {
      if (r.date > today) break;
      if (r.prePace) continue; // pré-19/06 não tem "deveria" — fora das somas dia-a-dia do rodapé (Δ% só faz sentido na janela da projeção)
      realUpsellSum += r.realUpsellDia ?? 0; upsDevSum += r.upsellProj;
      midiaInsDev += r.midiaIns; midiaInsReal += r.realMidiaIns ?? 0; midiaVendDev += r.vendasMidia; midiaVendReal += r.realMidiaVend ?? 0; upsMidiaDev += r.upsellMidia;
      crmInsDev += r.crmInsDay; crmInsReal += r.realCrmIns ?? 0; crmVendDev += r.vendasCRM; crmVendReal += r.realCrmVend ?? 0; enviosDev += r.crmDisparos; upsCrmDev += r.upsellCRM;
      cadDev += r.cadastrosDia; cadReal += r.realCad ?? 0; pedDev += r.votosPedidosDia; vidDev += r.videosDia; vidReal += r.realVid ?? 0; votosDiaDev += r.votosDia;
    }
    // Vendas/Investido reais TOTAIS (seedados com o pré-janela) — o "deveria" acumulado já inclui o seed,
    // então o real também precisa, senão o Δ% fica distorcido.
    const somaHoje = {
      invDev: lastRow.accInv, invReal: lastRow.realAccInv ?? 0,
      inscDev: lastRow.acc, inscReal: totalAtual,
      vendasDev: lastRow.accVendas, vendasReal: lastRow.realAccVendas ?? 0,
      upsDev: upsDevSum, upsReal: realUpsellSum,
      fatDev: lastRow.accFat, fatReal: lastRow.realAccFat ?? 0,
      midiaInsDev, midiaInsReal, midiaVendDev, midiaVendReal, upsMidiaDev,
      crmInsDev, crmInsReal, crmVendDev, crmVendReal, enviosDev, upsCrmDev,
      cadDev, cadReal, pedDev, vidDev, vidReal, votosDiaDev,
    };

    // Pace por período.
    const somaReal = (dates: string[]) => dates.reduce((a, d) => a + (realInsByDate.get(d) || 0), 0);
    const somaEsp = (dates: string[]) => dates.reduce((a, d) => a + (expByDate.get(d)?.dayIns || 0), 0);
    const dateRange = (fromMs: number, toMs: number) => { const out: string[] = []; for (let t = fromMs; t <= toMs; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out; };
    const todayMs = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
    const diaReal = realInsByDate.get(today) || 0;
    const diaEsp = expByDate.get(today)?.dayIns || 0;
    const semDatas = dateRange(todayMs - 6 * 86400000, todayMs);
    const mesIniMs = Math.max(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, 1), Date.UTC(2026, 5, 12));
    const mesDatas = dateRange(mesIniMs, todayMs);

    // Série pro gráfico.
    const chart = rows.map((r) => ({ date: r.date, esperado: r.acc, real: undefined as number | undefined }));
    pi = 0; lastCum = 0;
    for (const ch of chart) {
      if (ch.date > today) { ch.real = undefined; continue; }
      while (pi < cumArr.length && cumArr[pi].date <= ch.date) { lastCum = cumArr[pi].cum; pi++; }
      ch.real = lastCum;
    }

    return {
      cards, totals, tableRows,
      totalAtual, expectedToday, delta, pctPace, diasDecorridos, diasRestantes, faltam, ritmoNecessario, ritmoAtual, today, inWindow,
      dia: { real: diaReal, esp: diaEsp },
      semana: { real: somaReal(semDatas), esp: somaEsp(semDatas) },
      mes: { real: somaReal(mesDatas), esp: somaEsp(mesDatas) },
      chart, somaHoje,
    };
  }, [data, meta, google, refAds]);

  // Estilos de cabeçalho de grupo da tabela grande (sticky ao rolar a tabela).
  const gh = (bg: string, top = 0): React.CSSProperties => ({ background: bg, color: '#fff', padding: '8px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', textAlign: 'center', position: 'sticky', top, zIndex: 5 });
  const COL = { midia: '#c0392b', crm: '#16a085', crmSub: '#148f77', funil: '#8e44ad', funilSub: '#7d3c98', base: '#2c3e50', baseSub: '#273444', real: '#e67e22', realSub: '#cf6f17' };

  const [tab, setTab] = useState<TrajTab>('geral');
  type TRow = typeof m.tableRows[number];
  type TCol = { grp: string; gc: string; sub: string; sc: string; real?: boolean; bold?: boolean; render: (r: TRow) => React.ReactNode; foot?: () => React.ReactNode };
  const sh = m.somaHoje;
  const colsByTab: Record<TrajTab, TCol[]> = {
    // GERAL: projetado (deveria) × real, por métrica. Rodapé = acumulado ATÉ HOJE.
    geral: [
      { grp: '💰 Investido', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => fmtR(r.budget), foot: () => fmtR(sh.invDev) },
      { grp: '💰 Investido', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => nilR(r.realInvDia), foot: () => fmtR(sh.invReal) },
      { grp: '👥 Inscritos novos', gc: COL.base, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.dayIns), foot: () => formatNumber(sh.inscDev) },
      { grp: '👥 Inscritos novos', gc: COL.base, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realInsDia)}{deltaBadge(r.realInsDia, r.dayIns)}</>, foot: () => <>{formatNumber(sh.inscReal)}{deltaBadge(sh.inscReal, sh.inscDev)}</> },
      { grp: '🛒 Vendas', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.vendasDia), foot: () => formatNumber(sh.vendasDev) },
      { grp: '🛒 Vendas', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realVendasDia)}{deltaBadge(r.realVendasDia, r.vendasDia)}</>, foot: () => <>{formatNumber(sh.vendasReal)}{deltaBadge(sh.vendasReal, sh.vendasDev)}</> },
      { grp: '🎯 Conversão', gc: COL.funil, sub: 'vend/insc', sc: COL.realSub, real: true, render: (r) => convPct(r.realVendasDia, r.realInsDia), foot: () => convPct(sh.vendasReal, sh.inscReal) },
      { grp: '⬆️ Upsell', gc: COL.funil, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.upsellProj), foot: () => formatNumber(sh.upsDev) },
      { grp: '⬆️ Upsell', gc: COL.funil, sub: 'real', sc: COL.realSub, real: true, render: (r) => nilN(r.realUpsellDia), foot: () => formatNumber(sh.upsReal) },
      { grp: '💵 Faturamento', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => fmtR(r.fatProjDia), foot: () => fmtR(sh.fatDev) },
      { grp: '💵 Faturamento', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => nilR(r.realFatDia), foot: () => fmtR(sh.fatReal) },
      { grp: 'Σ Inscrições (acum.)', gc: COL.base, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.acc), foot: () => formatNumber(sh.inscDev) },
      { grp: 'Σ Inscrições (acum.)', gc: COL.base, sub: 'real', sc: COL.realSub, real: true, bold: true, render: (r) => <>{nilN(r.realAcc)}{deltaBadge(r.realAcc, r.acc)}</>, foot: () => <>{formatNumber(sh.inscReal)}{deltaBadge(sh.inscReal, sh.inscDev)}</> },
      { grp: 'Σ Faturamento (acum.)', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => fmtR(r.accFat), foot: () => fmtR(sh.fatDev) },
      { grp: 'Σ Faturamento (acum.)', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, bold: true, render: (r) => nilR(r.realAccFat), foot: () => fmtR(sh.fatReal) },
    ],
    // MÍDIA PAGA: deveria × real (upsell de mídia não tem série real → só deveria).
    midia: [
      { grp: '💰 Investido', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => fmtR(r.budget), foot: () => fmtR(sh.invDev) },
      { grp: '💰 Investido', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilR(r.realInvDia)}{deltaBadge(r.realInvDia, r.budget)}</>, foot: () => <>{fmtR(sh.invReal)}{deltaBadge(sh.invReal, sh.invDev)}</> },
      { grp: '👥 Inscritos', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.midiaIns), foot: () => formatNumber(sh.midiaInsDev) },
      { grp: '👥 Inscritos', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realMidiaIns)}{deltaBadge(r.realMidiaIns, r.midiaIns)}</>, foot: () => <>{formatNumber(sh.midiaInsReal)}{deltaBadge(sh.midiaInsReal, sh.midiaInsDev)}</> },
      { grp: '🛒 Vendas', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.vendasMidia), foot: () => formatNumber(sh.midiaVendDev) },
      { grp: '🛒 Vendas', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realMidiaVend)}{deltaBadge(r.realMidiaVend, r.vendasMidia)}</>, foot: () => <>{formatNumber(sh.midiaVendReal)}{deltaBadge(sh.midiaVendReal, sh.midiaVendDev)}</> },
      { grp: '⬆️ Upsell', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.upsellMidia), foot: () => formatNumber(sh.upsMidiaDev) },
    ],
    // CRM: deveria × real (envios e upsell CRM sem série real; vendas CRM = total − mídia).
    crm: [
      { grp: '📧 Envios', gc: COL.crm, sub: 'deveria', sc: COL.crmSub, render: (r) => formatNumber(r.crmDisparos), foot: () => formatNumber(sh.enviosDev) },
      { grp: '👥 Inscritos', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.crmInsDay), foot: () => formatNumber(sh.crmInsDev) },
      { grp: '👥 Inscritos', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realCrmIns)}{deltaBadge(r.realCrmIns, r.crmInsDay)}</>, foot: () => <>{formatNumber(sh.crmInsReal)}{deltaBadge(sh.crmInsReal, sh.crmInsDev)}</> },
      { grp: '🛒 Vendas', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.vendasCRM), foot: () => formatNumber(sh.crmVendDev) },
      { grp: '🛒 Vendas', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realCrmVend)}{deltaBadge(r.realCrmVend, r.vendasCRM)}</>, foot: () => <>{formatNumber(sh.crmVendReal)}{deltaBadge(sh.crmVendReal, sh.crmVendDev)}</> },
      { grp: '⬆️ Upsell', gc: COL.crm, sub: 'deveria', sc: COL.crmSub, render: (r) => formatNumber(r.upsellCRM), foot: () => formatNumber(sh.upsCrmDev) },
    ],
    // FUNIL: deveria × real onde há série (cadastros, vídeo); pedidos de voto e votos/dia só deveria.
    funil: [
      { grp: '📝 Cadastros', gc: COL.funil, sub: 'deveria', sc: COL.funilSub, render: (r) => formatNumber(r.cadastrosDia), foot: () => formatNumber(sh.cadDev) },
      { grp: '📝 Cadastros', gc: COL.funil, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realCad)}{deltaBadge(r.realCad, r.cadastrosDia)}</>, foot: () => <>{formatNumber(sh.cadReal)}{deltaBadge(sh.cadReal, sh.cadDev)}</> },
      { grp: '🎬 Vídeo', gc: COL.funil, sub: 'deveria', sc: COL.funilSub, render: (r) => formatNumber(r.videosDia), foot: () => formatNumber(sh.vidDev) },
      { grp: '🎬 Vídeo', gc: COL.funil, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realVid)}{deltaBadge(r.realVid, r.videosDia)}</>, foot: () => <>{formatNumber(sh.vidReal)}{deltaBadge(sh.vidReal, sh.vidDev)}</> },
      { grp: '🗳️ Pediu voto', gc: COL.funil, sub: 'deveria', sc: COL.funilSub, render: (r) => formatNumber(r.votosPedidosDia), foot: () => formatNumber(sh.pedDev) },
      { grp: '✅ Votos/dia', gc: COL.base, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.votosDia), foot: () => formatNumber(sh.votosDiaDev) },
    ],
    // RESULTADO: deveria × real em tudo (resumo).
    resultado: [
      { grp: '👥 Total Insc.', gc: COL.base, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.dayIns), foot: () => formatNumber(sh.inscDev) },
      { grp: '👥 Total Insc.', gc: COL.base, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realInsDia)}{deltaBadge(r.realInsDia, r.dayIns)}</>, foot: () => <>{formatNumber(sh.inscReal)}{deltaBadge(sh.inscReal, sh.inscDev)}</> },
      { grp: '🛒 Total Vendas', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.vendasDia), foot: () => formatNumber(sh.vendasDev) },
      { grp: '🛒 Total Vendas', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realVendasDia)}{deltaBadge(r.realVendasDia, r.vendasDia)}</>, foot: () => <>{formatNumber(sh.vendasReal)}{deltaBadge(sh.vendasReal, sh.vendasDev)}</> },
      { grp: 'Σ Inscrições', gc: COL.base, sub: 'deveria', sc: COL.baseSub, render: (r) => `${formatNumber(r.acc)} (${r.pct}%)`, foot: () => formatNumber(sh.inscDev) },
      { grp: 'Σ Inscrições', gc: COL.base, sub: 'real', sc: COL.realSub, real: true, bold: true, render: (r) => <>{nilN(r.realAcc)}{deltaBadge(r.realAcc, r.acc)}</>, foot: () => <>{formatNumber(sh.inscReal)}{deltaBadge(sh.inscReal, sh.inscDev)}</> },
      { grp: 'Σ Vendas', gc: COL.crm, sub: 'deveria', sc: COL.baseSub, render: (r) => formatNumber(r.accVendas), foot: () => formatNumber(sh.vendasDev) },
      { grp: 'Σ Vendas', gc: COL.crm, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilN(r.realAccVendas)}{deltaBadge(r.realAccVendas, r.accVendas)}</>, foot: () => <>{formatNumber(sh.vendasReal)}{deltaBadge(sh.vendasReal, sh.vendasDev)}</> },
      { grp: 'Σ Investido', gc: COL.midia, sub: 'deveria', sc: COL.baseSub, render: (r) => fmtR(r.accInv), foot: () => fmtR(sh.invDev) },
      { grp: 'Σ Investido', gc: COL.midia, sub: 'real', sc: COL.realSub, real: true, render: (r) => <>{nilR(r.realAccInv)}{deltaBadge(r.realAccInv, r.accInv)}</>, foot: () => <>{fmtR(sh.invReal)}{deltaBadge(sh.invReal, sh.invDev)}</> },
    ],
  };
  const cols = colsByTab[tab];
  const groups: { grp: string; color: string; span: number }[] = [];
  for (const c of cols) { const last = groups[groups.length - 1]; if (last && last.grp === c.grp) last.span++; else groups.push({ grp: c.grp, color: c.gc, span: 1 }); }

  return (
    <div className="space-y-5">
      {/* ───── KPIs do dia (movido pra cá) ───── */}
      <KpiPanel data={data} meta={meta} google={google} refAds={refAds} />

      {/* ───── Tabela de trajetória dia a dia (projetado + real) ───── */}
      <section className="card">
        <h2 className="card-title">Trajetória dia a dia</h2>
        <p className="card-subtitle">
          {tab === 'geral'
            ? <>projetado (<strong>deveria</strong>) × <strong>real</strong> por dia · desde <strong>01/06</strong> · investido, inscritos, vendas, upsell, faturamento e acumulados</>
            : <>projetado (<strong>deveria</strong>) × <strong>real</strong> por dia nesta frente · desde <strong>01/06</strong> · rodapé = acumulado até hoje</>}
          {' '}<span className="text-tbs-orange font-semibold">· 19/06 * e 06/07 *</span> marcam os re-baselines das metas.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
          {TRAJ_TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition ${tab === t.k ? 'bg-tbs-orange text-white border-tbs-orange' : 'border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:border-tbs-orange/60'}`}>{t.label}</button>
          ))}
        </div>
        <div className="divider-accent mb-4" />
        <div className="overflow-auto max-h-[560px] rounded-xl border border-tbs-line-light dark:border-tbs-line">
          <table className="w-full text-[12px] border-collapse" style={{ minWidth: 160 + cols.length * 92 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={gh('#c0392b')}>Data</th>
                <th rowSpan={2} style={gh('#c0392b')}>Dia</th>
                {groups.map((g, i) => <th key={i} colSpan={g.span} style={gh(g.color)}>{g.grp}</th>)}
              </tr>
              <tr>
                {cols.map((c, i) => <th key={i} style={gh(c.sc, 33)}>{c.sub}</th>)}
              </tr>
            </thead>
            <tbody>
              {m.tableRows.map((r) => {
                const isRebaseline1 = r.date === PACE_START;
                const isRebaseline2 = r.date === PACE_REBASELINE_2;
                const isRebaseline = isRebaseline1 || isRebaseline2;
                const rowBg = r.isHit ? 'bg-emerald-50 dark:bg-emerald-500/10'
                  : r.isToday ? 'bg-tbs-orange/10'
                  : r.prePace ? 'bg-tbs-surface-light/60 dark:bg-tbs-bg-3/25'
                  : 'hover:bg-tbs-surface-light dark:hover:bg-tbs-bg-3/40';
                return (
                  <tr key={r.date} className={`border-t border-tbs-line-light dark:border-tbs-line ${rowBg}`} style={isRebaseline ? { borderTop: '2px solid #F08220' } : undefined}>
                    <td className="px-2.5 py-1.5 text-center font-semibold text-tbs-ink-light dark:text-white whitespace-nowrap">
                      {r.ds}
                      {isRebaseline1 && <span title="19/06 — 1º re-baseline: a projeção passou a mirar 100k (modelo de 71 dias, rampa linear de investimento, CPL R$4,50). Vigorou até 05/07, quando foi substituído. Antes desse dia (01/06-18/06) não havia projeção — só o realizado." className="ml-0.5 text-tbs-orange font-extrabold cursor-help">*</span>}
                      {isRebaseline2 && <span title="06/07 — 2º re-baseline: novo investimento em mídia paga (escalonamento semanal R$3.200→R$7.750/dia, CPL R$4,19), substituindo o modelo de 19/06. Da 19/06 a 05/07 a coluna 'deveria' mostra o que o modelo ANTERIOR projetava (congelado); a partir daqui é o modelo ATIVO." className="ml-0.5 text-tbs-orange font-extrabold cursor-help">*</span>}
                      {r.isToday && <span className="ml-1 text-[9px] text-tbs-orange-deep dark:text-tbs-orange-light">hoje</span>}
                    </td>
                    <td className="px-2.5 py-1.5 text-center text-tbs-mute-light dark:text-tbs-mute">{r.wd}</td>
                    {cols.map((c, j) => (
                      <td key={j} className="px-2.5 py-1.5 text-center whitespace-nowrap text-tbs-ink-light dark:text-white" style={{ color: c.real ? COL.real : undefined, fontWeight: c.real || c.bold ? 700 : 400 }}>{(r.prePace && !c.real) ? <span className="opacity-30">—</span> : c.render(r)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: COL.base, color: '#fff', fontWeight: 700, position: 'sticky', bottom: 0 }}>
                <td className="px-2.5 py-2 text-center whitespace-nowrap" colSpan={2}>ATÉ HOJE</td>
                {cols.map((c, j) => (
                  <td key={j} className="px-2.5 py-2 text-center whitespace-nowrap" style={{ color: c.real ? '#ffd9b3' : '#fff' }}>{c.foot ? c.foot() : ''}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
          {tab === 'geral'
            ? <>Em cada métrica: <strong>deveria</strong> = projeção do modelo no dia · <strong style={{ color: COL.real }}>real</strong> = o que aconteceu (HubSpot/Kiwify/Meta). O <strong>Δ%</strong> embaixo do real é a distância da curva projetada (<span style={{ color: '#1a9e5f', fontWeight: 700 }}>verde ≥ −10%</span> · <span style={{ color: '#c98a00', fontWeight: 700 }}>âmbar até −30%</span> · <span style={{ color: '#d24b3e', fontWeight: 700 }}>vermelho abaixo</span>) — lembrando que a curva mira 100k e é agressiva. <strong>Conversão</strong> = vendas/inscritos; a diária oscila (a média do período está no rodapé). Dias futuros aparecem como “—”. Investido real = Meta (conta inteira) + Google, calibrado com o painel de referência. <strong>Faturamento</strong> é total acumulado (todas as datas, não só da janela; projeção parte do realizado até a véspera). A linha verde marca o dia em que a projeção atinge 100k.</>
            : <><strong>deveria</strong> = projeção do modelo · <strong style={{ color: COL.real }}>real</strong> = o que aconteceu, com <strong>Δ%</strong> (<span style={{ color: '#1a9e5f', fontWeight: 700 }}>verde ≥ −10%</span> · <span style={{ color: '#c98a00', fontWeight: 700 }}>âmbar até −30%</span> · <span style={{ color: '#d24b3e', fontWeight: 700 }}>vermelho abaixo</span>). Rodapé = acumulado até hoje. {tab === 'midia' ? <>Upsell de mídia não tem série real separada (só deveria). Investido real = Meta (conta inteira) + Google, calibrado com o painel de referência.</> : tab === 'crm' ? <>Envios e upsell de CRM não têm série real (só deveria). <strong>CRM real = tudo que NÃO é mídia paga</strong> (Social Pago e Pesquisa Paga fora) — mesmo critério da lista "não é mídias pagas": inclui e-mail, WhatsApp, orgânico, direto e sem-fonte.</> : tab === 'funil' ? <>Pedidos de voto e votos/dia não têm série real (só deveria); cadastros/vídeo vêm das etapas da plataforma.</> : <>Acumulados de inscritos/vendas/investido incluem o seed pré-janela pra casar com o deveria.</>} A linha verde marca o dia em que a projeção atinge 100k.</>}
        </p>
        <p className="text-[11px] mt-2 leading-relaxed rounded-lg px-3 py-2 bg-tbs-orange/5 border border-tbs-orange/30 text-tbs-mute-light dark:text-tbs-mute">
          <span className="text-tbs-orange font-extrabold">*</span> <strong>19/06 — 1º re-baseline.</strong> A projeção passou a mirar 100k (modelo de 71 dias, rampa linear de investimento). Antes disso (<strong>01/06 a 18/06</strong>) não existia projeção nenhuma — só o <strong style={{ color: COL.real }}>real</strong> (linhas levemente sombreadas, colunas "deveria" como "—").
          <br />
          <span className="text-tbs-orange font-extrabold">*</span> <strong>06/07 — 2º re-baseline (novo investimento em mídia paga).</strong> Um novo escalonamento semanal de investimento (R$ 3.200 → R$ 7.750/dia, CPL R$ 4,19) substituiu o modelo de 19/06. De <strong>19/06 a 05/07</strong> a tabela mostra o "deveria" do modelo <strong>anterior</strong> (congelado — é registro do que foi projetado naquela janela, não mexe mais); a partir de 06/07 é o modelo <strong>ativo</strong>, que rege o resto da campanha. Os acumulados reais são contínuos em toda a tabela, sem dupla contagem na virada de nenhum dos dois dias.
        </p>
      </section>

    </div>
  );
}
