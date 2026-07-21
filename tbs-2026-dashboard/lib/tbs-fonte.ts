import type { HsSearchBody } from './hubspot';

// Origem de entrada TBS. Prioridade:
// 1) Comunidade (utm_source = comunidade)
// 2) Fonte [TBS] quando mapeia a uma das origens-alvo — incl. regra Organic Social + WhatsApp → WhatsApp
// 3) Fallback por UTM (utm_medium/utm_source) — segue de onde converteu
// 4) Fallback por hs_analytics_source (DIRECT_TRAFFIC → Direto, SOCIAL_MEDIA → Social Orgânico, etc.)

export const FONTE_PROP = 'fonte__tbs_';
export const FONTE_DET1_PROP = 'detalhamento_1_da_fonte__tbs_';
export const UTM_SOURCE_PROP = 'utm_source_tbs';
export const UTM_MEDIUM_PROP = 'utm_medium_tbs';
export const UTM_TERM_PROP = 'utm_term_tbs';
export const UTM_CONTENT_PROP = 'utm_content_tbs';
export const ANALYTICS_SOURCE_PROP = 'hs_analytics_source';

// Campanha Otaviano Costa, marcada no utm_term. Dois formatos:
//  • tag curta com o token "ota" (ex.: linktree-ota-0806, story-ota-0806) — o token isola, não pega "story-0706";
//  • nome por extenso "otaviano" no termo (ex.: redes-otavianocosta) — pego por substring específico.
export const OTAVIANO_TERM_TOKEN = 'ota';
export const OTAVIANO_TERM_NAME = 'otaviano';

export type FonteKey =
  | 'otaviano'
  | 'tiktok'
  | 'email'
  | 'whatsapp'
  | 'paid_social'
  | 'organic_social'
  | 'linktree_bio'
  | 'paid_search'
  | 'seo'
  | 'comunidade'
  | 'referral'
  | 'offline'
  | 'direto'
  | 'untracked';

