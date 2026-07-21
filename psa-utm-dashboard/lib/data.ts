import { hsCount, hsFetchAll, type HsContact } from './hubspot';
import {
  classifyUtm, normalize, suggestUtm, campaignSlug,
  VALID_MEDIUMS, CANONICAL_SOURCES,
  fixSource, fixMedium,
  type SuggestedUtm,
} from './utm';
import { generateInsights, type Insight } from './insights';

const _sources = new Set<string>(CANONICAL_SOURCES);
const _mediums = new Set<string>(VALID_MEDIUMS);
const isCanonical = (s: string) => _sources.has(s);
const isValidMedium = (m: string) => _mediums.has(m);

export const PORTAL_ID = '49656171';
export const contactUrl = (id: string) =>
  `https://app.hubspot.com/contacts/${PORTAL_ID}/contact/${id}`;
export const dealUrl = (id: string) =>
  `https://app.hubspot.com/contacts/${PORTAL_ID}/deal/${id}`;

export type ObjectType = 'contacts' | 'deals';
export const OBJECT_TYPES: ObjectType[] = ['contacts', 'deals'];
export const OBJECT_LABELS: Record<ObjectType, string> = {
  contacts: 'Contatos',
  deals:    'Negócios',
};
export const OBJECT_NOUN_PLURAL: Record<ObjectType, string> = {
  contacts: 'leads',
  deals:    'negócios',
};
export const OBJECT_LIST_URL: Record<ObjectType, string> = {
  contacts: `https://app.hubspot.com/contacts/${PORTAL_ID}/objects/0-1/views/all/list`,
  deals:    `https://app.hubspot.com/contacts/${PORTAL_ID}/objects/0-3/views/all/list`,
};

export type Period = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = {
  '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365,
};

export const PERIOD_LABELS: Record<Period, string> = {
  '7d':   '7 dias',
  '30d':  '30 dias',
  '90d':  '90 dias',
  '180d': '180 dias',
  '365d': '12 meses',
  'all':  'Toda a base',
};

export const PERIODS_ORDER: Period[] = ['7d', '30d', '90d', '180d', '365d', 'all'];

export type Dataset = {
  generatedAt: string;
  period: Period;
  objectType: ObjectType;
  windowStart: string | null;
  windowEnd: string | null;
  totals: {
    leads: number;
    complete: number;       // atende a regra de completude do seu source
    incomplete: number;     // tem utm_source mas falta algo (campaign p/ fb/li/google etc)
    missing: number;        // utm_source vazio
    nonCanonical: number;   // tem utm_source mas valor não está na lista canônica PSA (separado de complete)
  };
  coverage: { withUtm: number; withoutUtm: number; pct: number };
  completeness: { complete: number; tagged: number; pct: number };  // % dos taggeados que são completos
  topCampaigns: { name: string; count: number; nonStandardCount: number }[];
  duplicateCampaigns: { slug: string; variants: { name: string; count: number }[] }[];
  topSources: { name: string; count: number; isCanonical: boolean }[];
  topMediums: { name: string; count: number; isValid: boolean }[];
  untaggedLandings: {
    landing: string;
    landingHref: string;
    referrer: string;
    referrerHref: string | null;
    count: number;
    suggested: SuggestedUtm | null;
  }[];
  recentUntagged: {
    id: string;
    name: string;
    hubspotUrl: string;
    createdAt: string;
    landing: string;
    landingHref: string;
    referrer: string;
    referrerHref: string | null;
    analyticsSource: string;
    lifecycleStage: string;
    productHints: string[];
    amount: string;
    suggested: SuggestedUtm | null;
  }[];
  untaggedSegments: SegmentDimension[];
  history: {
    sources: string[];
    mediums: string[];
    campaigns: string[];
    landings: string[];
  };
  fixExamples: FixExample[];
  insights: Insight[];
  meta: {
    sampleSizeTagged: number;
    sampleSizeUntagged: number;
    sampleCapped: boolean;
    portalNote?: string;
  };
};

type ObjectCfg = {
  type: ObjectType;
  taggedProps: string[];
  untaggedProps: string[];
  hubspotUrl: (id: string) => string;
  nameOf: (p: Record<string, string | null>) => string;
  amountOf?: (p: Record<string, string | null>) => string;
  lifecycleProp: string;
  lifecycleHuman: (v: string) => string;
  origemProp: string;
  origemHuman: (v: string) => string;
  productHints: (p: Record<string, string | null>) => string[];
  segments: {
    dim: string;
    title: string;
    description: string;
    keyOf: (p: Record<string, string | null>) => string;
    labelOf: (k: string) => string;
  }[];
};

const CONTACT_TAGGED_PROPS = [
  'createdate', 'firstname', 'lastname', 'email',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'hs_analytics_first_url',
];

