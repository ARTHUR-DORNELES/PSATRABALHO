import { cache } from 'react';
import snapshotJson from '@/data/snapshot.json';
import type { Snapshot } from './snapshot';
import { hsCount, hsSearch, hsSearchAll, hsSearchAllSeekByDateParallel, hsBatchAssoc, hubspotDiag } from './hubspot';
import { funnelStageDefs, deepestStageOf, LAUNCH_FILTER, LAUNCH_FLOOR_MS, INSCRITO_FILTER, REGISTRATION_DATE_PROP, TEST_FILTERS, UPLOAD_CARD_STAGES, ANALISE_PLUS_STAGES } from './funnel';
import { regionOf, REGION_KEYS, REGION_LABEL, ESTADO_FORM_PROP, type RegionKey } from './regions';
import { fonteOf, FONTE_BUCKETS, FONTE_PROP, FONTE_DET1_PROP, UTM_SOURCE_PROP, UTM_MEDIUM_PROP, UTM_TERM_PROP, UTM_CONTENT_PROP, ANALYTICS_SOURCE_PROP, OTAVIANO_TERM_TOKEN, OTAVIANO_TERM_NAME, type FonteKey } from './tbs-fonte';
import { storageConfigured, getSnapshotCache, setSnapshotCache } from './registros-store';

const CACHE_TTL = 60;

// Escopo "inscrito TBS 2026": propriedade inscrito_tbs_2026 = Sim (sinal direto e confiável de inscrição).
// Substitui o antigo edicao_da_participacao CONTAINS 2026 (que não pegava re-engajados).
const PARTICIPANT_FILTER = INSCRITO_FILTER;

// Piso de lançamento (LAUNCH_FILTER, por data de inscrição) vem de lib/funnel.ts — fonte única, compartilhada com o drill.
// Mapeamento de regiões (UF→região) vem de lib/regions.ts.

const tbs2026Filter = () => [PARTICIPANT_FILTER, LAUNCH_FILTER, ...TEST_FILTERS];

// HubSpot Search API permite ~4 req/seg por portal. Manter concorrência = 3 + retry em 429.
async function pLimit<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 3): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const worker = async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// total2026 (tbs2026Filter()) NÃO tem busca própria — é EXATAMENTE o 1º filterGroup de fetchInscritosRaw,
// então já sai de graça como fonteBuckets.stageCounts.inscricao_confirmada (ver mesma prova de fetchPlatformEntryCount).
// interesse_tbs_2026 é propriedade à parte (não fetchada na varredura) — mantém busca própria.
async function fetchInteresseCount(token: string): Promise<number> {
  return hsCount(token, { filterGroups: [{ filters: [{ propertyName: 'interesse_tbs_2026', operator: 'EQ', value: 'true' }, LAUNCH_FILTER, ...TEST_FILTERS] }] });
}

// Disparos de WhatsApp marcados no contato via automação HubSpot (checkbox true/false por disparo específico).
// Cada fluxo carimba a SUA própria propriedade quando envia — permite ROI por disparo sem precisar de UTM
// nem da API de automação (sem esse scope no token). Ver DisparosCostBlock.tsx / componente de custo WhatsApp.
export const DISPARO_HUBSPOT_DEFS = [
  { key: 'disparo_urgencia', label: 'Não comprou TBSchool - Disparo urgência', prop: 'tbs_nao_comprou_tbschool__disparo_urgencia' },
  { key: 'disparo_15min', label: 'Recebeu disparo 15 min após inscrição', prop: 'tbs_recebeu_disparo_15_min_apos_inscricao' },
  { key: 'disparo_carrinho', label: 'Recebeu disparo abandono de carrinho', prop: 'tbs_recebeu_disparo_abandono_de_carrinho' },
] as const;

async function fetchDisparoContactIds(token: string): Promise<{ key: string; ids: string[] }[]> {
  return Promise.all(
    DISPARO_HUBSPOT_DEFS.map(async (def) => {
      const rows = await hsSearchAll(token, 'contacts', {
        filterGroups: [{ filters: [{ propertyName: def.prop, operator: 'EQ', value: 'true' }] }],
        properties: [],
      });
      return { key: def.key, ids: rows.map((r) => r.id) };
    }),
  );
}

// Das 4 etapas do funil (lib/funnel.ts funnelStageDefs), 3 são deriváveis em memória a partir da MESMA
// varredura de fetchInscritosRaw (ver processFonteBuckets.stageCounts — prova de equivalência abaixo),
// então só "completou_cadastro" precisa de busca própria aqui (economiza 3 hsCount por rebuild):
// - inscricao_confirmada = INSCRITO_FILTER+LAUNCH_FILTER+TEST_FILTERS = exatamente o 1º filterGroup de
//   fetchInscritosRaw (tbs2026Filter()) → inscritoCount da varredura já é esse total, por construção.
// - upload_video_concluido / analise_ia_pronto exigem tbs___etapa num conjunto específico — como o 2º
//   filterGroup de fetchInscritosRaw já cobre "tbs___etapa HAS_PROPERTY + LAUNCH_FILTER + TEST_FILTERS",
//   qualquer contato dessas etapas está garantidamente na varredura, com tbs___etapa já lido.
async function fetchPlatformEntryCount(token: string): Promise<number> {
  const def = funnelStageDefs().find((d) => d.key === 'completou_cadastro')!;
  return hsCount(token, { filterGroups: def.filterGroups });
}

// (fetchDailyStages foi fundido em fetchFonteBuckets — uma varredura só dos inscritos serve origens + diário.)

// Origens TBS via fonte__tbs_ + detalhamento_1 (regra: Organic Social + WhatsApp → WhatsApp).
// Também computa o funil do tráfego pago → checkout/compra do The Best School (mesmo fetch).
// VARREDURA ÚNICA dos inscritos (busca). População = inscrito=Sim OU tem tbs___etapa (superset do tbs2026Filter).
// Paginação SEEK (por hs_object_id) — a base passou de 10k inscritos e o `after` da Search API estoura
// em 10.000. O seek não tem esse teto. A ordem não importa (processFonteBuckets agrega em memória).
async function fetchInscritosRaw(token: string) {
  // Particiona por DATA DE INSCRIÇÃO (não por hs_object_id — a base reativada tem IDs antigos e esparsos
  // que desbalanceavam as faixas). Ambos os filterGroups já exigem REGISTRATION_DATE_PROP >= LAUNCH_FLOOR_MS
  // (LAUNCH_FILTER), então particionar essa mesma propriedade em faixas de tempo é seguro e bem distribuído.
  return hsSearchAllSeekByDateParallel(token, 'contacts', {
    filterGroups: [
      { filters: tbs2026Filter() },
      { filters: [{ propertyName: 'tbs___etapa', operator: 'HAS_PROPERTY' }, LAUNCH_FILTER, ...TEST_FILTERS] },
    ],
    // As 3 últimas (data_do_pagamento/area_de_atuacao/data_de_nascimento) não são usadas pelas métricas de
    // ORIGEM desta varredura — estão aqui só pra fetchTbschoolDeals poder reaproveitar quem já veio nesta
    // busca (maioria dos compradores é inscrito do lançamento), sem precisar buscar de novo por contato.
    properties: [FONTE_PROP, FONTE_DET1_PROP, UTM_SOURCE_PROP, UTM_MEDIUM_PROP, UTM_TERM_PROP, UTM_CONTENT_PROP, ANALYTICS_SOURCE_PROP, 'tbschool__status_do_checkout', 'tbschool__valor_liquido_da_compra', 'recent_conversion_date', 'createdate', 'regiao_tbs', ESTADO_FORM_PROP, 'estado_tbs', 'hs_analytics_first_referrer', REGISTRATION_DATE_PROP, 'tbs___etapa', 'inscrito_tbs_2026', 'tbschool__data_do_pagamento', 'area_de_atuacao_tbs', 'data_de_nascimento_tbs'],
  }, REGISTRATION_DATE_PROP, Number(LAUNCH_FLOOR_MS), 10);
}

