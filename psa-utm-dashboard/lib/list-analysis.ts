import { hsBatchRead, hsListMembershipIds, hsListMembershipsCount } from './hubspot';
import { contactUrl, PORTAL_ID } from './data';
import { suggestUtm, CANONICAL_SOURCES, VALID_MEDIUMS, type SuggestedUtm } from './utm';

const SOURCE_SET = new Set<string>(CANONICAL_SOURCES);
const MEDIUM_SET = new Set<string>(VALID_MEDIUMS);

const LIST_PROPS = [
  'createdate', 'firstname', 'lastname', 'email',
  'hs_analytics_source', 'hs_analytics_source_data_1', 'hs_analytics_source_data_2',
  'hs_analytics_first_url', 'hs_analytics_first_referrer',
  'first_conversion_event_name', 'first_conversion_date',
  'origem_do_lead', 'origem_tbs', 'tbs___origem_macro',
  'utm_source', 'utm_medium', 'utm_campaign',
  'lifecyclestage',
];

export type RecoveryPath = 'utm_in_url' | 'lp_known' | 'form_known' | 'analytics_source_only' | 'unrecoverable';

export type LandingBucket = {
  landing: string;                    // path normalizado (sem query)
  landingHref: string;                // URL canônica pra abrir
  count: number;
  hasUtmInUrlCount: number;
  topConversion: string;
  topReferrer: string;
  extractedUtm: { utm_source: string; utm_medium: string; utm_campaign: string } | null;
  suggested: SuggestedUtm | null;
  recoveryPath: RecoveryPath;
};

export type ConversionBucket = {
  name: string;
  count: number;
  topLandings: { landing: string; count: number }[];
  suggested: SuggestedUtm | null;
};

export type ReferrerBucket = {
  referrer: string;
  count: number;
  suggested: SuggestedUtm | null;
};

export type ListContact = {
  id: string;
  hubspotUrl: string;
  name: string;
  email: string;
  createdAt: string;
  landing: string;
  conversion: string;
  referrer: string;
  analyticsSource: string;
  recoveryPath: RecoveryPath;
  currentUtmSource: string;
  suggestedUtm: { utm_source: string; utm_medium: string; utm_campaign: string } | null;
};

export type ListAnalysis = {
  listId: string;
  hubspotListUrl: string;
  totalInList: number;
  sampleSize: number;
  recovery: {
    utmInUrl: number;          // top tier — extract from URL
    lpKnown: number;           // landing page recognizable + referrer hint
    formKnown: number;         // only form name known
    analyticsOnly: number;     // only hs_analytics_source known
    unrecoverable: number;     // OFFLINE / nothing useful
  };
  landings: LandingBucket[];
  conversions: ConversionBucket[];
  referrers: ReferrerBucket[];
  contacts: ListContact[];     // amostra completa pra CSV
};

const MAX_SAMPLE = 500; // cabe no timeout de 10s da Vercel free plan

