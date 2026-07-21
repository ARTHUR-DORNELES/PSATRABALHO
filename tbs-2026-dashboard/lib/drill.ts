import { hsSearch, hsSearchAll, type HsSearchBody } from './hubspot';
import { funnelStageDefs, deepestStageFilterGroups, INSCRITO_FILTER, LAUNCH_FILTER, REGISTRATION_DATE_PROP, TEST_FILTERS, type FunnelStageKey } from './funnel';
import { REGION_HUBSPOT_VALUE, REGION_LABEL, REGION_KEYS, UFS_BY_REGION, ESTADO_FORM_PROP } from './regions';
import { fonteFilterGroups, fonteOf, FONTE_BUCKETS, FONTE_PROP, FONTE_DET1_PROP, UTM_MEDIUM_PROP, UTM_SOURCE_PROP, UTM_TERM_PROP, ANALYTICS_SOURCE_PROP, type FonteKey } from './tbs-fonte';

export type DrillType =
  | 'edition'
  | 'interesse_2026'
  | 'stage'
  | 'funnel'
  | 'funnel_day'
  | 'inscricao_hora'
  | 'otaviano'
  | 'karnal'
  | 'tbschool_status'
  | 'tbschool_deal'
  | 'tbs_fonte'
  | 'referrer'
  | 'paid_funnel'
  | 'partner'
  | 'origem_macro'
  | 'analytics_source'
  | 'momento'
  | 'month'
  | 'estado'
  | 'genero'
  | 'idade'
  | 'area'
  | 'disparo'
  | 'video_day'
  | 'voto_day'
  | 'stage_day'
  | 'regiao'
  | 'utm_source_tbs'
  | 'utm_medium_tbs'
  | 'utm_campaign_tbs'
  | 'utm_content_tbs'
  | 'utm_term_tbs';

export type DrillEdition = '2024' | '2025' | '2026';

export type DrillQuery = {
  type: DrillType;
  value?: string;
  edition?: DrillEdition;
  month?: string;
  produto?: 'tripwire' | 'upsell'; // filtro por produto no drill de negócios do TBSchool
  comprou?: boolean; // no drill de fonte, restringe só a quem comprou (tbschool checkout = true)
};

export type DrillContact = {
  id: string;
  hubspotUrl: string;
  displayName: string;
  email?: string;
  createdate?: string;
  compraDate?: string; // tbschool__data_do_pagamento (horário da compra)
  valor?: string; // valor do negócio (drill de negócios TBSchool)
  tbs_etapa?: string;
  nome_do_parceiro?: string;
  regiao_tbs?: string;
  hs_analytics_source?: string;
  utm_source_tbs?: string;
  utm_medium_tbs?: string;
  utm_campaign_tbs?: string;
  utm_content_tbs?: string;
  utm_term_tbs?: string;
};

export type UtmBreakdownDim = {
  drillType: DrillType;
  label: string;
  items: { label: string; value: number }[];
};

export type DrillResult = {
  title: string;
  subtitle?: string;
  total: number;
  sampleSize: number;
  sample: DrillContact[];
  utmBreakdown?: UtmBreakdownDim[];
  hubspotListUrl?: string;
};