// Otaviano e Karnal NÃO são canais próprios — são overlays (Influência) detectados por utm_term/utm_content.
// O tráfego orgânico deles cai no canal real (Social Orgânico etc.); o pago segue em Social Pago.
export const FONTE_BUCKETS: { key: FonteKey; label: string; color: string }[] = [
  { key: 'tiktok', label: 'TikTok', color: '#F43F5E' },
  { key: 'email', label: 'Email marketing', color: '#F08220' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#22C55E' },
  { key: 'paid_social', label: 'Social Pago', color: '#FF6B1A' },
  { key: 'organic_social', label: 'Social Orgânico', color: '#FFA52A' },
  { key: 'linktree_bio', label: 'Linktree / Bio', color: '#14B8A6' },
  { key: 'paid_search', label: 'Pesquisa Paga', color: '#6BA3B5' },
  { key: 'seo', label: 'Busca Orgânica (SEO)', color: '#38BDF8' },
  { key: 'comunidade', label: 'Comunidade', color: '#8B5CF6' },
  { key: 'referral', label: 'Referral', color: '#F472B6' },
  { key: 'offline', label: 'Offline', color: '#B08968' },
  { key: 'direto', label: 'Direto', color: '#9090A8' },
  { key: 'untracked', label: 'Não rastreado / sem fonte', color: '#3A3A48' },
];

// Valores canônicos no HubSpot.
const FONTE_EMAIL = 'Email Marketing';
const FONTE_PAID_SOCIAL = 'Paid Social';
const FONTE_PAID_SEARCH = 'Paid Search';
const FONTE_ORGANIC_SOCIAL = 'Organic Social';
const FONTE_SEO = 'Organic Search';
const FONTE_OFFLINE = 'Offline Sources';
const FONTE_DIRECT = 'Direct Traffic';
const DET_WHATSAPP = 'WhatsApp';
const COMUNIDADE = 'comunidade';
const LINKTREE = 'linktree';

// utm_medium usados no fallback.
const MED_PAID_SOCIAL = ['paid_social'];
const MED_PAID_SEARCH = ['paid_search', 'cpc', 'ppc'];
const MED_EMAIL = ['email'];
const MED_ORGANIC_SOCIAL = ['social', 'organic', 'organic_social'];

export function fonteOf(fonte?: string, det1?: string, utmSource?: string, utmMedium?: string, analyticsSource?: string, utmTerm?: string): FonteKey {
  // Otaviano deixou de ser canal próprio — agora é overlay (Influência), detectado por utm_term no data.ts.
  // O tráfego dele classifica pelo canal real (Social Orgânico, etc.). utmTerm fica reservado p/ assinatura.
  void utmTerm;
  const src = (utmSource || '').trim().toLowerCase();
  if (src.includes(COMUNIDADE)) return 'comunidade';
  if (src.includes('tiktok')) return 'tiktok'; // tráfego do TikTok (utm_source=tiktok)
  if (src.includes(LINKTREE)) return 'linktree_bio'; // link da bio (Instagram/redes)

  const fl = (fonte || '').trim().toLowerCase();
  const d1 = (det1 || '').trim().toLowerCase();

  // 2) Fonte [TBS] — inclui variantes PT/hífen vistas na base
  if (fl === 'email marketing' || fl === 'e-mail marketing' || fl === 'email') return 'email';
  if (fl === 'paid social' || fl === 'social pago') return 'paid_social';
  if (fl === 'paid search') return 'paid_search';
  if (fl === 'organic social') return d1.includes('whatsapp') ? 'whatsapp' : 'organic_social';
  if (fl === 'organic search') return 'seo';
  if (fl === 'offline sources' || fl === 'offline') return 'offline';
  if (fl.includes('referral')) return 'referral'; // referrals, ai referrals
  if (fl === 'direct traffic') return 'direto';

  // 3) Fallback por UTM
  const med = (utmMedium || '').trim().toLowerCase();
  if (src.includes('whatsapp')) return 'whatsapp';
  if (MED_PAID_SOCIAL.includes(med)) return 'paid_social';
  if (MED_PAID_SEARCH.includes(med)) return 'paid_search';
  if (MED_EMAIL.includes(med)) return 'email';
  if (MED_ORGANIC_SOCIAL.includes(med)) return 'organic_social';

  // 4) Fallback por hs_analytics_source (de onde converteu)
  const asrc = (analyticsSource || '').trim().toUpperCase();
  if (asrc === 'PAID_SOCIAL') return 'paid_social';
  if (asrc === 'PAID_SEARCH') return 'paid_search';
  if (asrc === 'EMAIL_MARKETING' || asrc === 'OTHER_CAMPAIGNS') return 'email';
  if (asrc === 'SOCIAL_MEDIA') return 'organic_social';
  if (asrc === 'ORGANIC_SEARCH') return 'seo';
  if (asrc === 'OFFLINE') return 'offline';
  if (asrc === 'REFERRALS') return 'referral';
  if (asrc === 'DIRECT_TRAFFIC' || fl === 'direct traffic') return 'direto';

  return 'untracked';
}

// filterGroups do drill por bucket — espelha fonteOf (limite do HubSpot: ≤5 grupos, ≤18 filtros no total).
// O escopo (inscrito + piso + não-comunidade) repete em cada grupo, então mantemos poucos grupos.
// Os grupos de fallback (utm/analytics) não re-excluem a fonte: como fonte é derivada do UTM, raramente
// divergem; a contagem exata (precedência) fica no fonteOf.
export function fonteFilterGroups(key: FonteKey, scope: HsSearchBody['filterGroups'][number]['filters']): HsSearchBody['filterGroups'] {
  const notComunidade = { propertyName: UTM_SOURCE_PROP, operator: 'NOT_CONTAINS_TOKEN', value: COMUNIDADE };
  const s = [...scope, notComunidade];
  const utmMediumEmpty = { propertyName: UTM_MEDIUM_PROP, operator: 'NOT_HAS_PROPERTY' };
  const g = (extra: HsSearchBody['filterGroups'][number]['filters']) => ({ filters: [...extra, ...s] });
  // Fallback analytics_source só quando não há utm_medium (respeita precedência do UTM).
  const analyticsG = (asrc: string[]) => g([utmMediumEmpty, { propertyName: ANALYTICS_SOURCE_PROP, operator: 'IN', values: asrc }]);

  switch (key) {
    case 'otaviano':
      // Campanha Otaviano: token "ota" (linktree-ota-0806) OU termo com "otaviano" (redes-otavianocosta).
      // Dois grupos OR — o wildcard *otaviano* casa o nome por extenso em qualquer token.
      return [
        { filters: [{ propertyName: UTM_TERM_PROP, operator: 'CONTAINS_TOKEN', value: OTAVIANO_TERM_TOKEN }, ...scope] },
        { filters: [{ propertyName: UTM_TERM_PROP, operator: 'CONTAINS_TOKEN', value: `*${OTAVIANO_TERM_NAME}*` }, ...scope] },
      ];
    case 'tiktok':
      // Tráfego do TikTok: utm_source = tiktok.
      return [{ filters: [{ propertyName: UTM_SOURCE_PROP, operator: 'CONTAINS_TOKEN', value: 'tiktok' }, ...scope] }];
    case 'comunidade':
      return [{ filters: [{ propertyName: UTM_SOURCE_PROP, operator: 'CONTAINS_TOKEN', value: COMUNIDADE }, ...scope] }];
    case 'email':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'IN', values: [FONTE_EMAIL, 'Email'] }]),
        g([{ propertyName: UTM_MEDIUM_PROP, operator: 'IN', values: MED_EMAIL }]),
        analyticsG(['EMAIL_MARKETING', 'OTHER_CAMPAIGNS']),
      ];
    case 'paid_social':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_PAID_SOCIAL }]),
        g([{ propertyName: UTM_MEDIUM_PROP, operator: 'IN', values: MED_PAID_SOCIAL }]),
        analyticsG(['PAID_SOCIAL']),
      ];
    case 'paid_search':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_PAID_SEARCH }]),
        g([{ propertyName: UTM_MEDIUM_PROP, operator: 'IN', values: MED_PAID_SEARCH }]),
        analyticsG(['PAID_SEARCH']),
      ];
    case 'whatsapp':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_ORGANIC_SOCIAL }, { propertyName: FONTE_DET1_PROP, operator: 'CONTAINS_TOKEN', value: DET_WHATSAPP }]),
        g([{ propertyName: UTM_SOURCE_PROP, operator: 'CONTAINS_TOKEN', value: 'whatsapp' }]),
      ];
    case 'organic_social':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_ORGANIC_SOCIAL }, { propertyName: FONTE_DET1_PROP, operator: 'NOT_CONTAINS_TOKEN', value: DET_WHATSAPP }]),
        g([{ propertyName: UTM_MEDIUM_PROP, operator: 'IN', values: MED_ORGANIC_SOCIAL }]),
        analyticsG(['SOCIAL_MEDIA']),
      ];
    case 'linktree_bio':
      // tráfego de link da bio (utm_source = linktree) — independe da fonte.
      return [{ filters: [{ propertyName: UTM_SOURCE_PROP, operator: 'CONTAINS_TOKEN', value: LINKTREE }, ...scope] }];
    case 'seo':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_SEO }]),
        analyticsG(['ORGANIC_SEARCH']),
      ];
    case 'offline':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_OFFLINE }]),
        analyticsG(['OFFLINE']),
      ];
    case 'referral':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'CONTAINS_TOKEN', value: 'referrals' }]),
        analyticsG(['REFERRALS']),
      ];
    case 'direto':
      return [
        g([{ propertyName: FONTE_PROP, operator: 'EQ', value: FONTE_DIRECT }, utmMediumEmpty]),
        analyticsG(['DIRECT_TRAFFIC']),
      ];
    case 'untracked':
      // resíduo real: sem fonte preenchida ou fonte = "Unassigned", fora dos demais sinais.
      return [
        { filters: [{ propertyName: FONTE_PROP, operator: 'NOT_HAS_PROPERTY' }, ...s] },
        { filters: [{ propertyName: FONTE_PROP, operator: 'EQ', value: 'Unassigned' }, ...s] },
      ];
  }
}