export async function fetchListAnalysis(listId: string): Promise<ListAnalysis> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN não configurado');

  // Lists membership API + batch read = funciona via REST público
  const [totalInList, ids] = await Promise.all([
    hsListMembershipsCount(token, listId),
    hsListMembershipIds(token, listId, MAX_SAMPLE),
  ]);
  const sample = await hsBatchRead(token, 'contacts', ids, LIST_PROPS);

  const landings = new Map<string, {
    count: number;
    hasUtmInUrl: number;
    conversionCounts: Map<string, number>;
    referrerCounts: Map<string, number>;
    sampleContact: typeof sample[number] | null;
    extractedUtm: { utm_source: string; utm_medium: string; utm_campaign: string } | null;
  }>();
  const conversions = new Map<string, { count: number; landings: Map<string, number>; sampleReferrer: string; sampleSource: string }>();
  const referrers = new Map<string, { count: number; sampleSource: string }>();
  const recovery = { utmInUrl: 0, lpKnown: 0, formKnown: 0, analyticsOnly: 0, unrecoverable: 0 };
  const contactsOut: ListContact[] = [];

  for (const c of sample) {
    const p = c.properties;
    const firstUrl = p.hs_analytics_first_url ?? '';
    const referrerRaw = p.hs_analytics_first_referrer ?? '';
    const conversion = (p.first_conversion_event_name ?? '').trim() || '(sem conversão registrada)';
    const analyticsSource = p.hs_analytics_source ?? '';
    const landingPath = cleanPath(firstUrl) || '(desconhecida)';
    const referrerHost = normalizeReferrer(referrerRaw);

    const extractedUtm = extractUtmFromUrl(firstUrl);
    const recoveryPath: RecoveryPath = classifyRecovery({
      extractedUtm,
      firstUrl,
      conversion,
      analyticsSource,
    });
    recovery[recoveryKey(recoveryPath)]++;

    // landings
    const landingKey = landingPath;
    let lb = landings.get(landingKey);
    if (!lb) {
      lb = { count: 0, hasUtmInUrl: 0, conversionCounts: new Map(), referrerCounts: new Map(), sampleContact: null, extractedUtm: null };
      landings.set(landingKey, lb);
    }
    lb.count++;
    if (extractedUtm) {
      lb.hasUtmInUrl++;
      if (!lb.extractedUtm) lb.extractedUtm = extractedUtm;
    }
    lb.conversionCounts.set(conversion, (lb.conversionCounts.get(conversion) ?? 0) + 1);
    lb.referrerCounts.set(referrerHost, (lb.referrerCounts.get(referrerHost) ?? 0) + 1);
    if (!lb.sampleContact) lb.sampleContact = c;

    // conversions
    let cb = conversions.get(conversion);
    if (!cb) {
      cb = { count: 0, landings: new Map(), sampleReferrer: referrerHost, sampleSource: analyticsSource };
      conversions.set(conversion, cb);
    }
    cb.count++;
    cb.landings.set(landingPath, (cb.landings.get(landingPath) ?? 0) + 1);

    // referrers
    let rb = referrers.get(referrerHost);
    if (!rb) { rb = { count: 0, sampleSource: analyticsSource }; referrers.set(referrerHost, rb); }
    rb.count++;

    // contacts pra CSV
    const suggestedUtm = extractedUtm ?? (() => {
      const s = suggestUtm({
        firstReferrer: referrerRaw,
        firstUrl,
        analyticsSource,
        sourceData1: p.hs_analytics_source_data_1,
      });
      if (!s) return null;
      const campaign = inferCampaignFromConversion(conversion, landingPath);
      return { utm_source: s.utm_source, utm_medium: s.utm_medium, utm_campaign: campaign };
    })();

    contactsOut.push({
      id: c.id,
      hubspotUrl: contactUrl(c.id),
      name: [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || '(sem nome)',
      email: p.email ?? '',
      createdAt: p.createdate ?? '',
      landing: landingPath,
      conversion,
      referrer: referrerHost,
      analyticsSource,
      recoveryPath,
      currentUtmSource: p.utm_source ?? '',
      suggestedUtm,
    });
  }

  // Top landings
  const landingsOut: LandingBucket[] = [...landings.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([landing, info]) => {
      const sample = info.sampleContact;
      const sampleReferrer = sample?.properties.hs_analytics_first_referrer ?? '';
      const sampleSource = sample?.properties.hs_analytics_source ?? '';
      const sampleSourceData1 = sample?.properties.hs_analytics_source_data_1 ?? '';
      const topConversion = topKey(info.conversionCounts);
      const topReferrer = topKey(info.referrerCounts);
      const recoveryPath = info.extractedUtm
        ? 'utm_in_url'
        : sampleReferrer
        ? 'lp_known'
        : topConversion && topConversion !== '(sem conversão registrada)'
        ? 'form_known'
        : sampleSource
        ? 'analytics_source_only'
        : 'unrecoverable';
      const suggested = info.extractedUtm
        ? { utm_source: info.extractedUtm.utm_source, utm_medium: info.extractedUtm.utm_medium, applyAt: 'Extrair direto do URL', reason: 'UTM já está nos parâmetros da URL' } as SuggestedUtm
        : suggestUtm({ firstReferrer: sampleReferrer, firstUrl: landing, analyticsSource: sampleSource, sourceData1: sampleSourceData1 });
      return {
        landing,
        landingHref: sample?.properties.hs_analytics_first_url ?? '',
        count: info.count,
        hasUtmInUrlCount: info.hasUtmInUrl,
        topConversion,
        topReferrer,
        extractedUtm: info.extractedUtm,
        suggested,
        recoveryPath,
      };
    });

  // Top conversions
  const conversionsOut: ConversionBucket[] = [...conversions.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([name, info]) => {
      const topLandings = [...info.landings.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([landing, count]) => ({ landing, count }));
      const suggested = suggestUtm({
        firstReferrer: info.sampleReferrer,
        firstUrl: topLandings[0]?.landing,
        analyticsSource: info.sampleSource,
        sourceData1: undefined,
      });
      return { name, count: info.count, topLandings, suggested };
    });

  // Top referrers
  const referrersOut: ReferrerBucket[] = [...referrers.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([referrer, info]) => ({
      referrer,
      count: info.count,
      suggested: suggestUtm({ firstReferrer: referrer === '(direct)' ? '' : referrer, firstUrl: '', analyticsSource: info.sampleSource, sourceData1: undefined }),
    }));

  return {
    listId,
    hubspotListUrl: `https://app.hubspot.com/contacts/${PORTAL_ID}/objectLists/${listId}/filters`,
    totalInList,
    sampleSize: sample.length,
    recovery,
    landings: landingsOut,
    conversions: conversionsOut,
    referrers: referrersOut,
    contacts: contactsOut,
  };
}