const PORTAL_ID = '49656171';
const RECORD_URL = (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-1/${id}`;

const WINDOW_2024 = { from: '2024-01-01', to: '2025-01-01' };
const WINDOW_2025 = { from: '2025-06-01', to: '2025-12-01' };
const WINDOW_2026 = { from: '2026-06-01', to: '2027-01-01' };

function editionWindow(edition?: DrillEdition) {
  if (edition === '2024') return WINDOW_2024;
  if (edition === '2025') return WINDOW_2025;
  if (edition === '2026') return WINDOW_2026;
  return null;
}

// Aplica scope da edição garantindo que só contatos TBS são contados.
// Para 2024 usa tbs___origem_macro = "TBS 2024" (campo escopo dedicado).
// Para 2025/2026 usa createdate na janela + origem_tbs HAS_PROPERTY (garante contato TBS).
function pushEditionScope(
  filters: HsSearchBody['filterGroups'][number]['filters'],
  edition?: DrillEdition,
) {
  if (edition === '2024') {
    filters.push({ propertyName: 'tbs___origem_macro', operator: 'EQ', value: 'TBS 2024' });
    return;
  }
  if (edition === '2026') {
    // Escopo TBS 2026: inscrito_tbs_2026 = Sim + data de inscrição >= 01/06 (mesmo dos cards).
    filters.push(INSCRITO_FILTER);
    filters.push(LAUNCH_FILTER);
    return;
  }
  const w = editionWindow(edition);
  if (w) {
    filters.push({ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' });
    filters.push({ propertyName: 'createdate', operator: 'GTE', value: w.from });
    filters.push({ propertyName: 'createdate', operator: 'LT', value: w.to });
  }
}

function buildFilters(q: DrillQuery): {
  filters: HsSearchBody['filterGroups'][number]['filters'];
  filterGroups?: HsSearchBody['filterGroups'];
  title: string;
  subtitle?: string;
} {
  const filters: HsSearchBody['filterGroups'][number]['filters'] = [];
  let filterGroups: HsSearchBody['filterGroups'] | undefined;
  let title = '';
  let subtitle: string | undefined;

  switch (q.type) {
    case 'edition': {
      const edition = (q.value as DrillEdition) || q.edition;
      title = `Inscritos TBS ${edition ?? ''}`;
      if (edition === '2024') {
        filters.push({ propertyName: 'tbs___origem_macro', operator: 'EQ', value: 'TBS 2024' });
        subtitle = 'tbs___origem_macro = TBS 2024';
      } else {
        const w = editionWindow(edition as DrillEdition);
        filters.push({ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' });
        if (w) {
          filters.push({ propertyName: 'createdate', operator: 'GTE', value: w.from });
          filters.push({ propertyName: 'createdate', operator: 'LT', value: w.to });
        }
        subtitle = w ? `origem_tbs preenchido · createdate ${w.from} → ${w.to}` : 'origem_tbs preenchido';
      }
      break;
    }
    case 'interesse_2026': {
      filters.push({ propertyName: 'interesse_tbs_2026', operator: 'EQ', value: 'true' });
      title = 'Interesse pré-lançamento TBS 2026';
      subtitle = 'interesse_tbs_2026 = true';
      break;
    }
    case 'stage': {
      if (q.value) filters.push({ propertyName: 'tbs___etapa', operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `Etapa "${q.value}"`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'paid_funnel': {
      // Contatos de mídia paga (Social Pago + Pesquisa Paga) por fonte/utm/analytics.
      // q.value: 'inscritos' | 'checkout' | 'compra'
      const scope: HsSearchBody['filterGroups'][number]['filters'] = [];
      pushEditionScope(scope, q.edition);
      const notCom = { propertyName: UTM_SOURCE_PROP, operator: 'NOT_CONTAINS_TOKEN', value: 'comunidade' };
      const s = [...scope, notCom];
      const extra =
        q.value === 'checkout'
          ? [{ propertyName: 'tbschool__status_do_checkout', operator: 'HAS_PROPERTY' }]
          : q.value === 'compra'
          ? [{ propertyName: 'tbschool__status_do_checkout', operator: 'EQ', value: 'true' }]
          : [];
      filterGroups = [
        { filters: [{ propertyName: FONTE_PROP, operator: 'IN', values: ['Paid Social', 'Paid Search'] }, ...extra, ...s] },
        { filters: [{ propertyName: UTM_MEDIUM_PROP, operator: 'IN', values: ['paid_social', 'paid_search', 'cpc', 'ppc'] }, ...extra, ...s] },
        { filters: [{ propertyName: ANALYTICS_SOURCE_PROP, operator: 'IN', values: ['PAID_SOCIAL', 'PAID_SEARCH'] }, { propertyName: UTM_MEDIUM_PROP, operator: 'NOT_HAS_PROPERTY' }, ...extra, ...s] },
      ];
      const labels: Record<string, string> = {
        inscritos: 'Inscritos via mídia paga',
        checkout: 'Mídia paga · iniciaram checkout TBSchool',
        compra: 'Mídia paga · compraram TBSchool',
      };
      title = (q.value && labels[q.value]) || 'Mídia paga';
      subtitle = 'Social Pago + Pesquisa Paga · fonte/utm/analytics';
      break;
    }
    case 'referrer': {
      // q.value = hostname do referrer; '__direto__' = sem referrer (tráfego direto)
      if (q.value === '__direto__') {
        filters.push({ propertyName: 'hs_analytics_first_referrer', operator: 'NOT_HAS_PROPERTY' });
        title = 'Referrer: Direto / link digitado';
      } else if (q.value) {
        filters.push({ propertyName: 'hs_analytics_first_referrer', operator: 'CONTAINS_TOKEN', value: q.value });
        title = `Referrer: ${q.value}`;
      }
      pushEditionScope(filters, q.edition);
      subtitle = 'hs_analytics_first_referrer';
      break;
    }
    case 'tbs_fonte': {
      // Origem TBS via fonte__tbs_ + detalhamento — espelha exatamente a categorização do card.
      const scope: HsSearchBody['filterGroups'][number]['filters'] = [];
      pushEditionScope(scope, q.edition);
      // Só compradores (espelha o gráfico "Total de vendas por canal", que conta vendas, não inscritos).
      if (q.comprou) scope.push({ propertyName: 'tbschool__status_do_checkout', operator: 'EQ', value: 'true' });
      const bucket = FONTE_BUCKETS.find((b) => b.key === q.value);
      filterGroups = fonteFilterGroups(q.value as FonteKey, scope);
      title = `${q.comprou ? 'Compradores' : 'Origem'}: ${bucket?.label ?? q.value}`;
      subtitle = `${q.comprou ? 'quem comprou · ' : ''}${q.edition ? `fonte [TBS] · edição ${q.edition}` : 'fonte [TBS]'}`;
      break;
    }
    case 'funnel': {
      // Espelha EXATAMENTE a contagem do card (lib/funnel.ts) — mesma definição de filtros + piso de data.
      const def = funnelStageDefs().find((d) => d.key === q.value);
      if (def) {
        filterGroups = def.filterGroups;
        title = `Funil · ${def.label}`;
        subtitle = def.description;
      }
      break;
    }
    case 'funnel_day': {
      // Atividade diária: etapa mais profunda (mutuamente exclusiva) + dia de createdate — bate 1:1 com o gráfico.
      const def = funnelStageDefs().find((d) => d.key === q.value);
      const base = deepestStageFilterGroups(q.value as FunnelStageKey);
      if (q.month) {
        const [yy, mm, dd] = q.month.split('-').map(Number);
        // Janela do dia em UM único filtro BETWEEN (inclusivo) — colapsa o GTE+LT em 1 filtro pra
        // não estourar o limite de 6 filtros/grupo do HubSpot (etapas inscrição/plataforma já têm 5).
        // highValue = última ms do dia (dd+1 meia-noite − 1ms), equivalente ao antigo LT dayEnd.
        const dayStart = String(Date.UTC(yy, mm - 1, dd));
        const dayLast = String(Date.UTC(yy, mm - 1, dd + 1) - 1);
        filterGroups = base.map((g) => ({
          filters: [
            ...g.filters,
            { propertyName: REGISTRATION_DATE_PROP, operator: 'BETWEEN', value: dayStart, highValue: dayLast },
          ],
        }));
      } else {
        filterGroups = base;
      }
      title = `${def?.label ?? q.value}${q.month ? ` · ${new Date(q.month + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}`;
      subtitle = 'inscritos nesse dia, na etapa mais profunda atingida · data de inscrição';
      break;
    }
    case 'inscricao_hora': {
      // Inscritos numa HORA específica — espelha o gráfico "Ritmo de inscrições · por hora".
      // Hora pelo recent_conversion_date (fallback createdate quando vazio), mesmo critério do gráfico.
      // q.value = ISO UTC do início da hora (ex.: 2026-06-10T12:00:00.000Z). BETWEEN colapsa o range em 1 filtro.
      const start = q.value ? Date.parse(q.value) : NaN;
      if (!isNaN(start)) {
        const last = start + 3600000 - 1;
        const scope = [INSCRITO_FILTER, LAUNCH_FILTER, ...TEST_FILTERS];
        filterGroups = [
          { filters: [...scope, { propertyName: 'recent_conversion_date', operator: 'BETWEEN', value: String(start), highValue: String(last) }] },
          { filters: [...scope, { propertyName: 'recent_conversion_date', operator: 'NOT_HAS_PROPERTY' }, { propertyName: 'createdate', operator: 'BETWEEN', value: String(start), highValue: String(last) }] },
        ];
      }
      const horaLabel = q.value
        ? new Date(q.value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit' }) + 'h'
        : '';
      title = `Inscrições · ${horaLabel}`;
      subtitle = 'horário da inscrição · veja a quebra de origens abaixo';
      break;
    }
    case 'otaviano': {
      // Influência Otaviano. value='pago' (criativo em anúncio, utm_content + medium paid_social)
      // ou 'organico' (redes/ManyChat: utm_term com otaviano/ota, ou utm_content + medium social).
      const scope = [INSCRITO_FILTER, LAUNCH_FILTER, ...TEST_FILTERS];
      if (q.value === 'pago') {
        filterGroups = [{ filters: [...scope, { propertyName: 'utm_content_tbs', operator: 'CONTAINS_TOKEN', value: '*otaviano*' }, { propertyName: 'utm_medium_tbs', operator: 'EQ', value: 'paid_social' }] }];
        title = 'Otaviano · pago (criativo no anúncio)';
        subtitle = 'utm_content contém "otaviano" · mídia paga (segue contando em Social Pago)';
      } else {
        filterGroups = [
          { filters: [...scope, { propertyName: 'utm_term_tbs', operator: 'CONTAINS_TOKEN', value: '*otaviano*' }] },
          { filters: [...scope, { propertyName: 'utm_term_tbs', operator: 'CONTAINS_TOKEN', value: 'ota' }] },
          { filters: [...scope, { propertyName: 'utm_content_tbs', operator: 'CONTAINS_TOKEN', value: '*otaviano*' }, { propertyName: 'utm_medium_tbs', operator: 'EQ', value: 'social' }] },
        ];
        title = 'Otaviano · orgânico (redes / ManyChat)';
        subtitle = 'utm_term com otaviano/ota, ou utm_content otaviano em mídia orgânica';
      }
      break;
    }
    case 'karnal': {
      // Influência Karnal — criativo dele no utm_content. value='pago' (anúncio · medium paid_social)
      // ou 'organico' (mesmo criativo fora de mídia paga · medium social).
      const scope = [INSCRITO_FILTER, LAUNCH_FILTER, ...TEST_FILTERS];
      if (q.value === 'pago') {
        filterGroups = [{ filters: [...scope, { propertyName: 'utm_content_tbs', operator: 'CONTAINS_TOKEN', value: '*karnal*' }, { propertyName: 'utm_medium_tbs', operator: 'EQ', value: 'paid_social' }] }];
        title = 'Karnal · pago (criativo no anúncio)';
        subtitle = 'utm_content contém "karnal" · mídia paga (segue contando em Social Pago)';
      } else {
        filterGroups = [{ filters: [...scope, { propertyName: 'utm_content_tbs', operator: 'CONTAINS_TOKEN', value: '*karnal*' }, { propertyName: 'utm_medium_tbs', operator: 'NEQ', value: 'paid_social' }] }];
        title = 'Karnal · orgânico (fora de mídia paga)';
        subtitle = 'utm_content contém "karnal" · mídia não paga';
      }
      break;
    }
    case 'partner': {
      if (q.value) filters.push({ propertyName: 'nome_do_parceiro', operator: 'EQ', value: q.value });
      title = `Parceiro: ${q.value}`;
      subtitle = 'nome_do_parceiro = exato (não usa aliases)';
      break;
    }
    case 'origem_macro': {
      if (q.value) filters.push({ propertyName: 'tbs___origem_macro', operator: 'EQ', value: q.value });
      title = `Origem macro: ${q.value}`;
      subtitle = 'tbs___origem_macro';
      break;
    }
    case 'analytics_source': {
      if (q.value) {
        // value pode ser múltiplas fontes separadas por vírgula (ex.: paid = PAID_SOCIAL,PAID_SEARCH)
        const vals = q.value.split(',').map((s) => s.trim()).filter(Boolean);
        if (vals.length > 1) filters.push({ propertyName: 'hs_analytics_source', operator: 'IN', values: vals });
        else if (vals.length === 1) filters.push({ propertyName: 'hs_analytics_source', operator: 'EQ', value: vals[0] });
      }
      pushEditionScope(filters, q.edition);
      title = `Canal: ${q.value}`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'momento': {
      if (q.value) filters.push({ propertyName: 'seu_momento_atual_tbs', operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `Momento: ${q.value}`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'utm_source_tbs':
    case 'utm_medium_tbs':
    case 'utm_campaign_tbs':
    case 'utm_content_tbs':
    case 'utm_term_tbs': {
      if (q.value) filters.push({ propertyName: q.type, operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `${q.type} = "${q.value}"`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'month': {
      if (q.month) {
        const [y, m] = q.month.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
        const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
        filters.push({ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' });
        filters.push({ propertyName: 'createdate', operator: 'GTE', value: start });
        filters.push({ propertyName: 'createdate', operator: 'LT', value: end });
        title = `Inscritos em ${q.month}`;
        subtitle = `createdate ${start} → ${end}`;
      }
      break;
    }
    case 'estado': {
      if (q.value) filters.push({ propertyName: 'estado_tbs', operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `Estado: ${q.value}`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'genero': {
      if (q.value) {
        const variants = q.value === 'Masculino'
          ? ['Masculino', 'masculino', 'Homem', 'homem']
          : q.value === 'Feminino'
          ? ['Feminino', 'feminino', 'Mulher', 'mulher']
          : [q.value];
        filters.push({ propertyName: 'genero_tbs', operator: 'IN', values: variants });
      }
      pushEditionScope(filters, q.edition);
      title = `Gênero: ${q.value}`;
      subtitle = 'inclui todas as grafias (masculino/Masculino/Homem etc)';
      break;
    }
    case 'idade': {
      if (q.value) {
        const today = new Date(Date.UTC(2026, 4, 18));
        const [minAge, maxAge] = q.value.endsWith('+')
          ? [parseInt(q.value), 120]
          : q.value.split('-').map(Number);
        const minDob = Date.UTC(today.getUTCFullYear() - maxAge - 1, today.getUTCMonth(), today.getUTCDate() + 1);
        const maxDob = Date.UTC(today.getUTCFullYear() - minAge, today.getUTCMonth(), today.getUTCDate());
        filters.push({ propertyName: 'data_de_nascimento_tbs', operator: 'BETWEEN', value: String(minDob), highValue: String(maxDob) });
        subtitle = `data_de_nascimento entre ${new Date(minDob).toISOString().slice(0, 10)} e ${new Date(maxDob).toISOString().slice(0, 10)}`;
      }
      pushEditionScope(filters, q.edition);
      title = `Idade: ${q.value} anos`;
      break;
    }
    case 'area': {
      if (q.value) filters.push({ propertyName: 'area_de_atuacao_tbs', operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `Área de atuação: ${q.value}`;
      subtitle = q.edition ? `edição ${q.edition}` : 'todas as edições';
      break;
    }
    case 'disparo': {
      if (q.value) filters.push({ propertyName: 'disparo_tbs', operator: 'EQ', value: q.value });
      pushEditionScope(filters, q.edition);
      title = `Disparo: ${q.value}`;
      subtitle = 'contatos que estão neste passo da régua de e-mails';
      break;
    }
    case 'video_day': {
      if (q.value) {
        filters.push({ propertyName: 'data_enviou_o_video_tbs', operator: 'EQ', value: q.value });
        subtitle = `data_enviou_o_video_tbs = ${q.value}`;
      }
      title = `Vídeos enviados em ${q.value}`;
      break;
    }
    case 'voto_day': {
      if (q.value) {
        filters.push({ propertyName: 'data_do_voto', operator: 'EQ', value: q.value });
        subtitle = `data_do_voto = ${q.value}`;
      }
      title = `Votos em ${q.value}`;
      break;
    }
    case 'regiao': {
      // Espelha a derivação do mapa: regiao_tbs = X OU (regiao_tbs vazio E estado_tbs IN [UFs da região]).
      if (q.value) {
        const scope: HsSearchBody['filterGroups'][number]['filters'] = [];
        pushEditionScope(scope, q.edition);
        const key = REGION_KEYS.find((k) => REGION_HUBSPOT_VALUE[k] === q.value || REGION_LABEL[k] === q.value);
        const ufs = key ? UFS_BY_REGION[key] : [];
        const groups: HsSearchBody['filterGroups'] = [
          { filters: [{ propertyName: 'regiao_tbs', operator: 'EQ', value: q.value }, ...scope] },
        ];
        if (ufs.length > 0) {
          // estado do form (dropdown obrigatório) quando regiao_tbs vazio
          groups.push({
            filters: [
              { propertyName: 'regiao_tbs', operator: 'NOT_HAS_PROPERTY' },
              { propertyName: ESTADO_FORM_PROP, operator: 'IN', values: ufs },
              ...scope,
            ],
          });
          // estado_tbs (legado) só quando regiao_tbs e estado do form vazios
          groups.push({
            filters: [
              { propertyName: 'regiao_tbs', operator: 'NOT_HAS_PROPERTY' },
              { propertyName: ESTADO_FORM_PROP, operator: 'NOT_HAS_PROPERTY' },
              { propertyName: 'estado_tbs', operator: 'IN', values: ufs },
              ...scope,
            ],
          });
        }
        filterGroups = groups;
      }
      title = `Região: ${q.value === 'Suldeste' ? 'Sudeste' : q.value}`;
      subtitle = q.edition ? `regiao_tbs ou UF do estado · edição ${q.edition}` : 'regiao_tbs ou UF do estado';
      break;
    }
    case 'stage_day': {
      // Filtra contatos em uma etapa específica que foram modificados em um dia específico
      // q.value = nome da etapa (tbs___etapa)
      // q.month = data YYYY-MM-DD (reusando o campo month da DrillQuery)
      if (q.value) filters.push({ propertyName: 'tbs___etapa', operator: 'EQ', value: q.value });
      if (q.month) {
        const dayStart = q.month;
        const next = new Date(q.month + 'T00:00:00Z');
        next.setUTCDate(next.getUTCDate() + 1);
        const dayEnd = next.toISOString().slice(0, 10);
        filters.push({ propertyName: 'lastmodifieddate', operator: 'GTE', value: dayStart });
        filters.push({ propertyName: 'lastmodifieddate', operator: 'LT', value: dayEnd });
      }
      pushEditionScope(filters, q.edition);
      title = `${q.value} em ${q.month ? new Date(q.month).toLocaleDateString('pt-BR') : '?'}`;
      subtitle = 'contatos nesta etapa atualizados neste dia · edição 2026';
      break;
    }
  }
  return { filters, filterGroups, title, subtitle };
}

// Drill por NEGÓCIO no pipeline The Best School (etapa) — espelha os cards do bloco TBSchool,
// que agora vêm do pipeline. Mostra os próprios negócios (nome + valor), não os contatos.
const TBSCHOOL_DEAL_PIPELINE = '904543067';
const TBSCHOOL_DEAL_STAGE: Record<string, { id: string; label: string }> = {
  concluido: { id: '1372708683', label: 'Negócios fechados' },
  aguardando: { id: '1372708679', label: 'Aguardando pagamento' },
  abandonou: { id: '1372708678', label: 'Abandonaram o carrinho' },
  perdido: { id: '1372708684', label: 'Negócios perdidos' },
};
// tbschool_status usa o enum de status de checkout (valores diferentes de tbschool_deal) — traduz pra cá.
const TBSCHOOL_STATUS_TO_DEAL_KEY: Record<string, string> = {
  true: 'concluido',
  false: 'abandonou',
  'Aguardando pagamento': 'aguardando',
  Cancelado: 'perdido',
};
const DEAL_URL = (id: string) => `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-3/${id}`;
const brlFmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

// Extraído pra ser reusado pelo export CSV (lib/export.ts) — precisa buscar EXATAMENTE os mesmos negócios
// que o drill mostra (mesmo filtro de estágio/produto/dia), só que sem o limit:100 de amostra.
export function tbschoolDealFilterGroups(dealKey: string, q: { produto?: string; month?: string }): {
  filterGroups: HsSearchBody['filterGroups']; stage?: { id: string; label: string }; prodLabel: string; dayLabel: string;
} {
  const stage = TBSCHOOL_DEAL_STAGE[dealKey];
  const base: HsSearchBody['filterGroups'][number]['filters'] = [
    { propertyName: 'pipeline', operator: 'EQ', value: TBSCHOOL_DEAL_PIPELINE },
  ];
  if (stage) base.push({ propertyName: 'dealstage', operator: 'EQ', value: stage.id });
  // Filtro por produto (upsell "Formato de Aulas" vs tripwire = demais).
  let prodLabel = '';
  if (q.produto === 'upsell') { base.push({ propertyName: 'dealname', operator: 'CONTAINS_TOKEN', value: 'formato' }); prodLabel = ' · Gravação da live (upsell)'; }
  else if (q.produto === 'tripwire') { base.push({ propertyName: 'dealname', operator: 'NOT_CONTAINS_TOKEN', value: 'formato' }); prodLabel = ' · Live palestrante profissional (tripwire)'; }

  // Filtro por dia — mesma lógica do gráfico "Vendas por dia" (lib/data.ts fetchTbschool/fetchTbschoolDeals):
  // "concluido" agrupa pela DATA DE PAGAMENTO (com fallback pra createdate quando não preenchida); as demais
  // etapas agrupam por createdate do negócio. Sem isso, card/gráfico e drill contavam dias diferentes.
  let filterGroups: HsSearchBody['filterGroups'] = [{ filters: base }];
  let dayLabel = '';
  if (q.month) {
    const [yy, mm, dd] = q.month.split('-').map(Number);
    const dayStart = String(Date.UTC(yy, mm - 1, dd, 3)); // 00h BRT = 03h UTC
    const dayEnd = String(Date.UTC(yy, mm - 1, dd + 1, 3));
    dayLabel = ` · ${new Date(q.month + 'T12:00:00').toLocaleDateString('pt-BR')}`;
    if (dealKey === 'concluido') {
      filterGroups = [
        { filters: [...base, { propertyName: 'tbschool__data_do_pagamento', operator: 'GTE', value: dayStart }, { propertyName: 'tbschool__data_do_pagamento', operator: 'LT', value: dayEnd }] },
        { filters: [...base, { propertyName: 'tbschool__data_do_pagamento', operator: 'NOT_HAS_PROPERTY' }, { propertyName: 'createdate', operator: 'GTE', value: dayStart }, { propertyName: 'createdate', operator: 'LT', value: dayEnd }] },
      ];
    } else {
      filterGroups = [{ filters: [...base, { propertyName: 'createdate', operator: 'GTE', value: dayStart }, { propertyName: 'createdate', operator: 'LT', value: dayEnd }] }];
    }
  }
  return { filterGroups, stage, prodLabel, dayLabel };
}

async function runTbschoolDealDrill(token: string, q: DrillQuery, dealKeyOverride?: string): Promise<DrillResult> {
  const dealKey = dealKeyOverride ?? q.value ?? '';
  const { filterGroups, stage, prodLabel, dayLabel } = tbschoolDealFilterGroups(dealKey, q);

  const data = await hsSearch(token, 'deals', {
    filterGroups,
    properties: ['dealname', 'amount', 'amount_in_home_currency', 'createdate', 'kiwify_order_id', 'tbschool__data_do_pagamento'],
    limit: 100,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  });
  const sample: DrillContact[] = data.results.map((r) => {
    const p = r.properties;
    const amt = parseFloat((p.amount_in_home_currency || p.amount || '0').replace(',', '.')) || 0;
    return {
      id: r.id,
      hubspotUrl: DEAL_URL(r.id),
      displayName: p.dealname || `Negócio ${r.id}`,
      valor: brlFmt(amt),
      createdate: p.tbschool__data_do_pagamento || p.createdate,
    };
  });
  return {
    title: `The Best School · ${stage?.label ?? 'negócios'}${prodLabel}${dayLabel}`,
    subtitle: dealKey === 'concluido' ? 'pipeline de negócios The Best School · agrupado pela data de pagamento (Kiwify), com fallback pra criação' : 'pipeline de negócios The Best School · agrupado pela data de criação do negócio',
    total: data.total,
    sampleSize: sample.length,
    sample,
  };
}

export async function runDrill(token: string, q: DrillQuery): Promise<DrillResult> {
  if (q.type === 'tbschool_deal') return runTbschoolDealDrill(token, q);
  // tbschool_status usa o enum de status de checkout (valores true/false/"Aguardando pagamento"/"Cancelado")
  // — traduz pro vocabulário de estágio de negócio e reusa o MESMO drill (fonte certa: pipeline de negócios,
  // não contato — contato só guarda o último pedido e perde vendas de quem comprou mais de uma vez).
  if (q.type === 'tbschool_status') return runTbschoolDealDrill(token, q, TBSCHOOL_STATUS_TO_DEAL_KEY[q.value ?? '']);
  const { filters, filterGroups, title, subtitle } = buildFilters(q);
  const groups = filterGroups ?? [{ filters }];
  const hasFilters = groups.some((g) => g.filters.length > 0);
  if (!hasFilters) {
    throw new Error('Drill query inválida — sem filtros aplicáveis');
  }
  const drillProps = [
    'firstname', 'lastname', 'email', 'createdate', 'tbschool__data_do_pagamento',
    'tbs___etapa', 'nome_do_parceiro', 'regiao_tbs', 'hs_analytics_source',
    'utm_source_tbs', 'utm_medium_tbs', 'utm_campaign_tbs', 'utm_content_tbs', 'utm_term_tbs',
    FONTE_PROP, FONTE_DET1_PROP,
  ];
  let data: { total: number; results: { id: string; properties: Record<string, string> }[] };
  if (q.type === 'tbs_fonte') {
    // Espelha EXATAMENTE o card: busca os candidatos do filtro largo e reclassifica com fonteOf
    // (exclusivo — 1 balde por contato). Assim o total do drill = a contagem do card de "Origens de entrada".
    const all = await hsSearchAll(token, 'contacts', {
      filterGroups: groups, properties: drillProps, sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    }, 60);
    const kept = all.filter((r) => fonteOf(r.properties[FONTE_PROP], r.properties[FONTE_DET1_PROP], r.properties[UTM_SOURCE_PROP], r.properties[UTM_MEDIUM_PROP], r.properties[ANALYTICS_SOURCE_PROP], r.properties[UTM_TERM_PROP]) === q.value);
    data = { total: kept.length, results: kept.slice(0, 100) };
  } else {
    data = await hsSearch(token, 'contacts', {
      filterGroups: groups, properties: drillProps, limit: 100,
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    });
  }
  const sample: DrillContact[] = data.results.map((r) => {
    const p = r.properties;
    const displayName = [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email || `Contato ${r.id}`;
    return {
      id: r.id,
      hubspotUrl: RECORD_URL(r.id),
      displayName,
      email: p.email,
      createdate: p.createdate,
      compraDate: p.tbschool__data_do_pagamento,
      tbs_etapa: p.tbs___etapa,
      nome_do_parceiro: p.nome_do_parceiro,
      regiao_tbs: p.regiao_tbs,
      hs_analytics_source: p.hs_analytics_source,
      utm_source_tbs: p.utm_source_tbs,
      utm_medium_tbs: p.utm_medium_tbs,
      utm_campaign_tbs: p.utm_campaign_tbs,
      utm_content_tbs: p.utm_content_tbs,
      utm_term_tbs: p.utm_term_tbs,
    };
  });

  // Quebra por UTM (utm_*_tbs) sobre o sample — "de qual campanha/source/medium converteram".
  const UTM_DIMS: { prop: keyof DrillContact; drillType: DrillType; label: string }[] = [
    { prop: 'utm_source_tbs', drillType: 'utm_source_tbs', label: 'utm_source' },
    { prop: 'utm_medium_tbs', drillType: 'utm_medium_tbs', label: 'utm_medium' },
    { prop: 'utm_campaign_tbs', drillType: 'utm_campaign_tbs', label: 'utm_campaign' },
    { prop: 'utm_content_tbs', drillType: 'utm_content_tbs', label: 'utm_content' },
    { prop: 'utm_term_tbs', drillType: 'utm_term_tbs', label: 'utm_term' },
  ];
  const utmBreakdown: UtmBreakdownDim[] = [];
  for (const dim of UTM_DIMS) {
    const counts = new Map<string, number>();
    for (const c of sample) {
      const v = (c[dim.prop] as string | undefined)?.trim();
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (counts.size > 0) {
      const items = [...counts.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      utmBreakdown.push({ drillType: dim.drillType, label: dim.label, items });
    }
  }

  return {
    title,
    subtitle,
    total: data.total,
    sampleSize: sample.length,
    sample,
    utmBreakdown: utmBreakdown.length > 0 ? utmBreakdown : undefined,
  };
}
