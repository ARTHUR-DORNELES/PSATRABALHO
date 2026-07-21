// Export CSV dos compradores do The Best School — usado pelo botão "Exportar CSV" no drill de
// "Valor vendido (fechados)" / "Negócios fechados" (e também no drill por dia do gráfico de faturamento,
// que reusa o MESMO filtro). Diferente do drill (mostra só uma amostra de 100), aqui busca TODOS os
// negócios que casam com o filtro, e junta o contato associado (e-mail, telefone, região, fonte, UTMs etc.)
// — informação que o drill não traz (é só negócio: nome/valor/data).
import { hsSearchAll, hsBatchAssoc, withConcurrency } from './hubspot';
import { tbschoolDealFilterGroups } from './drill';
import { FONTE_PROP, FONTE_DET1_PROP, UTM_SOURCE_PROP, UTM_MEDIUM_PROP, UTM_TERM_PROP, UTM_CONTENT_PROP, ANALYTICS_SOURCE_PROP } from './tbs-fonte';
import { REGISTRATION_DATE_PROP } from './funnel';
import { ESTADO_FORM_PROP } from './regions';

export type CompradorRow = {
  negocio_id: string;
  produto: string;
  valor_liquido: string;
  data_pagamento: string;
  data_criacao_negocio: string;
  kiwify_order_id: string;
  contato_id: string;
  nome: string;
  email: string;
  telefone: string;
  regiao: string;
  estado: string;
  area_atuacao: string;
  data_nascimento: string;
  data_inscricao_tbs2026: string;
  data_criacao_contato: string;
  parceiro: string;
  fonte: string;
  fonte_detalhamento: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

const CONTACT_PROPS = [
  'firstname', 'lastname', 'email', 'phone', 'mobilephone', 'createdate',
  REGISTRATION_DATE_PROP, 'regiao_tbs', ESTADO_FORM_PROP, 'estado_tbs',
  'area_de_atuacao_tbs', 'data_de_nascimento_tbs', 'nome_do_parceiro',
  FONTE_PROP, FONTE_DET1_PROP, UTM_SOURCE_PROP, UTM_MEDIUM_PROP, 'utm_campaign_tbs', UTM_CONTENT_PROP, UTM_TERM_PROP, ANALYTICS_SOURCE_PROP,
  // tbschool__data_do_pagamento NUNCA vem preenchida no negócio (confirmado: 0 em toda a pipeline) — só existe
  // no contato associado. Mesma fonte usada em lib/data.ts (pagamentoByContact) pro gráfico "Vendas por dia".
  'tbschool__data_do_pagamento',
];

// Datas do HubSpot chegam como STRING parseável direto por new Date() — não epoch ms (confirmado empiricamente:
// createdate vem tipo "2026-01-07T01:43:32Z", propriedades "date" tipo tbs_2026__data_de_inscricao vêm
// "YYYY-MM-DD"). Propriedades "date" (só dia, sem hora) formatam em UTC — em BRT o dia "vazaria" pro anterior
// (meia-noite UTC vira 21h do dia anterior em BRT). Propriedades "datetime" (pagamento, criação) formatam em BRT.
function fmtDateUTC(v?: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

function fmtDateTimeBRT(v?: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

const isUpsell = (dealname: string) => dealname.toLowerCase().includes('formato de aulas');

export async function fetchCompradoresExport(token: string, opts: { value?: string; month?: string; produto?: string }): Promise<CompradorRow[]> {
  const dealKey = opts.value || 'concluido';
  const { filterGroups } = tbschoolDealFilterGroups(dealKey, opts);

  const deals = await hsSearchAll(token, 'deals', {
    filterGroups,
    properties: ['dealname', 'amount', 'amount_in_home_currency', 'createdate', 'kiwify_order_id'],
  });

  const assoc = await hsBatchAssoc(token, 'deals', 'contacts', deals.map((d) => d.id));
  const cids = [...new Set(deals.map((d) => assoc.get(d.id)?.[0]).filter((v): v is string => !!v))];

  const contactById = new Map<string, Record<string, string>>();
  const cidBatches = Array.from({ length: Math.ceil(cids.length / 100) }, (_, i) => cids.slice(i * 100, i * 100 + 100));
  await withConcurrency(3, cidBatches.length, async (i) => {
    const batch = cidBatches[i];
    const page = await hsSearchAll(token, 'contacts', {
      filterGroups: [{ filters: [{ propertyName: 'hs_object_id', operator: 'IN', values: batch }] }],
      properties: CONTACT_PROPS,
    });
    for (const c of page) contactById.set(c.id, c.properties);
  });

  return deals.map((d) => {
    const p = d.properties;
    const cid = assoc.get(d.id)?.[0];
    const c = cid ? contactById.get(cid) : undefined;
    const amt = parseFloat((p.amount_in_home_currency || p.amount || '0').replace(',', '.')) || 0;
    return {
      negocio_id: d.id,
      produto: isUpsell(p.dealname || '') ? 'Upsell (gravação)' : 'Live (tripwire)',
      valor_liquido: amt.toFixed(2).replace('.', ','),
      data_pagamento: fmtDateTimeBRT(c?.tbschool__data_do_pagamento || p.createdate),
      data_criacao_negocio: fmtDateTimeBRT(p.createdate),
      kiwify_order_id: p.kiwify_order_id || '',
      contato_id: cid || '',
      nome: c ? [c.firstname, c.lastname].filter(Boolean).join(' ') : '',
      email: c?.email || '',
      telefone: c?.mobilephone || c?.phone || '',
      regiao: c?.regiao_tbs || '',
      estado: c?.[ESTADO_FORM_PROP] || c?.estado_tbs || '',
      area_atuacao: c?.area_de_atuacao_tbs || '',
      data_nascimento: fmtDateUTC(c?.data_de_nascimento_tbs),
      data_inscricao_tbs2026: fmtDateUTC(c?.[REGISTRATION_DATE_PROP]),
      data_criacao_contato: fmtDateTimeBRT(c?.createdate),
      parceiro: c?.nome_do_parceiro || '',
      fonte: c?.[FONTE_PROP] || '',
      fonte_detalhamento: c?.[FONTE_DET1_PROP] || '',
      utm_source: c?.[UTM_SOURCE_PROP] || '',
      utm_medium: c?.[UTM_MEDIUM_PROP] || '',
      utm_campaign: c?.utm_campaign_tbs || '',
      utm_content: c?.[UTM_CONTENT_PROP] || '',
      utm_term: c?.[UTM_TERM_PROP] || '',
    };
  });
}