function extractUtmFromUrl(url: string): { utm_source: string; utm_medium: string; utm_campaign: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const s = u.searchParams.get('utm_source') ?? '';
    const m = u.searchParams.get('utm_medium') ?? '';
    const c = u.searchParams.get('utm_campaign') ?? '';
    if (!s && !m && !c) return null;
    return { utm_source: s, utm_medium: m, utm_campaign: c };
  } catch {
    return null;
  }
}

function cleanPath(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    return url.split('?')[0];
  }
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

function topKey(m: Map<string, number>): string {
  let bestKey = '';
  let bestN = -1;
  for (const [k, v] of m) {
    if (v > bestN) { bestN = v; bestKey = k; }
  }
  return bestKey;
}

function classifyRecovery(args: {
  extractedUtm: { utm_source: string; utm_medium: string; utm_campaign: string } | null;
  firstUrl: string;
  conversion: string;
  analyticsSource: string;
}): RecoveryPath {
  if (args.extractedUtm) return 'utm_in_url';
  const offline = args.analyticsSource === 'OFFLINE_SOURCES' || args.analyticsSource === 'OFFLINE';
  if (offline) return 'unrecoverable';
  if (args.firstUrl) return 'lp_known';
  if (args.conversion && args.conversion !== '(sem conversão registrada)') return 'form_known';
  if (args.analyticsSource) return 'analytics_source_only';
  return 'unrecoverable';
}

function recoveryKey(p: RecoveryPath): 'utmInUrl' | 'lpKnown' | 'formKnown' | 'analyticsOnly' | 'unrecoverable' {
  return {
    utm_in_url:             'utmInUrl' as const,
    lp_known:               'lpKnown' as const,
    form_known:             'formKnown' as const,
    analytics_source_only:  'analyticsOnly' as const,
    unrecoverable:          'unrecoverable' as const,
  }[p];
}

// Heurística pra montar utm_campaign a partir do nome do formulário ou landing
function inferCampaignFromConversion(conversion: string, landing: string): string {
  const lower = (conversion + ' ' + landing).toLowerCase();
  if (lower.includes('tbw') || lower.includes('the-best-weekend')) return 'tbw-orgânico';
  if (lower.includes('tbs') || lower.includes('the-best-speaker')) return 'tbs-orgânico';
  if (lower.includes('drops')) return 'drops-orgânico';
  if (lower.includes('conference')) return 'conference-orgânico';
  if (lower.includes('palestrante')) return 'palestrantes-orgânico';
  if (lower.includes('basa') || lower.includes('basaglia')) return 'partner-basa';
  if (lower.includes('cortella')) return 'palestrante-cortella';
  if (lower.includes('partner') || lower.includes('parceiro')) return 'parceiros-orgânico';
  if (lower.includes('meeting') || lower.includes('reuniao')) return 'meetings-sales';
  return 'orgânico-site';
}

export const _testExports = { extractUtmFromUrl, classifyRecovery, inferCampaignFromConversion };
