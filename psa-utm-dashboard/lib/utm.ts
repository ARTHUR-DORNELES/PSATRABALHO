// Regras do padrão PSA — espelha a planilha "UTMS - PADRÃO HUBSPOT".
// O HubSpot só agrupa direito quando medium e source seguem essa lista.

export const VALID_MEDIUMS = ['social', 'paid_social', 'cpc', 'email'] as const;
export type ValidMedium = (typeof VALID_MEDIUMS)[number];

export const CANONICAL_SOURCES = [
  'meta', 'facebook', 'instagram', 'linkedin', 'google', 'whatsapp',
  'youtube', 'tiktok', 'email', 'newsletter',
] as const;

const SOURCE_SET = new Set<string>(CANONICAL_SOURCES);
const MEDIUM_SET = new Set<string>(VALID_MEDIUMS);

export type UtmFields = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

export type UtmStatus =
  | 'missing'      // utm_source vazio = sem nenhuma UTM
  | 'incomplete'   // tem utm_source mas falta o que a regra do source pede
  | 'complete';    // tem o que a regra do source exige

// Mantido por compatibilidade com código antigo (insights, etc).
// 'standard' === 'complete', 'partial'/'non_standard' === 'incomplete'.
export type UtmStatusLegacy = UtmStatus | 'partial' | 'non_standard' | 'standard';