const CONTACT_UNTAGGED_PROPS = [
  'createdate', 'firstname', 'lastname', 'email',
  'hs_analytics_source', 'hs_analytics_source_data_1', 'hs_analytics_source_data_2',
  'hs_latest_source', 'hs_latest_source_data_1', 'hs_latest_source_data_2',
  'hs_analytics_first_url', 'hs_analytics_first_referrer',
  'hs_analytics_first_visit_timestamp',
  'lifecyclestage', 'origem_do_lead',
  'origem_tbs', 'interesse_tbs_2026', 'tbs___origem_macro',
  'receberdrops', 'enviar_psa_drops', 'e_partner',
  'tipo_de_interesse', 'qual_seu_interesse_2',
  'utm_source', 'utm_medium', 'utm_campaign',
];

const DEAL_TAGGED_PROPS = [
  'createdate', 'dealname', 'amount', 'dealstage', 'pipeline',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
];

const DEAL_UNTAGGED_PROPS = [
  'createdate', 'dealname', 'amount', 'dealstage', 'pipeline', 'closedate',
  'hs_analytics_source', 'hs_analytics_source_data_1', 'hs_analytics_source_data_2',
  'hs_analytics_latest_source', 'hs_analytics_latest_source_data_1', 'hs_analytics_latest_source_data_2',
  'campanha_de_origem', 'origem_da_venda__ganho_', 'origem_do_lead', 'origem_da_qualificacao',
  'utm_source', 'utm_medium', 'utm_campaign',
];

function dealStageHuman(s: string): string {
  // IDs internos do HubSpot ficam crípticos. Mostra como está, mas marca "(não preenchido)" pra vazio.
  return s || '(sem stage)';
}

function getCfg(objectType: ObjectType): ObjectCfg {
  if (objectType === 'deals') {
    return {
      type: 'deals',
      taggedProps: DEAL_TAGGED_PROPS,
      untaggedProps: DEAL_UNTAGGED_PROPS,
      hubspotUrl: dealUrl,
      nameOf: (p) => (p.dealname ?? '').trim() || '(sem nome)',
      amountOf: (p) => p.amount ?? '',
      lifecycleProp: 'dealstage',
      lifecycleHuman: dealStageHuman,
      origemProp: 'campanha_de_origem',
      origemHuman: (v) => v,
      productHints: () => [], // não dá pra inferir produto direto do deal sem mapping
      segments: [
        {
          dim: 'source',
          title: 'Categoria de origem (HubSpot)',
          description: 'Agrupamento automático do HubSpot do contato associado a este negócio (no momento do touch). Mostra POR ONDE veio quando o deal não tem UTM próprio.',
          keyOf: (p) => p.hs_analytics_source || 'UNKNOWN',
          labelOf: humanSource,
        },
        {
          dim: 'lifecycle',
          title: 'Dealstage (etapa do funil)',
          description: 'Em que estágio do pipeline os negócios sem UTM estão. Stages avançadas = receita perdendo origem; iniciais = ainda dá tempo de taggear.',
          keyOf: (p) => p.dealstage || '(sem stage)',
          labelOf: dealStageHuman,
        },
        {
          dim: 'pipeline',
          title: 'Pipeline',
          description: 'Qual pipeline (TBS, Drops, Consultoria, etc) tem mais negócios sem UTM. Pipeline diferente, motivo diferente — pipelines criados via integração tendem a perder UTMs.',
          keyOf: (p) => p.pipeline || '(sem pipeline)',
          labelOf: (v) => v,
        },
        {
          dim: 'origem',
          title: 'Campanha de origem (campo PSA)',
          description: 'Valor do campo `campanha_de_origem` no negócio. Se a maior parte é vazio, o problema tá no fluxo que cria o deal — precisa propagar UTM do contato pro deal.',
          keyOf: (p) => (p.campanha_de_origem || '(não preenchido)').trim() || '(não preenchido)',
          labelOf: (v) => v,
        },
      ],
    };
  }
  // contacts (default)
  return {
    type: 'contacts',
    taggedProps: CONTACT_TAGGED_PROPS,
    untaggedProps: CONTACT_UNTAGGED_PROPS,
    hubspotUrl: contactUrl,
    nameOf: (p) => {
      const fn = (p.firstname ?? '').trim();
      const ln = (p.lastname ?? '').trim();
      return [fn, ln].filter(Boolean).join(' ') || '(sem nome)';
    },
    lifecycleProp: 'lifecyclestage',
    lifecycleHuman: humanLifecycle,
    origemProp: 'origem_do_lead',
    origemHuman: (v) => v,
    productHints: productHintsFor,
    segments: [
      {
        dim: 'source',
        title: 'Categoria de origem (HubSpot)',
        description: 'Agrupamento automático do HubSpot baseado em referrer + heurísticas. Mostra POR ONDE os leads entraram quando não tem UTM pra te contar.',
        keyOf: (p) => p.hs_analytics_source || 'UNKNOWN',
        labelOf: humanSource,
      },
      {
        dim: 'lifecycle',
        title: 'Lifecycle stage',
        description: 'Em que etapa do funil os leads sem UTM estão. Subscriber/Lead alto = aquisição sem atribuição; Customer alto = receita perdendo origem.',
        keyOf: (p) => p.lifecyclestage || 'unknown',
        labelOf: humanLifecycle,
      },
      {
        dim: 'product',
        title: 'Produto / iniciativa',
        description: 'Qual produto da PSA cada lead sem UTM está interessado. Usa as flags origem_tbs, interesse_tbs_2026, receberdrops, e_partner.',
        keyOf: (p) => primaryProduct(p),
        labelOf: (v) => v,
      },
      {
        dim: 'origem',
        title: 'Origem do lead (campo PSA)',
        description: 'Valor do campo `origem_do_lead` (preenchido por forms/integrações). Se a maior parte é "Formulário", o problema tá nos forms sem UTM.',
        keyOf: (p) => (p.origem_do_lead || '(não preenchido)').trim() || '(não preenchido)',
        labelOf: (v) => v,
      },
    ],
  };
}