// Processa a varredura (em memória): origens + funil pago + ritmo + região + referrer + atividade diária +
// origens/dia + denominadores de preço. As métricas de ORIGEM só contam inscrito=Sim (guard) → reproduzem o
// tbs2026Filter exato; a atividade diária usa toda a população.
function processFonteBuckets(results: Awaited<ReturnType<typeof fetchInscritosRaw>>, dealsByContact: Map<string, { count: number; amount: number; live19: number; live29: number }> | null) {
  // Acumulador da influência Otaviano (independe do bucket — pago continua somando em Social Pago).
  const otaviano = { pagoInscritos: 0, pagoVendas: 0, pagoReceita: 0, orgInscritos: 0, orgVendas: 0, orgReceita: 0 };
  // Influência Karnal — overlay de mídia paga (criativo dele no utm_content). Sem canal orgânico próprio.
  const karnal = { pagoInscritos: 0, pagoVendas: 0, pagoReceita: 0, orgInscritos: 0, orgVendas: 0, orgReceita: 0 };
  const counts: Record<FonteKey, number> = { otaviano: 0, tiktok: 0, email: 0, whatsapp: 0, paid_social: 0, organic_social: 0, linktree_bio: 0, paid_search: 0, seo: 0, comunidade: 0, referral: 0, offline: 0, direto: 0, untracked: 0 };
  const vendasPorFonte: Record<FonteKey, number> = { otaviano: 0, tiktok: 0, email: 0, whatsapp: 0, paid_social: 0, organic_social: 0, linktree_bio: 0, paid_search: 0, seo: 0, comunidade: 0, referral: 0, offline: 0, direto: 0, untracked: 0 };
  const paid = { inscritos: 0, checkout: 0, compra: 0, receita: 0, receitaMeta: 0, receitaGoogle: 0, compraMeta: 0, compraGoogle: 0, receitaNovos: 0, receitaAntigos: 0, compraNovos: 0, compraAntigos: 0, inscritosNovos: 0, inscritosAntigos: 0, checkoutNovos: 0, checkoutAntigos: 0, compraNovos19: 0, compraNovos29: 0, compraAntigos19: 0, compraAntigos29: 0 };
  const LEAD_NOVO_DESDE = '2026-06-01'; // contato criado no HubSpot a partir de 01/06 = lead novo; antes = base reativada
  const slots = new Map<string, { total: number; paid: number; crm: number; cadastros: number; videos: number; compra: number; receita: number; compraPaga: number }>();
  const regionCnt: Record<RegionKey, number> = { norte: 0, nordeste: 0, centro_oeste: 0, suldeste: 0, sul: 0 };
  const refCounts = new Map<string, number>();
  let withReferrer = 0;
  let inscritoCount = 0; // inscrito=Sim na população (= total do tbs2026Filter)
  // 3 das 4 etapas do funil (lib/funnel.ts funnelStageDefs) são deriváveis DESTA MESMA varredura — evita
  // 3 hsCount extras por rebuild. Só "completou_cadastro" (propriedade diferente, data_entrou_na_plataforma_tbs)
  // continua com busca própria em fetchFunnelStages. Prova de equivalência no comentário de fetchFunnelStages.
  let cntUploadVideo = 0, cntAnaliseIa = 0;
  // Idem pro degrau "iniciaram checkout" do funil unificado (era fetchCheckoutCount, hsCount à parte) —
  // tbschool__status_do_checkout já está entre as properties buscadas por fetchInscritosRaw.
  let cntCheckoutTotal = 0;
  const zeroFonte = (): Record<FonteKey, number> => ({ otaviano: 0, tiktok: 0, email: 0, whatsapp: 0, paid_social: 0, organic_social: 0, linktree_bio: 0, paid_search: 0, seo: 0, comunidade: 0, referral: 0, offline: 0, direto: 0, untracked: 0 });
  const origemDiariaMap = new Map<string, Record<FonteKey, number>>();
  // Atividade diária por ETAPA (toda a população do filtro) + denominadores do comparativo de preço.
  const NEW_PRICE_DAY = '2026-06-05'; // virada de preço da live (R$19,90 → R$29,00), por data de inscrição
  const dailyBuckets: Record<string, Record<string, number>> = {};
  let spAntes = 0, spDepois = 0; // inscritos Social Pago antes/depois da virada (denominador da conversão)
  for (const c of results) {
    const inscDay = (c.properties[REGISTRATION_DATE_PROP] || '').slice(0, 10);
    // Diário por etapa: vale pra inscrito=Sim OU quem tem tbs___etapa (mesma regra do antigo fetchDailyStages).
    const inscritoFlag = c.properties.inscrito_tbs_2026 === 'Sim';
    const etapaRaw = c.properties.tbs___etapa || undefined;
    const stageKey = deepestStageOf(etapaRaw, inscritoFlag);
    if (stageKey && inscDay) { (dailyBuckets[inscDay] ||= {})[stageKey] = (dailyBuckets[inscDay][stageKey] || 0) + 1; }
    // Etapas do funil (cumulativas — não confundir com stageKey acima, que é a MAIS PROFUNDA/mutuamente exclusiva).
    if (inscritoFlag && etapaRaw && UPLOAD_CARD_STAGES.includes(etapaRaw)) cntUploadVideo++;
    if (etapaRaw && ANALISE_PLUS_STAGES.includes(etapaRaw)) cntAnaliseIa++;
    // Daqui pra baixo é ORIGEM/venda/região/ritmo → exclusivo de inscrito=Sim (reproduz o tbs2026Filter exato).
    if (!inscritoFlag) continue;
    inscritoCount++;
    if (c.properties.tbschool__status_do_checkout) cntCheckoutTotal++;
    const key = fonteOf(c.properties[FONTE_PROP], c.properties[FONTE_DET1_PROP], c.properties[UTM_SOURCE_PROP], c.properties[UTM_MEDIUM_PROP], c.properties[ANALYTICS_SOURCE_PROP], c.properties[UTM_TERM_PROP]);
    counts[key]++;
    // Inscritos por dia × origem (mesma data de inscrição usada na "Atividade diária").
    if (inscDay) {
      let row = origemDiariaMap.get(inscDay);
      if (!row) { row = zeroFonte(); origemDiariaMap.set(inscDay, row); }
      row[key]++;
    }
    // Denominador do comparativo de preço: inscritos de Social Pago por período (por data de inscrição).
    if (key === 'paid_social') { if (inscDay >= NEW_PRICE_DAY) spDepois++; else spAntes++; }
    // Região (mapa) e referrer de entrada — derivados na mesma passada.
    const region = regionOf(c.properties.regiao_tbs, c.properties[ESTADO_FORM_PROP], c.properties.estado_tbs);
    if (region) regionCnt[region]++;
    const rawRef = c.properties.hs_analytics_first_referrer?.trim();
    let refLabel: string;
    if (!rawRef) refLabel = 'Direto / link digitado';
    else { withReferrer++; try { refLabel = new URL(rawRef).hostname.replace(/^www\./, ''); } catch { refLabel = rawRef; } }
    refCounts.set(refLabel, (refCounts.get(refLabel) || 0) + 1);
    const isPaid = key === 'paid_social'; // mídia paga = Meta (Google desvinculado)
    const st = c.properties.tbschool__status_do_checkout;
    // Vendas/receita do curso vêm do PIPELINE de negócios (join negócio→contato).
    // Fallback p/ propriedades do contato se a associação não veio (dealsByContact null).
    const dc = dealsByContact ? dealsByContact.get(c.id) : null;
    const orders = dealsByContact ? (dc ? dc.count : 0) : (st === 'true' ? 1 : 0);
    const val = dealsByContact ? (dc ? dc.amount : 0) : (st === 'true' ? (parseFloat((c.properties.tbschool__valor_liquido_da_compra || '0').replace(',', '.')) || 0) : 0);
    const comprou = orders > 0;
    if (comprou) vendasPorFonte[key]++; // COMPRADORES do lançamento por canal (1 por contato) → base da taxa de conversão
    // Influência Otaviano (overlay — não é mais canal). orgânico = utm_term redes do Otaviano (cai em Social Orgânico);
    // pago = inscritos de Social Pago cujo criativo é o Otaviano (utm_content) — segue contando em Social Pago.
    const otaTermLow = (c.properties[UTM_TERM_PROP] || '').trim().toLowerCase();
    const otaTerm = otaTermLow.split(/[-_|.]/).includes(OTAVIANO_TERM_TOKEN) || otaTermLow.includes(OTAVIANO_TERM_NAME);
    const otaContent = (c.properties[UTM_CONTENT_PROP] || '').toLowerCase().includes('otaviano');
    if (otaTerm) { otaviano.orgInscritos++; if (comprou) { otaviano.orgVendas += orders; otaviano.orgReceita += val; } }
    else if (isPaid && otaContent) { otaviano.pagoInscritos++; if (comprou) { otaviano.pagoVendas += orders; otaviano.pagoReceita += val; } }
    // Karnal: criativo dele no utm_content. Pago = Social Pago; "orgânico" = mesmo criativo fora de mídia paga.
    const karnalContent = (c.properties[UTM_CONTENT_PROP] || '').toLowerCase().includes('karnal');
    if (karnalContent) {
      if (isPaid) { karnal.pagoInscritos++; if (comprou) { karnal.pagoVendas += orders; karnal.pagoReceita += val; } }
      else { karnal.orgInscritos++; if (comprou) { karnal.orgVendas += orders; karnal.orgReceita += val; } }
    }
    if (isPaid) {
      // Idade do lead: contato criado no HubSpot a partir de 01/06 = novo; antes = base reativada.
      const leadNovo = (c.properties.createdate || '').slice(0, 10) >= LEAD_NOVO_DESDE;
      paid.inscritos++;
      if (leadNovo) paid.inscritosNovos++; else paid.inscritosAntigos++;
      if (st) { paid.checkout++; if (leadNovo) paid.checkoutNovos++; else paid.checkoutAntigos++; }
      if (comprou) {
        paid.compra += orders;
        paid.receita += val;
        if (key === 'paid_social') { paid.receitaMeta += val; paid.compraMeta += orders; }
        else if (key === 'paid_search') { paid.receitaGoogle += val; paid.compraGoogle += orders; }
        const l19 = dc?.live19 || 0, l29 = dc?.live29 || 0; // compras de live por preço (R$19,90 × R$29,00)
        if (leadNovo) { paid.receitaNovos += val; paid.compraNovos += orders; paid.compraNovos19 += l19; paid.compraNovos29 += l29; }
        else { paid.receitaAntigos += val; paid.compraAntigos += orders; paid.compraAntigos19 += l19; paid.compraAntigos29 += l29; }
      }
    }
    // Série por HORA pelo horário da inscrição (recent_conversion_date; fallback createdate).
    // receita = valor líquido das compras de origem PAGA naquela hora (pra casar com o custo via CPL no gráfico de ROAS).
    const ts = c.properties.recent_conversion_date || c.properties.createdate;
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        d.setUTCMinutes(0, 0, 0); // piso na hora cheia
        const slot = d.toISOString();
        const cur = slots.get(slot) || { total: 0, paid: 0, crm: 0, cadastros: 0, videos: 0, compra: 0, receita: 0, compraPaga: 0 };
        cur.total++;
        if (key === 'email' || key === 'whatsapp') cur.crm++;
        if (stageKey === 'completou_cadastro' || stageKey === 'upload_video_concluido' || stageKey === 'analise_ia_pronto') cur.cadastros++;
        if (stageKey === 'upload_video_concluido' || stageKey === 'analise_ia_pronto') cur.videos++;
        if (isPaid) { cur.paid++; if (comprou) { cur.receita += val; cur.compraPaga += orders; } }
        if (comprou) cur.compra += orders;
        slots.set(slot, cur);
      }
    }
  }
  const inscricoesHora = [...slots.entries()]
    .map(([bucket, v]) => ({ bucket, total: v.total, paid: v.paid, crm: v.crm, cadastros: v.cadastros, videos: v.videos, compra: v.compra, receita: v.receita, compraPaga: v.compraPaga }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
  const regionCounts = REGION_KEYS.map((k) => ({ key: k, label: REGION_LABEL[k], count: regionCnt[k] }));
  const referrers = [...refCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 12);
  const entrySite = { total: inscritoCount, withReferrer, referrers };
  const origemDiaria = [...origemDiariaMap.entries()]
    .map(([date, byFonte]) => ({ date, byFonte }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dailyStages = Object.entries(dailyBuckets)
    .map(([date, byStage]) => ({ date, byStage }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { counts, paid, inscricoesHora, vendasPorFonte, regionCounts, entrySite, origemDiaria, dailyStages, spInscritos: { p1990: spAntes, p2900: spDepois }, otaviano, karnal, stageCounts: { inscricao_confirmada: inscritoCount, upload_video_concluido: cntUploadVideo, analise_ia_pronto: cntAnaliseIa }, checkoutTotal: cntCheckoutTotal };
}

// The Best School — funil de checkout via PIPELINE DE NEGÓCIOS (fonte oficial).
// Cada pedido do Kiwify vira um negócio (dedup por kiwify_order_id), então capta vendas que
// as propriedades do contato perdem (contato guarda só o último pedido). Pipeline 904543067.
const TBSCHOOL_PIPELINE = '904543067';
const TBSCHOOL_STAGE = {
  concluido: '1372708683', // Negócio fechado
  aguardando: '1372708679', // Aguardando Pagamento
  perdido: '1372708684', // Negócio perdido (mapeado p/ "cancelado")
};
// Uma ÚNICA varredura do pipeline TBSchool (todos os estágios) — compartilhada entre fetchTbschool (contagem
// por estágio) e fetchTbschoolDeals (detalhe dos concluídos). Antes eram 2 buscas sobrepostas na MESMA
// pipeline (a segunda refazia boa parte do trabalho da primeira, só filtrando por concluido) — desperdiçava
// ~12 páginas por rebuild, empurrando o tempo total pra perto/acima do maxDuration de 60s da Vercel.
async function fetchTbschoolPipelineDeals(token: string) {
  const pipelineFilter = { propertyName: 'pipeline', operator: 'EQ', value: TBSCHOOL_PIPELINE };
  const body = { filterGroups: [{ filters: [pipelineFilter] }], properties: ['dealstage', 'amount', 'amount_in_home_currency', 'dealname', 'createdate'] };
  // Descobre o createdate mais antigo REAL do pipeline (1 chamada rápida) — não dá pra reusar LAUNCH_FLOOR_MS
  // aqui como fetchInscritosRaw faz, pois esta busca não tem um filtro de data que já garanta o piso; usar
  // um piso fixo/antigo demais desbalancearia as faixas de novo (quase tudo cairia na última faixa).
  const minRes = await hsSearch(token, 'deals', { ...body, sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }], limit: 1 });
  const minMs = Number(minRes.results?.[0]?.properties.createdate) || Number(LAUNCH_FLOOR_MS);
  return hsSearchAllSeekByDateParallel(token, 'deals', body, 'createdate', minMs, 6);
}

function fetchTbschool(deals: Awaited<ReturnType<typeof fetchTbschoolPipelineDeals>>): { tbschool: NonNullable<Snapshot['tbschool']>; daily: NonNullable<Snapshot['tbschoolDaily']> } {
  const out = { concluido: 0, abandonou: 0, aguardando: 0, cancelado: 0 };
  let receitaTotal = 0;
  // Dois produtos: tripwire ("Imersão Palestrante Profissional") vs upsell ("Formato de Aulas").
  const prod = { tripwire: { count: 0, receita: 0 }, upsell: { count: 0, receita: 0 } };
  // Gráfico por dia (data da venda em BRT × etapa) — MESMA fonte (pipeline) que os cards e o Kiwify.
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const d of deals) {
    const st = d.properties.dealstage;
    const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
    let dayKey: string | null = null;
    if (st === TBSCHOOL_STAGE.concluido) {
      out.concluido++;
      receitaTotal += amt;
      const isUpsell = (d.properties.dealname || '').toLowerCase().includes('formato de aulas');
      const bucket = isUpsell ? prod.upsell : prod.tripwire;
      bucket.count++;
      bucket.receita += amt;
      dayKey = 'concluido';
    } else if (st === TBSCHOOL_STAGE.aguardando) {
      out.aguardando++;
      dayKey = 'aguardando';
    } else if (st === TBSCHOOL_STAGE.perdido) {
      out.cancelado++; // perdido — fora do gráfico por dia
    } else {
      out.abandonou++;
      dayKey = 'abandonou';
    }
    const cd = d.properties.createdate;
    const day = cd ? brtDay(cd) : null;
    if (dayKey && day) {
      if (!dailyMap[day]) dailyMap[day] = {};
      dailyMap[day][dayKey] = (dailyMap[day][dayKey] || 0) + 1;
    }
  }
  const porProduto = [
    { label: 'Live palestrante profissional (tripwire)', count: prod.tripwire.count, receita: prod.tripwire.receita },
    { label: 'Gravação da live · 15-16 Ago (upsell)', count: prod.upsell.count, receita: prod.upsell.receita },
  ].filter((p) => p.count > 0);
  const daily = Object.entries(dailyMap).map(([date, byStatus]) => ({ date, byStatus })).sort((a, b) => a.date.localeCompare(b.date));
  return { tbschool: { ...out, receitaTotal, porProduto }, daily };
}

// Negócios fechados do pipeline The Best School, atribuídos ao CANAL pelo contato associado.
// Cobre TODOS os negócios (não só os inscritos do lançamento), então as vendas por canal SOMAM o total vendido.
const emptyFonteRec = (): Record<FonteKey, number> =>
  Object.fromEntries(FONTE_BUCKETS.map((b) => [b.key, 0])) as Record<FonteKey, number>;

type ProdStat = { vendas: number; receita: number; vendasSocialPago: number; paidReceita: number };
async function fetchTbschoolDeals(token: string, allDeals: Awaited<ReturnType<typeof fetchTbschoolPipelineDeals>>, inscritosRawPromise: Promise<Awaited<ReturnType<typeof fetchInscritosRaw>>>): Promise<{
  byContact: Map<string, { count: number; amount: number; live19: number; live29: number }>;
  vendasPorFonte: Record<FonteKey, number>; // total (live + upsell) por canal — 1 por contato comprador
  liveVendasPorFonte: Record<FonteKey, number>; // só a live (tripwire) por canal
  upsellVendasPorFonte: Record<FonteKey, number>; // só o upsell (gravação) por canal
  receitaPorFonte: Record<FonteKey, number>;
  produtos: { tripwire: ProdStat; upsell: ProdStat };
  dailyPago: Record<string, number>; // vendas fechadas por DIA da DATA DE PAGAMENTO (Kiwify) em BRT
  dailyReceitaPago: Record<string, number>; // faturamento (R$) por DIA da DATA DE PAGAMENTO (Kiwify) em BRT
  dailyPagoMidia: Record<string, number>; // vendas/dia vindas de mídia paga (Social Pago + Pesquisa Paga)
  dailyReceitaMidia: Record<string, number>; // receita/dia vinda de mídia paga
  dailyPagoCrm: Record<string, number>; // vendas/dia via CRM (e-mail + WhatsApp)
  dailyReceitaCrm: Record<string, number>; // receita/dia via CRM
  dailyUpsell: Record<string, number>; // vendas de upsell (gravação) por dia da data de pagamento
  dailyUpsellReceita: Record<string, number>; // receita de upsell por dia
  vendasHora: { bucket: string; vendas: number; receita: number; upsell: number }[]; // vendas/receita/upsell por HORA (data de pagamento)
  // Agregações do lado COMPRADOR (1 por contato único) p/ a aba Visão Integrada.
  integrada: {
    vendasPorDiaInscricao: Record<string, number>; // compradores únicos por DIA da DATA DE INSCRIÇÃO
    vendasPorRegiao: Record<string, number>; // compradores únicos por região
    quemCompra: { base: number; novos: number; receitaBase: number; receitaNovos: number };
    tempoAteCompra: Record<string, number>; // bucket (d0/d1/d23/d47/d8) → nº compradores
    area: Record<string, number>; // área de atuação → nº compradores
    idade: Record<string, number>; // faixa etária → nº compradores
    compradoresUnicos: number;
    tripwireBuyers: number; // contatos únicos que compraram a live (tripwire)
    upsellBuyers: number; // contatos únicos que compraram o upsell (gravação)
  };
  // Coortes do comparativo de preço da live (só Social Pago) — sem inscritos (denominador entra na montagem).
  livePriceCohorts: { p1990: { vendas: number; receita: number; upsellVendas: number; receitaTotal: number }; p2900: { vendas: number; receita: number; upsellVendas: number; receitaTotal: number } };
  // Split por inscrito_tbs_2026 do comprador — painel "The Best School" (inscritos) vs painel novo de quem
  // comprou a live sem estar inscrito no TBS (campanha nova, vende só a live pra fora do funil de inscrição).
  concluidoInscrito: number; receitaInscrito: number; dailyPagoInscrito: Record<string, number>; dailyReceitaPagoInscrito: Record<string, number>;
  concluidoNaoInscrito: number; receitaNaoInscrito: number; dailyPagoNaoInscrito: Record<string, number>; dailyReceitaPagoNaoInscrito: Record<string, number>;
  produtosInscrito: { tripwire: { vendas: number; receita: number }; upsell: { vendas: number; receita: number } };
  produtosNaoInscrito: { tripwire: { vendas: number; receita: number }; upsell: { vendas: number; receita: number } };
}> {
  const deals = allDeals.filter((d) => d.properties.dealstage === TBSCHOOL_STAGE.concluido);
  // Roda em paralelo: assoc não depende de inscritosRaw, e vice-versa — só a etapa seguinte (lookup dos
  // compradores) precisa das duas. Evita que uma espere pela outra à toa.
  const [assoc, inscritosMap] = await Promise.all([
    hsBatchAssoc(token, 'deals', 'contacts', deals.map((d) => d.id)),
    inscritosRawPromise.then((rows) => new Map(rows.map((r) => [r.id, r.properties]))),
  ]);
  const byContact = new Map<string, { count: number; amount: number; live19: number; live29: number }>();
  const upsellAmtByContact = new Map<string, number>(); // soma do valor líquido dos upsells por contato (p/ comparativo de preço)
  for (const d of deals) {
    const cids = assoc.get(d.id) || [];
    if (cids.length === 0) continue;
    const cid = cids[0];
    const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
    const isUpsell = (d.properties.dealname || '').toLowerCase().includes('formato de aulas');
    const cur = byContact.get(cid) || { count: 0, amount: 0, live19: 0, live29: 0 };
    cur.count++;
    cur.amount += amt;
    // Preço da live (tripwire) pelo valor líquido: ≤ R$21 = R$19,90 (net ~16,86); acima = R$29,00 (net ~26,26). Upsell fica de fora.
    if (!isUpsell) { if (amt <= 21) cur.live19++; else cur.live29++; }
    else upsellAmtByContact.set(cid, (upsellAmtByContact.get(cid) || 0) + amt);
    byContact.set(cid, cur);
  }
  // Fonte de CADA contato que comprou (inclui quem não é inscrito do lançamento) → vendas/canal somam o total.
  const cids = [...byContact.keys()];
  const fonteByContact = new Map<string, FonteKey>();
  const pagamentoByContact = new Map<string, string>(); // data real do pagamento (Kiwify), por contato
  // Inscrito no lançamento TBS 2026 (inscrito_tbs_2026 = "Sim") ou não — campanha nova vende a live pra
  // fora do funil de inscrição, então precisa separar quem já era do funil de quem chegou só pela live.
  const inscritoByContact = new Map<string, boolean>();
  // Detalhe do COMPRADOR (1 por contato) p/ a aba Visão Integrada: data de inscrição, criação, região, área, nascimento.
  type BuyerDetail = { insc?: string; created?: string; pay?: string; regiao: RegionKey | null; area?: string; dob?: string };
  const detailByContact = new Map<string, BuyerDetail>();
  const applyContactProps = (cid: string, props: Record<string, string>) => {
    fonteByContact.set(cid, fonteOf(props[FONTE_PROP], props[FONTE_DET1_PROP], props[UTM_SOURCE_PROP], props[UTM_MEDIUM_PROP], props[ANALYTICS_SOURCE_PROP], props[UTM_TERM_PROP]));
    if (props.tbschool__data_do_pagamento) pagamentoByContact.set(cid, props.tbschool__data_do_pagamento);
    inscritoByContact.set(cid, props.inscrito_tbs_2026 === 'Sim');
    detailByContact.set(cid, {
      insc: props[REGISTRATION_DATE_PROP] || undefined,
      created: props.createdate || undefined,
      pay: props.tbschool__data_do_pagamento || undefined,
      regiao: regionOf(props.regiao_tbs, props[ESTADO_FORM_PROP], props.estado_tbs),
      area: props.area_de_atuacao_tbs || undefined,
      dob: props.data_de_nascimento_tbs || undefined,
    });
  };
  // Contato não encontrado (negócio órfão, ~1% dos casos) → default inscrito=true: preserva o comportamento
  // histórico (100% das vendas eram do funil de inscrição antes desta campanha nova existir).
  const isInscrito = (cid: string | undefined) => (cid ? inscritoByContact.get(cid) ?? true : true);
  // A maioria dos compradores já veio na varredura de inscritos (fetchInscritosRaw, MESMAS properties
  // relevantes) — reaproveita em memória e só busca no HubSpot quem sobrar (não-inscritos do lançamento).
  const cidsToFetch: string[] = [];
  for (const cid of cids) {
    const cached = inscritosMap.get(cid);
    if (cached) applyContactProps(cid, cached);
    else cidsToFetch.push(cid);
  }
  // Lotes de 100 são independentes — roda concorrente em vez de serializar um-a-um.
  const cidBatches = Array.from({ length: Math.ceil(cidsToFetch.length / 100) }, (_, i) => cidsToFetch.slice(i * 100, i * 100 + 100));
  await pLimit(cidBatches, async (batch) => {
    const page = await hsSearchAll(token, 'contacts', {
      filterGroups: [{ filters: [{ propertyName: 'hs_object_id', operator: 'IN', values: batch }] }],
      properties: [FONTE_PROP, FONTE_DET1_PROP, UTM_SOURCE_PROP, UTM_MEDIUM_PROP, UTM_TERM_PROP, ANALYTICS_SOURCE_PROP, 'tbschool__data_do_pagamento', REGISTRATION_DATE_PROP, 'createdate', 'regiao_tbs', ESTADO_FORM_PROP, 'estado_tbs', 'area_de_atuacao_tbs', 'data_de_nascimento_tbs', 'inscrito_tbs_2026'],
    });
    for (const c of page) applyContactProps(c.id, c.properties);
  });
  // Vendas fechadas por DIA da data de pagamento real do Kiwify (via contato) → bate com o relatório do Kiwify.
  const dailyPago: Record<string, number> = {};
  const dailyReceitaPago: Record<string, number> = {};
  // Mesma coisa, mas separado por inscrito_tbs_2026 do comprador — pro painel "The Best School" (só inscritos)
  // vs o painel novo de quem comprou a live sem estar inscrito no TBS (campanha nova).
  const dailyPagoInscrito: Record<string, number> = {};
  const dailyReceitaPagoInscrito: Record<string, number> = {};
  const dailyPagoNaoInscrito: Record<string, number> = {};
  const dailyReceitaPagoNaoInscrito: Record<string, number> = {};
  let concluidoInscrito = 0, receitaInscrito = 0, concluidoNaoInscrito = 0, receitaNaoInscrito = 0;
  // Vendas/dia que vieram de MÍDIA PAGA (Social Pago + Pesquisa Paga) — pela fonte do contato.
  const dailyPagoMidia: Record<string, number> = {};
  const dailyReceitaMidia: Record<string, number> = {};
  // Vendas/dia via CRM = e-mail + WhatsApp (canais reais; NÃO "tudo menos mídia").
  const dailyPagoCrm: Record<string, number> = {};
  const dailyReceitaCrm: Record<string, number> = {};
  // Upsell (gravação) por dia — vendas e receita (pela data de pagamento).
  const dailyUpsell: Record<string, number> = {};
  const dailyUpsellReceita: Record<string, number> = {};
  // Vendas/receita/upsell por HORA da data de pagamento (pro resumo "hoje até Xh vs ontem até Xh").
  const vendasHoraMap: Record<string, { vendas: number; receita: number; upsell: number }> = {};
  const hojeBRT = brtDay(new Date().toISOString()); // hoje em BRT — trava venda com data no futuro
  for (const d of deals) {
    const cid = (assoc.get(d.id) || [])[0];
    // Data do pagamento (Kiwify) quando houver; senão a data de criação do negócio (não perde venda na contagem).
    const dt = (cid ? pagamentoByContact.get(cid) : undefined) || d.properties.createdate;
    let day = dt ? brtDay(dt) : null;
    // Venda não acontece no futuro: se a data (pgto/criação) cair depois de hoje, é dado corrompido
    // (ex.: data ambígua "10/6/26" lida como out/6). Não plota no diário — senão vira barra fantasma.
    if (day && hojeBRT && day > hojeBRT) day = null;
    if (day) {
      const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
      const isUpsellDeal = /formato de aulas/i.test(d.properties.dealname || '');
      // VENDAS = só a LIVE (tripwire). O upsell (gravação) é indicador SEPARADO — não soma em "vendas".
      // Já a RECEITA/faturamento soma os dois (é receita total: live + upsell).
      if (!isUpsellDeal) dailyPago[day] = (dailyPago[day] || 0) + 1;
      dailyReceitaPago[day] = (dailyReceitaPago[day] || 0) + amt;
      // Mesmo split diário, por inscrito_tbs_2026 (só p/ os gráficos "por dia" — o TOTAL geral, sem exigir
      // dia válido, é contado à parte mais abaixo, no MESMO loop que já faz o "produtos" pra bater com fetchTbschool()).
      if (isInscrito(cid)) {
        if (!isUpsellDeal) dailyPagoInscrito[day] = (dailyPagoInscrito[day] || 0) + 1;
        dailyReceitaPagoInscrito[day] = (dailyReceitaPagoInscrito[day] || 0) + amt;
      } else {
        if (!isUpsellDeal) dailyPagoNaoInscrito[day] = (dailyPagoNaoInscrito[day] || 0) + 1;
        dailyReceitaPagoNaoInscrito[day] = (dailyReceitaPagoNaoInscrito[day] || 0) + amt;
      }
      // bucket por HORA (data de pagamento) — base do comparativo "mesmo horário" no resumo
      const hd = new Date(dt as string); hd.setUTCMinutes(0, 0, 0);
      if (!isNaN(hd.getTime())) {
        const hslot = hd.toISOString();
        const hc = vendasHoraMap[hslot] || { vendas: 0, receita: 0, upsell: 0 };
        hc.receita += amt; if (isUpsellDeal) hc.upsell++; else hc.vendas++;
        vendasHoraMap[hslot] = hc;
      }
      if (isUpsellDeal) {
        dailyUpsell[day] = (dailyUpsell[day] || 0) + 1;
        dailyUpsellReceita[day] = (dailyUpsellReceita[day] || 0) + amt;
      }
      const fonte = cid ? fonteByContact.get(cid) : undefined;
      if (fonte === 'paid_social') { // mídia paga = Meta (Social Pago); Google desvinculado → fora
        if (!isUpsellDeal) dailyPagoMidia[day] = (dailyPagoMidia[day] || 0) + 1; // vendas mídia = só live
        dailyReceitaMidia[day] = (dailyReceitaMidia[day] || 0) + amt;
      }
      // CRM = tudo que NÃO é mídia paga (fonte ∉ {Social Pago, Pesquisa Paga}) — critério da lista 15693
      // "Fonte [TBS] não contém paid ou é vazio". Inclui e-mail, WhatsApp, orgânico, direto, sem-fonte etc.
      if (fonte && fonte !== 'paid_social' && fonte !== 'paid_search') {
        if (!isUpsellDeal) dailyPagoCrm[day] = (dailyPagoCrm[day] || 0) + 1;
        dailyReceitaCrm[day] = (dailyReceitaCrm[day] || 0) + amt;
      }
    }
  }
  const vendasHora = Object.entries(vendasHoraMap)
    .map(([bucket, v]) => ({ bucket, vendas: v.vendas, receita: v.receita, upsell: v.upsell }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
  const vendasPorFonte = emptyFonteRec();
  const liveVendasPorFonte = emptyFonteRec();
  const upsellVendasPorFonte = emptyFonteRec();
  const receitaPorFonte = emptyFonteRec();
  for (const [cid, v] of byContact) {
    const key = fonteByContact.get(cid) || 'untracked';
    vendasPorFonte[key] += v.count;
    const liveCount = v.live19 + v.live29;
    liveVendasPorFonte[key] += liveCount;
    upsellVendasPorFonte[key] += v.count - liveCount;
    receitaPorFonte[key] += v.amount;
  }
  // Stats por PRODUTO (tripwire vs upsell): vendas, receita, vendas via Social Pago, receita de mídia paga.
  const mk = (): ProdStat => ({ vendas: 0, receita: 0, vendasSocialPago: 0, paidReceita: 0 });
  const produtos = { tripwire: mk(), upsell: mk() };
  // Mesmo split, por inscrito — SEM exigir dia válido (mesma regra de fetchTbschool(): conta TODO negócio
  // concluído, tripwire+upsell). Fica neste loop (não no de dailyPago acima) pra bater exatamente com o
  // "Negócios fechados"/"Valor vendido" originais, que também não filtram por data válida.
  const mkSimple = () => ({ vendas: 0, receita: 0 });
  const produtosInscrito = { tripwire: mkSimple(), upsell: mkSimple() };
  const produtosNaoInscrito = { tripwire: mkSimple(), upsell: mkSimple() };
  for (const d of deals) {
    const isUpsell = (d.properties.dealname || '').toLowerCase().includes('formato de aulas');
    const p = isUpsell ? produtos.upsell : produtos.tripwire;
    const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
    p.vendas++;
    p.receita += amt;
    const cid = (assoc.get(d.id) || [])[0];
    const fonte = cid ? fonteByContact.get(cid) : undefined;
    if (fonte === 'paid_social') p.vendasSocialPago++;
    if (fonte === 'paid_social') p.paidReceita += amt; // mídia paga = Meta; Google desvinculado
    if (isInscrito(cid)) {
      concluidoInscrito++; receitaInscrito += amt;
      const ps = isUpsell ? produtosInscrito.upsell : produtosInscrito.tripwire;
      ps.vendas++; ps.receita += amt;
    } else {
      concluidoNaoInscrito++; receitaNaoInscrito += amt;
      const ps = isUpsell ? produtosNaoInscrito.upsell : produtosNaoInscrito.tripwire;
      ps.vendas++; ps.receita += amt;
    }
  }
  // ── Visão Integrada: agregações por COMPRADOR ÚNICO (cada contato conta 1x, independente de tripwire+upsell) ──
  const LEAD_NOVO_DESDE = '2026-06-01'; // createdate >= 01/06 = lead novo da campanha; antes = base reativada
  const vendasPorDiaInscricao: Record<string, number> = {};
  const vendasPorRegiao: Record<string, number> = {};
  const quemCompra = { base: 0, novos: 0, receitaBase: 0, receitaNovos: 0 };
  const tempoAteCompra: Record<string, number> = { d0: 0, d1: 0, d23: 0, d47: 0, d8: 0 };
  const area: Record<string, number> = {};
  const idade: Record<string, number> = {};
  for (const [cid, v] of byContact) {
    const d = detailByContact.get(cid);
    if (!d) continue;
    // Diário pela DATA DE INSCRIÇÃO do comprador (a "safra" daquele dia).
    if (d.insc) {
      const day = d.insc.slice(0, 10);
      vendasPorDiaInscricao[day] = (vendasPorDiaInscricao[day] || 0) + 1;
    }
    // Base reativada × novos (por createdate); receita = soma dos negócios do contato.
    const novo = (d.created || '').slice(0, 10) >= LEAD_NOVO_DESDE;
    if (novo) { quemCompra.novos++; quemCompra.receitaNovos += v.amount; }
    else { quemCompra.base++; quemCompra.receitaBase += v.amount; }
    // Região.
    if (d.regiao) vendasPorRegiao[d.regiao] = (vendasPorRegiao[d.regiao] || 0) + 1;
    // Tempo até a compra (dias entre inscrição e pagamento).
    if (d.insc && d.pay) {
      const pday = brtDay(d.pay);
      if (pday) {
        const [iy, im, idd] = d.insc.slice(0, 10).split('-').map(Number);
        const [py, pm, pdd] = pday.split('-').map(Number);
        const diff = Math.round((Date.UTC(py, pm - 1, pdd) - Date.UTC(iy, im - 1, idd)) / 86400000);
        const b = diff <= 0 ? 'd0' : diff === 1 ? 'd1' : diff <= 3 ? 'd23' : diff <= 7 ? 'd47' : 'd8';
        tempoAteCompra[b]++;
      }
    }
    // Perfil: área de atuação.
    if (d.area) area[d.area] = (area[d.area] || 0) + 1;
    // Perfil: faixa etária (aproximação por ano de nascimento).
    if (d.dob) {
      const by = Number(d.dob.slice(0, 4));
      if (by > 1900 && by < 2020) {
        const age = 2026 - by;
        const b = age < 25 ? 'até 24' : age < 35 ? '25–34' : age < 45 ? '35–44' : age < 55 ? '45–54' : '55+';
        idade[b] = (idade[b] || 0) + 1;
      }
    }
  }
  // Compradores ÚNICOS por produto (contatos, não negócios) — pro funil bater com "compradores únicos".
  // tripwire = comprou a live (live19+live29 > 0); upsell = tem negócio que não é tripwire.
  let tripwireBuyers = 0, upsellBuyers = 0;
  for (const v of byContact.values()) {
    if (v.live19 + v.live29 > 0) tripwireBuyers++;
    if (v.count - (v.live19 + v.live29) > 0) upsellBuyers++;
  }
  const integrada = { vendasPorDiaInscricao, vendasPorRegiao, quemCompra, tempoAteCompra, area, idade, compradoresUnicos: byContact.size, tripwireBuyers, upsellBuyers };
  // Comparativo de preço da live (R$19,90 × R$29,00) — SÓ Social Pago. Reusa os negócios+fonte já buscados
  // (sem nova varredura). Os denominadores (inscritos/período) entram na montagem via fonteBuckets.spInscritos.
  const lpCohort = () => ({ vendas: 0, receita: 0, upsellVendas: 0, receitaTotal: 0 });
  const livePriceCohorts = { p1990: lpCohort(), p2900: lpCohort() };
  for (const d of deals) {
    const cid = (assoc.get(d.id) || [])[0];
    if (!cid || fonteByContact.get(cid) !== 'paid_social') continue;
    if ((d.properties.dealname || '').toLowerCase().includes('formato de aulas')) continue; // só a venda da live
    const amt = parseFloat((d.properties.amount_in_home_currency || d.properties.amount || '0').replace(',', '.')) || 0;
    const c = amt <= LIVE_PRICE_THRESHOLD ? livePriceCohorts.p1990 : livePriceCohorts.p2900;
    c.vendas++;
    c.receita += amt;
    const upAmt = upsellAmtByContact.get(cid) || 0;
    if (upAmt > 0) c.upsellVendas++;
    c.receitaTotal += amt + upAmt; // live + upsell do comprador → base do ROAS
  }
  return {
    byContact, vendasPorFonte, liveVendasPorFonte, upsellVendasPorFonte, receitaPorFonte, produtos, dailyPago, dailyReceitaPago, dailyPagoMidia, dailyReceitaMidia, dailyPagoCrm, dailyReceitaCrm, dailyUpsell, dailyUpsellReceita, vendasHora, integrada, livePriceCohorts,
    concluidoInscrito, receitaInscrito, dailyPagoInscrito, dailyReceitaPagoInscrito, produtosInscrito,
    concluidoNaoInscrito, receitaNaoInscrito, dailyPagoNaoInscrito, dailyReceitaPagoNaoInscrito, produtosNaoInscrito,
  };
}

// Comparativo de preço da Live (tripwire): R$ 19,90 (anterior) vs R$ 29,00 (novo). SÓ Social Pago.
// As coortes (vendas/receita/upsell) vêm do fetchTbschoolDeals (mesma busca de negócios — sem varredura
// extra); os denominadores (inscritos de Social Pago por período) vêm do fonteBuckets.spInscritos.
const LIVE_PRICE_THRESHOLD = 21; // separa net ~16,86 (R$19,90) de ~24,6 (R$29,00)
const LIVE_PRICE_CUTOFF = String(Date.UTC(2026, 5, 5, 19, 50)); // 05/06/2026 16h50 BRT (19h50 UTC) — virada de preço
type LpCohort = { vendas: number; receita: number; upsellVendas: number; receitaTotal: number };
function buildLivePrice(cohorts: { p1990: LpCohort; p2900: LpCohort }, spInscritos: { p1990: number; p2900: number }): NonNullable<Snapshot['livePrice']> {
  const fmtDM = (ms: number) => { const d = new Date(ms); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
  const cutoffDia = fmtDM(Number(LIVE_PRICE_CUTOFF));
  const meta = {
    p1990: { label: 'R$ 19,90 (preço anterior)', periodo: `${fmtDM(Date.UTC(2026, 5, 1))} até ${cutoffDia} (16h50)` },
    p2900: { label: 'R$ 29,00 (preço novo)', periodo: `a partir de ${cutoffDia} (16h50)` },
  } as const;
  return (['p1990', 'p2900'] as const).map((k) => {
    const c = cohorts[k];
    const insc = spInscritos[k] ?? 0;
    return {
      key: k, label: meta[k].label, periodo: meta[k].periodo,
      vendas: c.vendas, receita: c.receita, inscritos: insc,
      // Conversão = (venda da live + upsell) ÷ inscritos de Social Pago NO PERÍODO daquele preço.
      taxaConversao: insc > 0 ? (c.vendas + c.upsellVendas) / insc : 0,
      paidReceita: c.receitaTotal, // live + upsell do comprador → base do ROAS
      upsellVendas: c.upsellVendas,
    };
  });
}

// Data no fuso de Brasília (YYYY-MM-DD). tbschool__data_* é datetime em UTC, então um checkout às 21h30 BRT
// vira 00h30 UTC do dia seguinte; sem converter, ele "vaza" pro dia errado no gráfico por dia.
function brtDay(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

async function buildLiveSnapshot(): Promise<Snapshot> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN missing');

  // UMA ONDA paralela com TODAS as buscas (cada fn pagina internamente; hsSearch tem retry de 429).
  // A varredura dos inscritos (fetchInscritosRaw) roda junto com os negócios; o processamento que cruza
  // contato×negócio (processFonteBuckets) é em memória depois → corta a serialização das ondas.
  const rebuildT0 = Date.now();
  // fetchTbschoolDeals encadeia direto no .then() de pipelineDeals (em vez de esperar o Promise.all inteiro)
  // pra começar o assoc assim que os negócios chegarem. Também recebe a PROMISE (não o valor) de inscritosRaw
  // pra reaproveitar quem já foi buscado lá — mas só espera por ela na etapa de lookup, depois do assoc, então
  // não fica refém se inscritosRaw for a mais lenta (ver comentário dentro de fetchTbschoolDeals).
  const pipelineDealsPromise = fetchTbschoolPipelineDeals(token);
  const inscritosRawPromise = fetchInscritosRaw(token);
  const tbschoolDealsPromise = pipelineDealsPromise.then((deals) => fetchTbschoolDeals(token, deals, inscritosRawPromise)).catch(() => null);
  const [interesse2026, platformEntryCount, pipelineDeals, inscritosRaw, disparoIds, tbschoolDeals] = await Promise.all([
    fetchInteresseCount(token),
    fetchPlatformEntryCount(token),
    pipelineDealsPromise,
    inscritosRawPromise,
    fetchDisparoContactIds(token).catch(() => []),
    tbschoolDealsPromise,
  ]);
  const tbRes = fetchTbschool(pipelineDeals);
  // Log leve (sem spam por página) — ajuda a monitorar se o rebuild volta a se aproximar do maxDuration de 60s.
  console.log(`[snapshot] rebuild: ${Date.now() - rebuildT0}ms · ${hubspotDiag.calls} chamadas HubSpot · ${inscritosRaw.length} inscritos`);
  // Junta os IDs de contato de cada disparo com as vendas já buscadas (byContact) — sem varredura extra.
  const disparosHubspot = disparoIds.map(({ key, ids }) => {
    const def = DISPARO_HUBSPOT_DEFS.find((d) => d.key === key)!;
    let liveVendas = 0, upsellVendas = 0, retorno = 0;
    if (tbschoolDeals) {
      for (const cid of ids) {
        const v = tbschoolDeals.byContact.get(cid);
        if (!v) continue;
        const live = v.live19 + v.live29;
        liveVendas += live;
        upsellVendas += v.count - live;
        retorno += v.amount;
      }
    }
    return { key, label: def.label, impactados: ids.length, liveVendas, upsellVendas, retorno };
  });
  const fonteBuckets = processFonteBuckets(inscritosRaw, tbschoolDeals ? tbschoolDeals.byContact : null);
  const dailyStages = fonteBuckets.dailyStages;
  // Comparativo de preço: coortes do fetchTbschoolDeals (mesma busca de negócios) + denominadores do fonteBuckets.
  const livePrice = tbschoolDeals ? buildLivePrice(tbschoolDeals.livePriceCohorts, fonteBuckets.spInscritos) : undefined;
  // Região e referrer vêm da MESMA varredura do fonteBuckets; checkout/dia vem do pipeline (fetchTbschool).
  const regionCounts = fonteBuckets.regionCounts;
  const entrySite = fonteBuckets.entrySite;
  // "The Best School" (painel padrão) passa a ser SÓ inscritos do TBS 2026 — campanha nova vende a live
  // pra fora do funil de inscrição, então esse painel não pode mais misturar as duas origens. concluido/
  // receitaTotal/porProduto vêm do split de fetchTbschoolDeals (join negócio→contato); sem esse join
  // (tbschoolDeals null), cai no total do pipeline inteiro (fetchTbschool) — melhor que zerar o painel.
  const tbschool = tbschoolDeals
    ? {
        ...tbRes.tbschool,
        concluido: tbschoolDeals.concluidoInscrito,
        receitaTotal: tbschoolDeals.receitaInscrito,
        porProduto: [
          { label: 'Live palestrante profissional (tripwire)', count: tbschoolDeals.produtosInscrito.tripwire.vendas, receita: tbschoolDeals.produtosInscrito.tripwire.receita },
          { label: 'Gravação da live · 15-16 Ago (upsell)', count: tbschoolDeals.produtosInscrito.upsell.vendas, receita: tbschoolDeals.produtosInscrito.upsell.receita },
        ].filter((p) => p.count > 0),
      }
    : tbRes.tbschool;
  // Painel novo (abaixo do padrão): só quem comprou a live SEM ser inscrito no TBS 2026 (campanha nova).
  const tbschoolNaoInscrito = tbschoolDeals
    ? {
        concluido: tbschoolDeals.concluidoNaoInscrito,
        receitaTotal: tbschoolDeals.receitaNaoInscrito,
        porProduto: [
          { label: 'Live palestrante profissional (tripwire)', count: tbschoolDeals.produtosNaoInscrito.tripwire.vendas, receita: tbschoolDeals.produtosNaoInscrito.tripwire.receita },
          { label: 'Gravação da live · 15-16 Ago (upsell)', count: tbschoolDeals.produtosNaoInscrito.upsell.vendas, receita: tbschoolDeals.produtosNaoInscrito.upsell.receita },
        ].filter((p) => p.count > 0),
        daily: Object.keys({ ...tbschoolDeals.dailyPagoNaoInscrito, ...tbschoolDeals.dailyReceitaPagoNaoInscrito })
          .map((date) => ({ date, vendas: tbschoolDeals.dailyPagoNaoInscrito[date] || 0, receita: tbschoolDeals.dailyReceitaPagoNaoInscrito[date] || 0 }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    : undefined;
  // Gráfico por dia: "concluido" pela DATA DE PAGAMENTO real do Kiwify (via contato, em tbschoolDeals),
  // SÓ INSCRITOS (dailyPagoInscrito — mesma razão do tbschool acima); "aguardando"/"abandonou" pela
  // createdate, sem split (não entram no escopo desta separação). Se o join falhou, cai no createdate-based (tbRes.daily).
  let tbschoolDaily = tbRes.daily;
  if (tbschoolDeals && tbschoolDeals.dailyPagoInscrito) {
    const map: Record<string, Record<string, number>> = {};
    for (const r of tbRes.daily) {
      map[r.date] = { ...r.byStatus };
      delete map[r.date].concluido; // remove o concluido por createdate (será substituído pela data de pagamento)
    }
    for (const [day, count] of Object.entries(tbschoolDeals.dailyPagoInscrito)) {
      if (!map[day]) map[day] = {};
      map[day].concluido = count;
    }
    tbschoolDaily = Object.entries(map).map(([date, byStatus]) => ({ date, byStatus })).sort((a, b) => a.date.localeCompare(b.date));
  }
  // Faturamento (R$) por dia, pela data de pagamento real do Kiwify (mesma base do gráfico de vendas) — só inscritos.
  const tbschoolReceitaDaily = tbschoolDeals?.dailyReceitaPagoInscrito
    ? Object.entries(tbschoolDeals.dailyReceitaPagoInscrito).map(([date, receita]) => ({ date, receita })).sort((a, b) => a.date.localeCompare(b.date))
    : undefined;
  // Vendas/dia vindas de mídia paga (Social Pago + Pesquisa Paga) — junta contagem e receita por dia.
  const tbschoolMidiaDaily = tbschoolDeals?.dailyPagoMidia
    ? Object.keys({ ...tbschoolDeals.dailyPagoMidia, ...tbschoolDeals.dailyReceitaMidia })
        .map((date) => ({ date, vendas: tbschoolDeals.dailyPagoMidia[date] || 0, receita: tbschoolDeals.dailyReceitaMidia[date] || 0 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : undefined;
  // Vendas/dia via CRM (e-mail + WhatsApp) — contagem e receita por dia.
  const tbschoolCrmDaily = tbschoolDeals?.dailyPagoCrm
    ? Object.keys({ ...tbschoolDeals.dailyPagoCrm, ...tbschoolDeals.dailyReceitaCrm })
        .map((date) => ({ date, vendas: tbschoolDeals.dailyPagoCrm[date] || 0, receita: tbschoolDeals.dailyReceitaCrm[date] || 0 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : undefined;
  // Upsell (gravação) por dia — contagem e receita (data de pagamento).
  const tbschoolUpsellDaily = tbschoolDeals?.dailyUpsell
    ? Object.keys({ ...tbschoolDeals.dailyUpsell, ...tbschoolDeals.dailyUpsellReceita })
        .map((date) => ({ date, vendas: tbschoolDeals.dailyUpsell[date] || 0, receita: tbschoolDeals.dailyUpsellReceita[date] || 0 }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : undefined;

  // ── Visão Integrada (3ª aba): cruza inscrições (Speaker) × vendas (School) ──
  let visaoIntegrada: Snapshot['visaoIntegrada'];
  if (tbschoolDeals) {
    const vi = tbschoolDeals.integrada;
    const receita = tbschool.receitaTotal;
    const compradores = vi.compradoresUnicos;
    const tripwireVendas = vi.tripwireBuyers; // compradores únicos da live (contatos), não negócios
    const upsellVendas = vi.upsellBuyers; // compradores únicos do upsell (contatos)
    const plataforma = platformEntryCount;
    const inscritos = fonteBuckets.stageCounts.inscricao_confirmada;
    // Funil unificado Speaker → School (% sempre sobre o topo = inscritos).
    const funil = [
      { key: 'inscritos', label: 'Inscritos', value: inscritos },
      { key: 'checkout', label: 'Iniciaram checkout', value: fonteBuckets.checkoutTotal },
      { key: 'compra', label: 'Compraram a live', value: tripwireVendas },
      { key: 'upsell', label: 'Upsell (gravação)', value: upsellVendas },
      { key: 'plataforma', label: 'Entrou na plataforma (Speaker)', value: plataforma },
    ].map((s) => ({ ...s, pctTopo: inscritos > 0 ? s.value / inscritos : 0 }));
    // Diário (atividade do dia): inscritos pela DATA DE INSCRIÇÃO × vendas pela DATA DA VENDA (pagamento Kiwify).
    // São datas diferentes de propósito — cada barra mostra o que de fato aconteceu naquele dia (a venda pode ser
    // de quem se inscreveu antes). Une os dias de inscrição com os dias de venda pra não perder nenhum.
    const inscByDia = new Map(dailyStages.map((d) => [d.date, Object.values(d.byStage).reduce((a, b) => a + b, 0)]));
    const diasDiario = [...new Set<string>([...inscByDia.keys(), ...Object.keys(tbschoolDeals.dailyPago)])].sort();
    const diario = diasDiario.map((date) => {
      const insc = inscByDia.get(date) || 0;
      const vendas = tbschoolDeals.dailyPago[date] || 0;
      return { date, inscritos: insc, vendas, taxa: insc > 0 ? vendas / insc : 0 };
    });
    // Conversão por região: inscritos (regiões2026) × compradores por região.
    const porRegiao = regionCounts
      .map((r) => {
        const vendas = vi.vendasPorRegiao[r.key] || 0;
        return { key: r.key, label: r.label, inscritos: r.count, vendas, taxa: r.count > 0 ? vendas / r.count : 0 };
      })
      .sort((a, b) => b.vendas - a.vendas);
    // Tempo até a compra (rótulos legíveis, na ordem).
    const tLabels: [string, string][] = [['d0', 'No mesmo dia'], ['d1', 'Em 1 dia'], ['d23', 'Em 2–3 dias'], ['d47', 'Em 4–7 dias'], ['d8', '8+ dias']];
    const tempoAteCompra = tLabels.map(([k, label]) => ({ key: k, label, vendas: vi.tempoAteCompra[k] || 0 }));
    // Perfil do comprador: área (top 6) e idade (ordem etária).
    const areaTotal = Object.values(vi.area).reduce((a, b) => a + b, 0);
    const areaArr = Object.entries(vi.area)
      .map(([label, vendas]) => ({ label, vendas, pct: areaTotal > 0 ? vendas / areaTotal : 0 }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 6);
    const idadeOrder = ['até 24', '25–34', '35–44', '45–54', '55+'];
    const idadeTotal = Object.values(vi.idade).reduce((a, b) => a + b, 0);
    const idadeArr = idadeOrder
      .filter((k) => vi.idade[k])
      .map((label) => ({ label, vendas: vi.idade[label], pct: idadeTotal > 0 ? vi.idade[label] / idadeTotal : 0 }));
    visaoIntegrada = {
      funil,
      receita,
      ticketMedio: compradores > 0 ? receita / compradores : 0,
      compradores,
      diario,
      quemCompra: vi.quemCompra,
      porRegiao,
      tempoAteCompra,
      perfilComprador: { area: areaArr, idade: idadeArr },
    };
  }

  const base = snapshotJson as Snapshot;

  // Origens TBS 2026 via fonte__tbs_ (definidas por UTM): Email, WhatsApp, Social Pago, Social Orgânico, Pesquisa Paga.
  const fonteCounts = fonteBuckets.counts;
  const totalChannel = Object.values(fonteCounts).reduce((a, b) => a + b, 0);
  const untracked = fonteCounts.untracked;
  const pct = (n: number) => (totalChannel === 0 ? 0 : n / totalChannel);

  const liveChannels = {
    ...base.channels,
    label: 'Origens de entrada — TBS 2026 (fonte [TBS] via UTM)',
    sampleSize: totalChannel,
    totalInPeriod: totalChannel,
    coverage: {
      withSignal: totalChannel - untracked,
      withSignalPct: totalChannel === 0 ? 0 : (totalChannel - untracked) / totalChannel,
      noSignal: untracked,
      noSignalPct: pct(untracked),
    },
    buckets: FONTE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      description: 'fonte [TBS] + detalhamento (UTM)',
      count: fonteCounts[b.key],
      pct: pct(fonteCounts[b.key]),
    })) as unknown as Snapshot['channels']['buckets'],
    topUtmSource: [],
    topUtmMedium: [],
    topUtmCampaign: [],
    note:
      totalChannel === 0
        ? 'Inscrições TBS 2026 abertas — começando do zero. As origens populam conforme as inscrições entram com UTM.'
        : 'Origens classificadas por fonte__tbs_ + detalhamento (populadas via UTM). Organic Social + WhatsApp é contado como WhatsApp.',
  };

  // Funil (4 etapas definidas em lib/funnel.ts — key é a mesma usada no drill 'funnel'). 3 contagens vêm
  // da MESMA varredura de inscritos (fonteBuckets.stageCounts); só completou_cadastro tem busca própria
  // (platformEntryCount) — ver comentário de fetchPlatformEntryCount pra prova de equivalência.
  const stageCountByKey: Record<string, number> = {
    inscricao_confirmada: fonteBuckets.stageCounts.inscricao_confirmada,
    completou_cadastro: platformEntryCount,
    upload_video_concluido: fonteBuckets.stageCounts.upload_video_concluido,
    analise_ia_pronto: fonteBuckets.stageCounts.analise_ia_pronto,
  };
  const liveFunnelStages = funnelStageDefs().map((d, i) => ({
    key: d.key,
    label: d.label,
    value: stageCountByKey[d.key] ?? 0,
    absolute: true,
    order: i,
  }));

  const liveFunnel = {
    ...base.funnel,
    edition: 2026,
    label: 'Funil TBS 2026 ao vivo · tbs___etapa',
    stages: liveFunnelStages as unknown as Snapshot['funnel']['stages'],
  };

  return {
    ...base,
    generatedAt: new Date().toISOString(),
    source: 'HubSpot live fetch (headline + funil + canais + atividade diária TBS 2026)',
    headline: {
      edition2024: { ...base.headline.edition2024, total: 0, note: 'removido do painel — só TBS 2026' },
      edition2025: { ...base.headline.edition2025, total: 0, note: 'removido do painel — só TBS 2026' },
      edition2026: { ...base.headline.edition2026, total: fonteBuckets.stageCounts.inscricao_confirmada, interesse: interesse2026 },
    },
    funnel: liveFunnel,
    channels: liveChannels,
    daily: {
      ...base.daily,
      edition2026: {
        ...base.daily.edition2026,
        label: 'Atividade diária TBS 2026',
        note: 'Novos inscritos por dia (data de inscrição), segmentados pela etapa mais profunda do funil que atingiram. Mesmas etapas do Funil de Leads.',
        dailyStages,
      } as unknown as Snapshot['daily']['edition2026'],
    },
    regioes2026: regionCounts,
    conversaoCanal: FONTE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      color: b.color,
      inscritos: fonteBuckets.counts[b.key],
      // vendas = TODOS os negócios fechados por canal (somam o total vendido) → gráfico de volume.
      vendas: tbschoolDeals ? tbschoolDeals.vendasPorFonte[b.key] : fonteBuckets.vendasPorFonte[b.key],
      // vendasCohort = compradores do lançamento por canal (mesma base dos inscritos) → taxa de conversão ≤ 100%.
      vendasCohort: fonteBuckets.vendasPorFonte[b.key],
      // Quebra live × upsell (mesmo total de "vendas" acima, separado em 2). Só disponível com tbschoolDeals.
      liveVendas: tbschoolDeals ? tbschoolDeals.liveVendasPorFonte[b.key] : undefined,
      upsellVendas: tbschoolDeals ? tbschoolDeals.upsellVendasPorFonte[b.key] : undefined,
    })),
    inscricoesHora: fonteBuckets.inscricoesHora,
    vendasHora: tbschoolDeals ? tbschoolDeals.vendasHora : undefined,
    entrySite,
    origemDiaria: fonteBuckets.origemDiaria,
    tbschool,
    tbschoolNaoInscrito,
    tbschoolDaily,
    tbschoolReceitaDaily,
    tbschoolMidiaDaily,
    tbschoolCrmDaily,
    tbschoolUpsellDaily,
    livePrice,
    tbschoolProdutos: tbschoolDeals ? tbschoolDeals.produtos : undefined,
    disparosHubspot,
    paidRoi: {
      vendidos: tbschool.concluido,
      paidInscritos: fonteBuckets.paid.inscritos,
      paidCheckout: fonteBuckets.paid.checkout,
      paidCompra: fonteBuckets.paid.compra,
      paidReceita: fonteBuckets.paid.receita,
      paidReceitaMeta: fonteBuckets.paid.receitaMeta,
      paidReceitaGoogle: fonteBuckets.paid.receitaGoogle,
      paidCompraMeta: fonteBuckets.paid.compraMeta,
      paidCompraGoogle: fonteBuckets.paid.compraGoogle,
      paidReceitaNovos: fonteBuckets.paid.receitaNovos,
      paidReceitaAntigos: fonteBuckets.paid.receitaAntigos,
      paidCompraNovos: fonteBuckets.paid.compraNovos,
      paidCompraAntigos: fonteBuckets.paid.compraAntigos,
      paidInscritosNovos: fonteBuckets.paid.inscritosNovos,
      paidInscritosAntigos: fonteBuckets.paid.inscritosAntigos,
      paidCheckoutNovos: fonteBuckets.paid.checkoutNovos,
      paidCheckoutAntigos: fonteBuckets.paid.checkoutAntigos,
      paidCompraNovos19: fonteBuckets.paid.compraNovos19,
      paidCompraNovos29: fonteBuckets.paid.compraNovos29,
      paidCompraAntigos19: fonteBuckets.paid.compraAntigos19,
      paidCompraAntigos29: fonteBuckets.paid.compraAntigos29,
    },
    visaoIntegrada,
    otavianoInfluencia: {
      pago: { inscritos: fonteBuckets.otaviano.pagoInscritos, vendas: fonteBuckets.otaviano.pagoVendas, receita: fonteBuckets.otaviano.pagoReceita },
      organico: { inscritos: fonteBuckets.otaviano.orgInscritos, vendas: fonteBuckets.otaviano.orgVendas, receita: fonteBuckets.otaviano.orgReceita },
    },
    karnalInfluencia: {
      pago: { inscritos: fonteBuckets.karnal.pagoInscritos, vendas: fonteBuckets.karnal.pagoVendas, receita: fonteBuckets.karnal.pagoReceita },
      organico: { inscritos: fonteBuckets.karnal.orgInscritos, vendas: fonteBuckets.karnal.orgVendas, receita: fonteBuckets.karnal.orgReceita },
    },
  } as unknown as Snapshot;
}

// ── Cache em memória com SINGLE-FLIGHT ──
// Evita o timeout: só UMA reconstrução roda por vez (requisições concorrentes — aba + painel-mestre +
// auto-refresh — compartilham a mesma build em vez de cada uma disparar a sua e travar o HubSpot).
// Serve o dado em cache instantaneamente; só bloqueia na primeiríssima montagem.
let snap: { data: Snapshot; ts: number } | null = null;
let building: Promise<Snapshot> | null = null;
const TTL_MS = CACHE_TTL * 1000;

function refreshSnapshot(): Promise<Snapshot> {
  if (!building) {
    building = buildLiveSnapshot()
      .then(async (d) => {
        const rec = { data: d, ts: Date.now() };
        snap = rec;
        // Grava no Redis pra TODAS as instâncias da Vercel compartilharem o mesmo snapshot.
        try { await setSnapshotCache(JSON.stringify(rec)); } catch (e) { console.error('[snapshot] gravar Redis:', e instanceof Error ? e.message : e); }
        return d;
      })
      .finally(() => { building = null; });
  }
  return building; // todas as chamadas concorrentes recebem a MESMA promise
}

export const getDashboardData = cache(async (): Promise<Snapshot> => {
  if (!process.env.HUBSPOT_TOKEN) return snapshotJson as Snapshot;
  // L1 (memória da instância) fresco → instantâneo.
  if (snap && Date.now() - snap.ts < TTL_MS) return snap.data;
  // L2 (Redis compartilhado) → todas as instâncias leem o MESMO snapshot (o Atualizar reflete em todas).
  if (storageConfigured()) {
    try {
      const r = await getSnapshotCache();
      if (r && r.data) {
        snap = r as { data: Snapshot; ts: number };
        if (Date.now() - r.ts < TTL_MS) return snap.data; // Redis fresco
        // Venceu o TTL: serve o que tem (instantâneo) + tenta atualizar em background.
        void refreshSnapshot().catch((e) => console.error('[snapshot] refresh bg:', e instanceof Error ? e.message : e));
        return snap.data;
      }
    } catch (e) { console.error('[snapshot] ler Redis:', e instanceof Error ? e.message : e); }
  }
  // Tem L1 antigo (sem Redis): serve stale + bg.
  if (snap) {
    void refreshSnapshot().catch((e) => console.error('[snapshot] refresh bg:', e instanceof Error ? e.message : e));
    return snap.data;
  }
  // Nada em lugar nenhum (Redis vazio + sem L1): NÃO bloqueia a página esperando o build. Ele pode passar
  // de 60s conforme a base cresce (seek de 11k+ inscritos) e estourar o maxDuration → página cairia.
  // Dispara em background (single-flight) e serve o seed agora; em ~1 min o Redis popula e as próximas
  // cargas já vêm com o dado ao vivo. Acontece só em cold start com Redis vazio (raro).
  void refreshSnapshot().catch((e) => console.error('[snapshot] primeira montagem:', e instanceof Error ? e.message : e));
  return { ...(snapshotJson as Snapshot), source: 'montando snapshot ao vivo — recarregue em ~1 min' };
});

export async function invalidateAndFetch(): Promise<Snapshot> {
  // Botão "Atualizar": descarta o cache e AGUARDA uma reconstrução real (single-flight),
  // devolvendo os números NOVOS — não o dado velho via serve-stale. Se já há um build em
  // andamento, compartilha a mesma promise (ele também lê o HubSpot ao vivo, então é fresco).
  snap = null;
  return refreshSnapshot();
}