export function normalize(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

// ─── Regras de completude por source ──────────────────────────────────────
// O lead só conta como "completo" se atender o requisito do seu utm_source.
// Cada regra lista quais campos UTM precisam estar preenchidos.
export type CompletenessRule = {
  source: string;
  requires: ('utm_source' | 'utm_medium' | 'utm_campaign')[];
  label?: string;
};

// Regras explícitas conforme diretrizes do MKT OPS PSA (2026-05-20).
export const COMPLETENESS_RULES: CompletenessRule[] = [
  // Orgânico: só ter `utm_source` preenchido já basta — não tem campanha por trás.
  { source: 'organico', requires: ['utm_source'], label: 'Tráfego orgânico (só source basta)' },
  { source: 'organic',  requires: ['utm_source'], label: 'Tráfego orgânico (alias EN)' },

  // Paid/principais: precisam de source + campaign (medium não é obrigatório pra completude).
  { source: 'facebook', requires: ['utm_source', 'utm_campaign'], label: 'Source + Campaign' },
  { source: 'linkedin', requires: ['utm_source', 'utm_campaign'], label: 'Source + Campaign' },
  { source: 'google',   requires: ['utm_source', 'utm_campaign'], label: 'Source + Campaign' },
];

// Default conservador pra qualquer source não listado acima
// (meta, instagram, whatsapp, youtube, tiktok, email, newsletter, etc.).
export const DEFAULT_COMPLETENESS: CompletenessRule = {
  source: '(qualquer outro)',
  requires: ['utm_source', 'utm_campaign'],
  label: 'Default: Source + Campaign',
};

export function getCompletenessRule(source: string): CompletenessRule {
  const s = normalize(source);
  const rule = COMPLETENESS_RULES.find((r) => r.source === s);
  return rule ?? DEFAULT_COMPLETENESS;
}

export function classifyUtm(u: UtmFields): UtmStatus {
  const s = normalize(u.utm_source);
  // Regra 3: utm_source vazio = sem nenhuma UTM
  if (!s) return 'missing';

  // Regras 1 e 2: aplica o requisito do source específico
  const rule = getCompletenessRule(s);
  for (const field of rule.requires) {
    const v = normalize(u[field as keyof UtmFields]);
    if (!v) return 'incomplete';
  }
  return 'complete';
}

// Verifica se source é canônico (separado do conceito de completude).
export function isCanonicalSource(source: string): boolean {
  return SOURCE_SET.has(normalize(source));
}

// Verifica se medium é válido (separado do conceito de completude).
export function isValidMediumValue(medium: string): boolean {
  return MEDIUM_SET.has(normalize(medium));
}

// Inferência: dado um referrer e/ou landing, sugere uma UTM no padrão.
export type SuggestedUtm = {
  utm_source: string;
  utm_medium: ValidMedium;
  utm_campaign?: string;
  reason: string;
  applyAt: string; // dica de onde aplicar
};

const REFERRER_RULES: { match: RegExp; source: string; medium: ValidMedium; applyAt: string }[] = [
  { match: /(^|\.)instagram\.com/i,  source: 'meta',     medium: 'social',      applyAt: 'Bio do Instagram / link in bio' },
  { match: /l\.instagram\.com/i,     source: 'meta',     medium: 'social',      applyAt: 'Bio do Instagram / link in bio' },
  { match: /(^|\.)facebook\.com/i,   source: 'facebook', medium: 'social',      applyAt: 'Posts orgânicos no Facebook / Página' },
  { match: /(^|\.)l\.facebook\.com/i,source: 'facebook', medium: 'social',      applyAt: 'Posts orgânicos no Facebook / Página' },
  { match: /(^|\.)linkedin\.com/i,   source: 'linkedin', medium: 'social',      applyAt: 'Posts orgânicos no LinkedIn / Company page' },
  { match: /(^|\.)lnkd\.in/i,        source: 'linkedin', medium: 'social',      applyAt: 'Posts orgânicos no LinkedIn / Company page' },
  { match: /(^|\.)youtube\.com/i,    source: 'youtube',  medium: 'social',      applyAt: 'Descrição dos vídeos no YouTube Studio' },
  { match: /youtu\.be/i,             source: 'youtube',  medium: 'social',      applyAt: 'Descrição dos vídeos no YouTube Studio' },
  { match: /(^|\.)whatsapp\.com/i,   source: 'whatsapp', medium: 'social',      applyAt: 'Mensagens/grupos de WhatsApp · template de envio' },
  { match: /wa\.me/i,                source: 'whatsapp', medium: 'social',      applyAt: 'Mensagens/grupos de WhatsApp · template de envio' },
  { match: /(^|\.)tiktok\.com/i,     source: 'tiktok',   medium: 'social',      applyAt: 'Bio do TikTok / descrições' },
  { match: /(^|\.)t\.co/i,           source: 'twitter',  medium: 'social',      applyAt: 'Bio/posts no X (Twitter)' },
  { match: /(^|\.)google\./i,        source: 'google',   medium: 'cpc',         applyAt: 'Campanhas Google Ads · URL final do anúncio' },
  { match: /(^|\.)bing\.com/i,       source: 'bing',     medium: 'cpc',         applyAt: 'Campanhas Microsoft Ads · URL final' },
];

const ORIGINAL_SOURCE_RULES: Record<string, { source: string; medium: ValidMedium; applyAt: string }> = {
  ORGANIC_SEARCH:   { source: 'google',  medium: 'cpc',    applyAt: 'Resultados orgânicos · não taggeáveis. Se for Ads, taggear na URL final do anúncio.' },
  PAID_SEARCH:      { source: 'google',  medium: 'cpc',    applyAt: 'Campanhas Google Ads · URL final do anúncio' },
  PAID_SOCIAL:      { source: 'meta',    medium: 'paid_social', applyAt: 'Meta Ads · URL final do anúncio' },
  SOCIAL_MEDIA:     { source: 'meta',    medium: 'social', applyAt: 'Posts orgânicos · bio · stories destacados' },
  EMAIL_MARKETING:  { source: 'newsletter', medium: 'email', applyAt: 'Templates de email no HubSpot/RD · CTAs' },
  REFERRALS:        { source: 'parceiro', medium: 'social', applyAt: 'Kit de parceiro · landing pages de parceiros · indicações' },
  DIRECT_TRAFFIC:   { source: 'direct',  medium: 'social', applyAt: 'Investigar: provavelmente link compartilhado em WhatsApp/bio sem UTM' },
  OTHER_CAMPAIGNS:  { source: 'outros',  medium: 'social', applyAt: 'Campanhas avulsas · revisar a UTM original' },
  OFFLINE_SOURCES:  { source: 'offline', medium: 'social', applyAt: 'Eventos presenciais · cadastros manuais · não taggeáveis' },
};

export function suggestUtm(args: {
  firstReferrer?: string | null;
  firstUrl?: string | null;
  analyticsSource?: string | null;
  sourceData1?: string | null;
}): SuggestedUtm | null {
  const ref = normalize(args.firstReferrer);
  if (ref) {
    for (const r of REFERRER_RULES) {
      if (r.match.test(ref)) {
        return {
          utm_source: r.source,
          utm_medium: r.medium,
          reason: `Referrer = ${ref}`,
          applyAt: r.applyAt,
        };
      }
    }
  }
  const src = (args.analyticsSource ?? '').toUpperCase();
  if (src && ORIGINAL_SOURCE_RULES[src]) {
    const r = ORIGINAL_SOURCE_RULES[src];
    return {
      utm_source: r.source,
      utm_medium: r.medium,
      reason: `Original source HubSpot = ${src}${args.sourceData1 ? ` · ${args.sourceData1}` : ''}`,
      applyAt: r.applyAt,
    };
  }
  return null;
}

// Detecta duplicatas de campaigns por slug normalizado (tira hífen, underscore, lowercase).
export function campaignSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Tradução source não-canônico → source canônico (com motivo).
export const SOURCE_FIX_MAP: Record<string, { fix: string; why: string }> = {
  hs_email:             { fix: 'newsletter', why: 'Gerado pelas tools de email do HubSpot · cai em Other Campaigns' },
  ppc_google:           { fix: 'google',     why: 'Apelido interno · perde agrupamento Pesquisa Paga' },
  adwords:              { fix: 'google',     why: 'Nome legado · Google rebatizou pra Google Ads em 2018' },
  google_ads:           { fix: 'google',     why: 'Use só `google` pro agrupamento Pesquisa Paga' },
  google_adwords:       { fix: 'google',     why: 'Idem · só `google`' },
  ig:                   { fix: 'meta',       why: 'Abreviação · use `meta` pro Social Media' },
  fb:                   { fix: 'facebook',   why: 'Abreviação · use `facebook`' },
  wpp:                  { fix: 'whatsapp',   why: 'Abreviação · use `whatsapp`' },
  'chatgpt.com':        { fix: 'chatgpt',    why: 'Inclui domínio · só o nome' },
  'site-institucional': { fix: 'site',       why: 'Cross-link interno · idealmente não devia ter UTM' },
  'site_interno':       { fix: 'site',       why: 'Idem · cross-link interno' },
};

export const MEDIUM_FIX_MAP: Record<string, { fix: ValidMedium; why: string }> = {
  ppc:         { fix: 'cpc',         why: 'PPC virou sinônimo de CPC · HubSpot só agrupa Pesquisa Paga em `cpc`' },
  paid:        { fix: 'paid_social', why: 'Genérico · use `paid_social` ou `cpc`' },
  paid_search: { fix: 'cpc',         why: 'Sinônimo · padrão GA4/HubSpot é `cpc`' },
  organic:     { fix: 'social',      why: 'Ambíguo · social orgânico vira `social`' },
  bio:         { fix: 'social',      why: 'Genérico · link in bio é mídia social orgânica' },
  referral:    { fix: 'social',      why: 'HubSpot reserva referrals · use `social` se for canal próprio' },
};

export function fixSource(source: string): { fix: string; why: string } | null {
  return SOURCE_FIX_MAP[source.toLowerCase()] ?? null;
}

export function fixMedium(medium: string): { fix: ValidMedium; why: string } | null {
  return MEDIUM_FIX_MAP[medium.toLowerCase()] ?? null;
}