function windowFilter(from: string | null, to: string | null) {
  const filters: { propertyName: string; operator: 'GTE' | 'LT'; value: string }[] = [];
  if (from) filters.push({ propertyName: 'createdate', operator: 'GTE', value: from });
  if (to)   filters.push({ propertyName: 'createdate', operator: 'LT',  value: to });
  return filters;
}

export type SegmentBucket = {
  key: string;       // valor bruto da propriedade
  label: string;     // valor humanizado
  count: number;     // count extrapolado pro total
  sampleCount: number; // count na amostra
};

export type SegmentDimension = {
  dim: string;       // identificador da dimensão (source/lifecycle/product/origem)
  title: string;
  description: string;
  buckets: SegmentBucket[];
};

export type FixExample = {
  kind: 'non_standard_source' | 'non_standard_medium' | 'missing_utm' | 'partial_utm';
  problemHeadline: string;
  problemDetail: string;
  contact: {
    id: string;
    name: string;
    email: string;
    hubspotUrl: string;
    createdAt: string;
  };
  current: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    landing?: string;
    landingHref?: string;
    referrer?: string;
  };
  fix: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    fullUrl?: string;
  };
  steps: string[];
};

export async function getUtmDataset(period: Period = '90d', objectType: ObjectType = 'contacts'): Promise<Dataset> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN não configurado — copie .env.example para .env e preencha o token.');

  const cfg = getCfg(objectType);
  const now = new Date();
  let from: string | null = null;
  let to: string | null = null;
  if (period !== 'all') {
    const start = new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
    from = start.toISOString();
    to = now.toISOString();
  }

  // 1) KPIs via contagem
  const winFilters = windowFilter(from, to);
  const baseGroup = winFilters.length > 0 ? [{ filters: winFilters }] : [{ filters: [{ propertyName: 'createdate', operator: 'HAS_PROPERTY' as const }] }];
  const totalLeads = await hsCount(token, { filterGroups: baseGroup }, objectType);
  const withSource = await hsCount(token, {
    filterGroups: [{ filters: [...winFilters, { propertyName: 'utm_source', operator: 'HAS_PROPERTY' }] }],
  }, objectType);

  // 2) Amostra com UTM
  const MAX_PAGES = 10;
  const tagged = await hsFetchAll(token, {
    filterGroups: [{ filters: [...winFilters, { propertyName: 'utm_source', operator: 'HAS_PROPERTY' }] }],
    properties: cfg.taggedProps,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  }, MAX_PAGES, objectType);

  // 3) Amostra SEM UTM
  const untagged = await hsFetchAll(token, {
    filterGroups: [{ filters: [...winFilters, { propertyName: 'utm_source', operator: 'NOT_HAS_PROPERTY' }] }],
    properties: cfg.untaggedProps,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  }, MAX_PAGES, objectType);

  // Agrega top campaigns / sources / mediums + classifica completude
  const campCount = new Map<string, { count: number; nonStandard: number }>();
  const sourceCount = new Map<string, number>();
  const mediumCount = new Map<string, number>();
  let completeCount = 0;
  let incompleteCount = 0;
  let nonCanonicalCount = 0;

  for (const c of tagged) {
    const p = c.properties;
    const status = classifyUtm({
      utm_source: p.utm_source,
      utm_medium: p.utm_medium,
      utm_campaign: p.utm_campaign,
      utm_term: p.utm_term,
      utm_content: p.utm_content,
    });
    if (status === 'complete') completeCount++;
    else if (status === 'incomplete') incompleteCount++;

    const s = normalize(p.utm_source);
    const m = normalize(p.utm_medium);
    const ca = normalize(p.utm_campaign);
    const sourceNonCanonical = s && !isCanonical(s);
    if (sourceNonCanonical) nonCanonicalCount++;

    if (s) sourceCount.set(s, (sourceCount.get(s) ?? 0) + 1);
    if (m) mediumCount.set(m, (mediumCount.get(m) ?? 0) + 1);
    if (ca) {
      const prev = campCount.get(ca) ?? { count: 0, nonStandard: 0 };
      prev.count++;
      if (sourceNonCanonical) prev.nonStandard++;
      campCount.set(ca, prev);
    }
  }

  // Duplicatas de campaigns (mesmo slug, nomes diferentes)
  const bySlug = new Map<string, Map<string, number>>();
  for (const [name, info] of campCount) {
    const slug = campaignSlug(name);
    if (!bySlug.has(slug)) bySlug.set(slug, new Map());
    bySlug.get(slug)!.set(name, info.count);
  }
  const duplicateCampaigns = [...bySlug.entries()]
    .filter(([, variants]) => variants.size > 1)
    .map(([slug, variants]) => ({
      slug,
      variants: [...variants.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => sumVariants(b.variants) - sumVariants(a.variants))
    .slice(0, 10);

  // Mapa de buracos: agrupa untagged por (landing × referrer) + sugere UTM
  const buracoMap = new Map<string, {
    landing: string;
    referrer: string;
    referrerRaw: string;
    count: number;
    analyticsSource: string;
    sourceData1: string;
  }>();
  for (const c of untagged) {
    const p = c.properties;
    const landing = stripQuery(p.hs_analytics_first_url ?? '') || '(desconhecida)';
    const referrerRaw = p.hs_analytics_first_referrer ?? '';
    const referrer = normalizeReferrer(referrerRaw);
    const key = `${landing} ⇠ ${referrer}`;
    const prev = buracoMap.get(key);
    if (prev) prev.count++;
    else buracoMap.set(key, {
      landing,
      referrer,
      referrerRaw,
      count: 1,
      analyticsSource: p.hs_analytics_source ?? '',
      sourceData1: p.hs_analytics_source_data_1 ?? '',
    });
  }
  const untaggedLandings = [...buracoMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((b) => ({
      landing: cleanPath(b.landing),
      landingHref: b.landing,
      referrer: b.referrer,
      referrerHref: validHref(b.referrerRaw),
      count: b.count,
      suggested: suggestUtm({
        firstReferrer: b.referrerRaw || b.referrer,
        firstUrl: b.landing,
        analyticsSource: b.analyticsSource,
        sourceData1: b.sourceData1,
      }),
    }));

  const recentUntagged = untagged.slice(0, 25).map((c) => {
    const p = c.properties;
    const landingFull = stripQuery(p.hs_analytics_first_url ?? '') || '';
    const referrerRaw = p.hs_analytics_first_referrer ?? '';
    return {
      id: c.id,
      name: cfg.nameOf(p),
      hubspotUrl: cfg.hubspotUrl(c.id),
      createdAt: p.createdate ?? '',
      landing: landingFull ? cleanPath(landingFull) : (objectType === 'deals' ? '(deal sem first URL)' : '(desconhecida)'),
      landingHref: landingFull,
      referrer: normalizeReferrer(referrerRaw),
      referrerHref: validHref(referrerRaw),
      analyticsSource: p.hs_analytics_source ?? '',
      lifecycleStage: cfg.lifecycleHuman(p[cfg.lifecycleProp] ?? ''),
      productHints: cfg.productHints(p),
      amount: cfg.amountOf ? cfg.amountOf(p) : '',
      suggested: suggestUtm({
        firstReferrer: p.hs_analytics_first_referrer,
        firstUrl: p.hs_analytics_first_url,
        analyticsSource: p.hs_analytics_source,
        sourceData1: p.hs_analytics_source_data_1,
      }),
    };
  });

  // Segmentação dos leads sem UTM — extrapolada da amostra pro total
  const untaggedTotal = Math.max(0, totalLeads - withSource);
  const scaleSeg = untagged.length > 0 ? untaggedTotal / untagged.length : 1;

  const untaggedSegments: SegmentDimension[] = cfg.segments.map((s) =>
    buildDim(s.dim, s.title, s.description, untagged, scaleSeg, s.keyOf, s.labelOf),
  );

  const missingFromCount = Math.max(0, totalLeads - withSource);
  const taggedSampleTotal = tagged.length;

  // Exemplos práticos de "como arrumar" — pega leads reais e mostra current → fix
  const fixExamples = buildFixExamples(tagged, untagged, cfg, objectType);

  const result: Dataset = {
    generatedAt: new Date().toISOString(),
    period,
    objectType,
    windowStart: from,
    windowEnd: to,
    totals: {
      leads: totalLeads,
      complete: completeCount,
      incomplete: incompleteCount,
      missing: missingFromCount,
      nonCanonical: nonCanonicalCount,
    },
    coverage: {
      withUtm: withSource,
      withoutUtm: missingFromCount,
      pct: totalLeads > 0 ? withSource / totalLeads : 0,
    },
    completeness: {
      complete: completeCount,
      tagged: taggedSampleTotal,
      pct: taggedSampleTotal > 0 ? completeCount / taggedSampleTotal : 0,
    },
    topCampaigns: [...campCount.entries()]
      .map(([name, info]) => ({ name, count: info.count, nonStandardCount: info.nonStandard }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    duplicateCampaigns,
    topSources: [...sourceCount.entries()]
      .map(([name, count]) => ({ name, count, isCanonical: isCanonical(name) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    topMediums: [...mediumCount.entries()]
      .map(([name, count]) => ({ name, count, isValid: isValidMedium(name) }))
      .sort((a, b) => b.count - a.count),
    untaggedLandings,
    recentUntagged,
    untaggedSegments,
    fixExamples,
    history: {
      sources:   [...sourceCount.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
      mediums:   [...mediumCount.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k),
      campaigns: [...campCount.entries()].sort((a, b) => b[1].count - a[1].count).map(([k]) => k),
      landings:  [...new Set(untagged.map((c) => stripQuery(c.properties.hs_analytics_first_url ?? '')).filter(Boolean))].slice(0, 30),
    },
    insights: [],
    meta: {
      sampleSizeTagged: tagged.length,
      sampleSizeUntagged: untagged.length,
      sampleCapped: tagged.length >= MAX_PAGES * 100 || untagged.length >= MAX_PAGES * 100,
    },
  };
  result.insights = generateInsights(result);
  return result;
}

function buildDim(
  dim: string,
  title: string,
  description: string,
  contacts: { properties: Record<string, string | null> }[],
  scale: number,
  keyOf: (p: Record<string, string | null>) => string,
  labelOf: (key: string) => string,
): SegmentDimension {
  const counts = new Map<string, number>();
  for (const c of contacts) {
    const k = keyOf(c.properties);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const buckets: SegmentBucket[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, sampleCount]) => ({
      key,
      label: labelOf(key),
      sampleCount,
      count: Math.round(sampleCount * scale),
    }));
  return { dim, title, description, buckets };
}

function buildFixExamples(tagged: HsContact[], untagged: HsContact[], cfg: ObjectCfg, objectType: ObjectType): FixExample[] {
  const examples: FixExample[] = [];
  const sourceSet = new Set<string>(CANONICAL_SOURCES);
  const mediumSet = new Set<string>(VALID_MEDIUMS);

  // 1. Não-padrão por SOURCE (ex.: hs_email, adwords)
  const nonStdSources = new Map<string, HsContact>();
  for (const c of tagged) {
    const s = (c.properties.utm_source ?? '').toLowerCase().trim();
    if (s && !sourceSet.has(s) && !nonStdSources.has(s)) nonStdSources.set(s, c);
    if (nonStdSources.size >= 2) break;
  }
  for (const [source, c] of nonStdSources) {
    const p = c.properties;
    const correction = fixSource(source);
    const currentCampaign = p.utm_campaign ?? '';
    const currentMedium = p.utm_medium ?? '';
    const correctedMedium = mediumSet.has(currentMedium.toLowerCase()) ? currentMedium : (fixMedium(currentMedium)?.fix ?? 'social');
    const correctedCampaign = currentCampaign || 'sem-campaign-definida';
    examples.push({
      kind: 'non_standard_source',
      problemHeadline: `Source \`${source}\` não está na lista canônica`,
      problemDetail: correction
        ? correction.why
        : 'Esse nome não bate com nenhuma fonte padronizada do HubSpot — vai cair em Other Campaigns nos relatórios.',
      contact: {
        id: c.id,
        name: cfg.nameOf(p),
        email: objectType === 'contacts' ? (p.email ?? '') : `${p.amount ? `R$ ${p.amount}` : ''}`,
        hubspotUrl: cfg.hubspotUrl(c.id),
        createdAt: p.createdate ?? '',
      },
      current: {
        utm_source: source,
        utm_medium: currentMedium,
        utm_campaign: currentCampaign,
        landing: stripQuery(p.hs_analytics_first_url ?? ''),
      },
      fix: {
        utm_source: correction?.fix ?? '(definir nome canônico)',
        utm_medium: correctedMedium,
        utm_campaign: correctedCampaign,
        fullUrl: buildUtmUrl(p.hs_analytics_first_url ?? '', correction?.fix ?? '', correctedMedium, correctedCampaign),
      },
      steps: [
        `Abrir ${objectType === 'deals' ? 'o negócio' : 'o contato'} no HubSpot (link acima).`,
        `Editar a propriedade utm_source: trocar \`${source}\` por \`${correction?.fix ?? 'um nome canônico'}\`.`,
        currentMedium && !mediumSet.has(currentMedium.toLowerCase())
          ? `Editar utm_medium: trocar \`${currentMedium}\` por \`${correctedMedium}\`.`
          : `Manter utm_medium em \`${correctedMedium}\` (já válido).`,
        `Para corrigir TODOS os ${OBJECT_NOUN_PLURAL[objectType]} de uma vez: criar workflow no HubSpot (em ${objectType === 'deals' ? 'Deal-based workflows' : 'Contact-based workflows'}) com filtro "utm_source EQ ${source}" e ação "Set utm_source = ${correction?.fix ?? 'canônico'}".`,
        `Atualizar o link de origem (anúncio, bio, email) pra já usar o nome correto e parar a sangria.`,
      ],
    });
  }

  // 2. Não-padrão por MEDIUM (ex.: ppc, organic, bio)
  const nonStdMediums = new Map<string, HsContact>();
  for (const c of tagged) {
    const m = (c.properties.utm_medium ?? '').toLowerCase().trim();
    if (m && !mediumSet.has(m) && !nonStdMediums.has(m)) nonStdMediums.set(m, c);
    if (nonStdMediums.size >= 2) break;
  }
  for (const [medium, c] of nonStdMediums) {
    const p = c.properties;
    const correction = fixMedium(medium);
    const currentSource = p.utm_source ?? '';
    const correctedSource = sourceSet.has(currentSource.toLowerCase()) ? currentSource : (fixSource(currentSource)?.fix ?? 'definir');
    const currentCampaign = p.utm_campaign ?? '';
    examples.push({
      kind: 'non_standard_medium',
      problemHeadline: `Medium \`${medium}\` não está na lista válida`,
      problemDetail: correction
        ? correction.why
        : 'Os únicos mediums válidos são social, paid_social, cpc, email. Qualquer outro nome quebra o agrupamento automático do HubSpot.',
      contact: {
        id: c.id,
        name: cfg.nameOf(p),
        email: objectType === 'contacts' ? (p.email ?? '') : `${p.amount ? `R$ ${p.amount}` : ''}`,
        hubspotUrl: cfg.hubspotUrl(c.id),
        createdAt: p.createdate ?? '',
      },
      current: {
        utm_source: currentSource,
        utm_medium: medium,
        utm_campaign: currentCampaign,
        landing: stripQuery(p.hs_analytics_first_url ?? ''),
      },
      fix: {
        utm_source: correctedSource,
        utm_medium: correction?.fix ?? 'social',
        utm_campaign: currentCampaign || 'sem-campaign-definida',
        fullUrl: buildUtmUrl(p.hs_analytics_first_url ?? '', correctedSource, correction?.fix ?? 'social', currentCampaign),
      },
      steps: [
        `Abrir ${objectType === 'deals' ? 'o negócio' : 'o contato'} no HubSpot.`,
        `Editar utm_medium: trocar \`${medium}\` por \`${correction?.fix ?? 'um medium válido'}\`.`,
        `Para corrigir TODOS: workflow ${objectType === 'deals' ? 'baseado em Deal' : 'baseado em Contact'} com filtro "utm_medium EQ ${medium}" → set utm_medium = ${correction?.fix ?? 'válido'}.`,
        `Mais importante: atualizar o link de origem (anúncio/post/email) com o medium correto, senão novos leads vão continuar entrando errado.`,
      ],
    });
  }

  // 3. Sem UTM — pega 2 buracos representativos do topo
  const topUntagged = pickTopUntaggedExamples(untagged);
  for (const c of topUntagged) {
    const p = c.properties;
    const referrer = p.hs_analytics_first_referrer ?? '';
    const landing = stripQuery(p.hs_analytics_first_url ?? '');
    const suggested = suggestUtm({
      firstReferrer: referrer,
      firstUrl: landing,
      analyticsSource: p.hs_analytics_source,
      sourceData1: p.hs_analytics_source_data_1,
    });
    if (!suggested) continue;
    examples.push({
      kind: 'missing_utm',
      problemHeadline: `${objectType === 'deals' ? 'Negócio criado' : 'Lead chegou'} sem nenhuma UTM via ${normalizeReferrer(referrer) || 'direct'}`,
      problemDetail: `HubSpot atribuiu como \`${p.hs_analytics_source ?? 'DIRECT_TRAFFIC'}\` — você perdeu a origem real.`,
      contact: {
        id: c.id,
        name: cfg.nameOf(p),
        email: objectType === 'contacts' ? (p.email ?? '') : `${p.amount ? `R$ ${p.amount}` : ''}`,
        hubspotUrl: cfg.hubspotUrl(c.id),
        createdAt: p.createdate ?? '',
      },
      current: {
        landing,
        landingHref: landing,
        referrer: normalizeReferrer(referrer) || '(direct)',
      },
      fix: {
        utm_source: suggested.utm_source,
        utm_medium: suggested.utm_medium,
        utm_campaign: 'definir-campanha-da-iniciativa',
        fullUrl: buildUtmUrl(landing, suggested.utm_source, suggested.utm_medium, 'definir-campanha-da-iniciativa'),
      },
      steps: [
        `Não dá pra "consertar" esse ${objectType === 'deals' ? 'negócio' : 'lead'} retroativamente — a origem dele já passou.`,
        `Mas dá pra parar a sangria: ${suggested.applyAt}.`,
        `Substituir o link atual ${landing} pela URL com UTM (acima).`,
        objectType === 'deals'
          ? `Para deals: garantir que o fluxo de criação (form/checkout/integração) propague a UTM do contato pro deal — senão o deal nasce sem atribuição.`
          : `Próximos leads que vierem desse ponto já chegam taggeados corretamente.`,
      ],
    });
  }

  return examples.slice(0, 6);
}

function pickTopUntaggedExamples(untagged: HsContact[]): HsContact[] {
  const seen = new Map<string, HsContact>();
  for (const c of untagged) {
    const p = c.properties;
    const ref = normalizeReferrer(p.hs_analytics_first_referrer ?? '');
    if (ref === '(direct)' || !ref) continue;
    const landing = stripQuery(p.hs_analytics_first_url ?? '');
    if (!landing) continue;
    const key = `${landing}|${ref}`;
    if (!seen.has(key)) seen.set(key, c);
    if (seen.size >= 2) break;
  }
  return [...seen.values()];
}

function buildUtmUrl(targetUrl: string, source: string, medium: string, campaign: string): string {
  if (!targetUrl) return '';
  try {
    const u = new URL(targetUrl);
    u.search = ''; // limpa query antiga
    if (source) u.searchParams.set('utm_source', source);
    if (medium) u.searchParams.set('utm_medium', medium);
    if (campaign) u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return '';
  }
}

function humanSource(s: string): string {
  const map: Record<string, string> = {
    DIRECT_TRAFFIC:   'Direct (entrou direto sem referrer)',
    ORGANIC_SEARCH:   'Pesquisa Orgânica (Google/Bing sem ads)',
    PAID_SEARCH:      'Pesquisa Paga (Google Ads)',
    EMAIL_MARKETING:  'Email marketing',
    SOCIAL_MEDIA:     'Social Media (orgânico)',
    PAID_SOCIAL:      'Paid Social (Meta/LinkedIn Ads)',
    REFERRALS:        'Referrals (link de outro site)',
    OTHER_CAMPAIGNS:  'Other Campaigns (UTM fora do padrão)',
    OFFLINE_SOURCES:  'Offline (cadastro manual, evento)',
    UNKNOWN:          'Desconhecido',
  };
  return map[s] ?? s;
}

function humanLifecycle(s: string): string {
  const map: Record<string, string> = {
    subscriber:    'Subscriber (inscrito em comunicação)',
    lead:          'Lead',
    marketingqualifiedlead: 'MQL',
    salesqualifiedlead:     'SQL',
    opportunity:   'Oportunidade',
    customer:      'Cliente',
    evangelist:    'Evangelista',
    other:         'Outro',
    '':            '(não preenchido)',
    unknown:       '(não preenchido)',
  };
  return map[s] ?? s;
}

function primaryProduct(p: Record<string, string | null>): string {
  const has = (k: string) => {
    const v = (p[k] ?? '').toLowerCase().trim();
    return v && v !== 'false' && v !== '0';
  };
  const products: string[] = [];
  if (has('origem_tbs') || has('interesse_tbs_2026') || has('tbs___origem_macro')) products.push('TBS');
  if (has('receberdrops') || has('enviar_psa_drops')) products.push('Drops');
  if (has('e_partner')) products.push('Partner');
  if (products.length === 0) return 'Sem produto identificado';
  if (products.length === 1) return products[0];
  return products.join(' + ');
}

export type SegmentDetail = {
  total: number;
  sampleSize: number;
  tagged: boolean;
  contacts: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    landing: string;
    landingHref: string;
    referrer: string;
    lifecycle: string;
    productHints: string[];
    analyticsSource: string;
    hubspotUrl: string;
    suggested: SuggestedUtm | null;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
  }[];
};

export async function fetchSegmentDetail(args: {
  period: Period;
  dim: string;
  value: string;
  page?: number;
  objectType?: ObjectType;
}): Promise<SegmentDetail> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN não configurado');

  const objectType: ObjectType = args.objectType ?? 'contacts';
  const cfg = getCfg(objectType);
  const now = new Date();
  let from: string | null = null;
  let to: string | null = null;
  if (args.period !== 'all') {
    const start = new Date(now.getTime() - PERIOD_DAYS[args.period] * 24 * 60 * 60 * 1000);
    from = start.toISOString();
    to = now.toISOString();
  }
  const win = windowFilter(from, to);
  const baseFilters: { propertyName: string; operator: any; value?: string; values?: string[] }[] = [...win];
  if (!TAGGED_DIMS.has(args.dim)) {
    baseFilters.push({ propertyName: 'utm_source', operator: 'NOT_HAS_PROPERTY' });
  }
  baseFilters.push(...segmentFilters(args.dim, args.value, objectType));

  const PAGE_SIZE = 50;
  const skip = ((args.page ?? 1) - 1) * PAGE_SIZE;

  const search = await hsCount(token, { filterGroups: [{ filters: baseFilters }] }, objectType);
  const sample = await hsFetchAll(token, {
    filterGroups: [{ filters: baseFilters }],
    properties: cfg.untaggedProps,
    sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
  }, Math.ceil((skip + PAGE_SIZE) / 100), objectType);

  const slice = sample.slice(skip, skip + PAGE_SIZE);
  return {
    total: search,
    sampleSize: sample.length,
    tagged: TAGGED_DIMS.has(args.dim),
    contacts: slice.map((c) => {
      const p = c.properties;
      const landingFull = stripQuery(p.hs_analytics_first_url ?? '') || '';
      return {
        id: c.id,
        name: cfg.nameOf(p),
        email: objectType === 'contacts' ? (p.email ?? '') : (p.amount ? `R$ ${p.amount}` : ''),
        createdAt: p.createdate ?? '',
        landing: landingFull ? cleanPath(landingFull) : (objectType === 'deals' ? '(deal sem first URL)' : '(desconhecida)'),
        landingHref: landingFull,
        referrer: normalizeReferrer(p.hs_analytics_first_referrer ?? ''),
        lifecycle: cfg.lifecycleHuman(p[cfg.lifecycleProp] ?? ''),
        productHints: cfg.productHints(p),
        analyticsSource: p.hs_analytics_source ?? '',
        hubspotUrl: cfg.hubspotUrl(c.id),
        suggested: suggestUtm({
          firstReferrer: p.hs_analytics_first_referrer,
          firstUrl: p.hs_analytics_first_url,
          analyticsSource: p.hs_analytics_source,
          sourceData1: p.hs_analytics_source_data_1,
        }),
        utm_source: p.utm_source ?? '',
        utm_medium: p.utm_medium ?? '',
        utm_campaign: p.utm_campaign ?? '',
      };
    }),
  };
}

// Dimensões que NÃO devem aplicar o filtro "utm_source NOT_HAS_PROPERTY"
// (porque elas são pra inspecionar leads que TÊM UTM).
export const TAGGED_DIMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm']);

function segmentFilters(dim: string, value: string, objectType: ObjectType = 'contacts') {
  const lifecycleProp = objectType === 'deals' ? 'dealstage' : 'lifecyclestage';
  const origemProp = objectType === 'deals' ? 'campanha_de_origem' : 'origem_do_lead';
  switch (dim) {
    case 'source':
      return [{ propertyName: 'hs_analytics_source', operator: 'EQ' as const, value }];
    case 'lifecycle':
      if (value === 'unknown' || value === '' || value === '(sem stage)') {
        return [{ propertyName: lifecycleProp, operator: 'NOT_HAS_PROPERTY' as const }];
      }
      return [{ propertyName: lifecycleProp, operator: 'EQ' as const, value }];
    case 'pipeline':
      if (value === '(sem pipeline)') {
        return [{ propertyName: 'pipeline', operator: 'NOT_HAS_PROPERTY' as const }];
      }
      return [{ propertyName: 'pipeline', operator: 'EQ' as const, value }];
    case 'origem':
      if (value === '(não preenchido)') {
        return [{ propertyName: origemProp, operator: 'NOT_HAS_PROPERTY' as const }];
      }
      return [{ propertyName: origemProp, operator: 'EQ' as const, value }];
    case 'product':
      if (value === 'TBS')      return [{ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' as const }];
      if (value === 'Drops')    return [{ propertyName: 'receberdrops', operator: 'EQ' as const, value: 'true' }];
      if (value === 'Partner')  return [{ propertyName: 'e_partner', operator: 'EQ' as const, value: 'true' }];
      if (value === 'Sem produto identificado') {
        return [
          { propertyName: 'origem_tbs', operator: 'NOT_HAS_PROPERTY' as const },
          { propertyName: 'receberdrops', operator: 'NEQ' as const, value: 'true' },
          { propertyName: 'e_partner', operator: 'NEQ' as const, value: 'true' },
        ];
      }
      return [];
    case 'utm_source':
      return [{ propertyName: 'utm_source', operator: 'EQ' as const, value }];
    case 'utm_medium':
      return [{ propertyName: 'utm_medium', operator: 'EQ' as const, value }];
    case 'utm_campaign':
      return [{ propertyName: 'utm_campaign', operator: 'EQ' as const, value }];
    case 'utm':
      // só usado pra trazer o sumário "with"/"non-standard"
      if (value === 'with')         return [{ propertyName: 'utm_source', operator: 'HAS_PROPERTY' as const }];
      if (value === 'non-standard') return [{ propertyName: 'utm_medium', operator: 'NOT_IN' as const, values: [...VALID_MEDIUMS] } as any];
      return [];
    default:
      return [];
  }
}

function productHintsFor(p: Record<string, string | null>): string[] {
  const hints: string[] = [];
  const has = (k: string) => {
    const v = (p[k] ?? '').toLowerCase().trim();
    return v && v !== 'false' && v !== '0';
  };
  if (has('origem_tbs') || has('interesse_tbs_2026') || has('tbs___origem_macro')) hints.push('TBS');
  if (has('receberdrops') || has('enviar_psa_drops')) hints.push('Drops');
  if (has('e_partner')) hints.push('Partner');
  const life = (p.lifecyclestage ?? '').trim();
  if (life === 'customer') hints.push('Cliente');
  return hints;
}

function sumVariants(v: { count: number }[]): number {
  return v.reduce((a, b) => a + b.count, 0);
}

function stripQuery(url: string): string {
  if (!url) return '';
  return url.split('?')[0];
}

function normalizeReferrer(ref: string): string {
  if (!ref) return '(direct)';
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return ref.length > 60 ? ref.slice(0, 60) + '…' : ref;
  }
}

function cleanPath(url: string): string {
  if (!url || url === '(desconhecida)') return url;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    return url;
  }
}

function validHref(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    return null;
  } catch {
    return null;
  }
}

