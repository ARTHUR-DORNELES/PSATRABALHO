import type { Dataset } from './data';

export type InsightTone = 'positive' | 'negative' | 'warning';

export type Insight = {
  tone: InsightTone;
  headline: string;
  detail: string;
  action?: string;
};

const SOURCE_TRANSLATIONS: Record<string, { canonical: string; reason: string }> = {
  hs_email:        { canonical: 'newsletter', reason: 'gerado pelas tools de email do HubSpot · vai pro grupo Other Campaigns por padrão' },
  ppc_google:      { canonical: 'google',     reason: 'apelido interno · perde agrupamento Pesquisa Paga no HubSpot' },
  adwords:         { canonical: 'google',     reason: 'nome legado · Google rebatizou pra Google Ads em 2018' },
  google_ads:      { canonical: 'google',     reason: 'use só `google` pra bater com o agrupamento automático Pesquisa Paga' },
  ig:              { canonical: 'meta',       reason: 'abreviação · use `meta` pro agrupamento Social Media' },
  fb:              { canonical: 'facebook',   reason: 'abreviação · use `facebook` pro agrupamento Social Media' },
  wpp:             { canonical: 'whatsapp',   reason: 'abreviação · use `whatsapp`' },
  chatgpt:         { canonical: 'chatgpt',    reason: 'ChatGPT virou source orgânico relevante · adicionar à lista canônica do padrão' },
  'chatgpt.com':   { canonical: 'chatgpt',    reason: 'inclui domínio · normalizar pra `chatgpt`' },
  'site-institucional': { canonical: 'site',  reason: 'cross-link interno do site · não devia ter UTM (auto-attribution)' },
};

const MEDIUM_TRANSLATIONS: Record<string, { canonical: string; reason: string }> = {
  ppc:         { canonical: 'cpc',          reason: 'PPC virou sinônimo de CPC · o HubSpot só agrupa Pesquisa Paga em `cpc`' },
  paid:        { canonical: 'paid_social',  reason: 'genérico · use `paid_social` ou `cpc` pra agrupar direito' },
  paid_search: { canonical: 'cpc',          reason: 'sinônimo · padrão GA4/HubSpot é `cpc`' },
  organic:     { canonical: 'social',       reason: 'ambíguo · se for rede social use `social`; se for SEO, não devia ter UTM' },
  bio:         { canonical: 'social',       reason: 'genérico · use `social` (link in bio é mídia social orgânica)' },
  referral:    { canonical: 'social',       reason: 'HubSpot reserva referrals pra detecção automática · use `social` se for canal próprio' },
};

const SUSPICIOUS_CAMPAIGN = /[^a-z0-9\-_]/i;
const HUBSPOT_ID_PREFIX = /^\d{5,}-/;

export function generateInsights(d: Dataset): Insight[] {
  const out: Insight[] = [];
  const total = d.totals.leads;
  const coveragePct = d.coverage.pct;
  const completenessPct = d.completeness.pct;

  // ── Positivos ─────────────────────────────────────────────────
  if (coveragePct >= 0.7) {
    out.push({
      tone: 'positive',
      headline: `Cobertura saudável (${pct(coveragePct)})`,
      detail: `${fmt(d.coverage.withUtm)} de ${fmt(total)} leads com utm_source preenchido — acima da média de mid-funnel.`,
    });
  } else if (coveragePct >= 0.3) {
    out.push({
      tone: 'warning',
      headline: `Cobertura mediana (${pct(coveragePct)})`,
      detail: `${fmt(d.coverage.withUtm)} taggeados · ${fmt(d.coverage.withoutUtm)} sem UTM — recuperando, mas tem buraco grande.`,
      action: 'Priorize o painel "Mapa de buracos" para escolher onde aplicar UTM primeiro.',
    });
  }

  if (completenessPct >= 0.9 && d.completeness.tagged >= 20) {
    out.push({
      tone: 'positive',
      headline: `Quem está taggeado atende a regra (${pct(completenessPct)})`,
      detail: `${d.completeness.complete} de ${d.completeness.tagged} leads na amostra atendem a regra de completude do seu source (organico → só source basta; fb/li/google → source + campaign).`,
    });
  } else if (completenessPct < 0.5 && d.completeness.tagged >= 20) {
    out.push({
      tone: 'negative',
      headline: `Maioria dos taggeados tá incompleta (${pct(completenessPct)})`,
      detail: `${d.completeness.tagged - d.completeness.complete} de ${d.completeness.tagged} têm utm_source mas falta utm_campaign — a regra do source não foi atendida.`,
      action: 'Auditar fluxos que preenchem utm_source sem propagar utm_campaign (forms, integrações, links de bio).',
    });
  }

  const canonicalSources = d.topSources.filter((s) => s.isCanonical).slice(0, 3);
  if (canonicalSources.length >= 2) {
    const names = canonicalSources.map((s) => `\`${s.name}\``).join(', ');
    out.push({
      tone: 'positive',
      headline: `Top sources canônicos: ${names}`,
      detail: 'Esses já agrupam direito nos relatórios automáticos do HubSpot (Pesquisa Paga, Social Media, etc).',
    });
  }

  const cleanestCampaign = d.topCampaigns.find((c) => c.nonStandardCount === 0 && c.count >= 5 && !SUSPICIOUS_CAMPAIGN.test(c.name));
  if (cleanestCampaign) {
    out.push({
      tone: 'positive',
      headline: `Campanha mais limpa: \`${cleanestCampaign.name}\``,
      detail: `${fmt(cleanestCampaign.count)} leads, zero violações de padrão — bom modelo pra replicar nas demais.`,
    });
  }

  // ── Negativos ─────────────────────────────────────────────────
  if (coveragePct < 0.3 && total > 0) {
    out.push({
      tone: 'negative',
      headline: `Cobertura crítica (${pct(coveragePct)})`,
      detail: `${fmt(d.coverage.withoutUtm)} de ${fmt(total)} leads chegaram sem nenhuma UTM. Toda essa origem está sendo classificada como "Direct" ou "Other Campaigns" no HubSpot — você perde atribuição de canal.`,
      action: 'Cada linha do "Mapa de buracos" é um ponto de publicação que precisa ser corrigido. Comece pelo top 3.',
    });
  }

  for (const s of d.topSources.filter((x) => !x.isCanonical).slice(0, 3)) {
    const t = SOURCE_TRANSLATIONS[s.name];
    if (t) {
      out.push({
        tone: 'negative',
        headline: `Source \`${s.name}\` aparece ${fmt(s.count)}x — não é canônico`,
        detail: t.reason,
        action: `Padronizar pra \`${t.canonical}\` e atualizar quem ainda publica com a grafia antiga.`,
      });
    } else {
      out.push({
        tone: 'warning',
        headline: `Source \`${s.name}\` (${fmt(s.count)}) fora do padrão`,
        detail: 'Não está na lista canônica (meta/facebook/instagram/linkedin/google/whatsapp/youtube/tiktok/email/newsletter).',
        action: 'Decida: ou adiciona ao padrão e atualiza a planilha, ou renomeia pra um nome canônico existente.',
      });
    }
  }

  for (const m of d.topMediums.filter((x) => !x.isValid).slice(0, 2)) {
    const t = MEDIUM_TRANSLATIONS[m.name];
    if (t) {
      out.push({
        tone: 'negative',
        headline: `Medium \`${m.name}\` aparece ${fmt(m.count)}x — inválido`,
        detail: t.reason,
        action: `Trocar pra \`${t.canonical}\` em todos os links que ainda usam essa grafia.`,
      });
    } else {
      out.push({
        tone: 'warning',
        headline: `Medium \`${m.name}\` (${fmt(m.count)}) fora do padrão`,
        detail: 'Os únicos mediums válidos são social, paid_social, cpc, email.',
      });
    }
  }

  for (const c of d.topCampaigns.slice(0, 5)) {
    if (SUSPICIOUS_CAMPAIGN.test(c.name) || HUBSPOT_ID_PREFIX.test(c.name)) {
      const issues: string[] = [];
      if (HUBSPOT_ID_PREFIX.test(c.name)) issues.push('prefixo de ID HubSpot');
      if (/[\s|]/.test(c.name)) issues.push('contém espaço ou pipe (quebra query string)');
      if (/[^\x00-\x7F]/.test(c.name)) issues.push('contém emoji/caractere não-ASCII');
      out.push({
        tone: 'negative',
        headline: `Campanha \`${c.name}\` (${fmt(c.count)}) tem nome problemático`,
        detail: issues.join(' · '),
        action: 'Padronizar pra kebab-case ASCII (ex.: `tbs-2026-aquece`) e migrar com workflow no HubSpot.',
      });
      break; // só o pior por enquanto
    }
  }

  if (d.duplicateCampaigns.length > 0) {
    const first = d.duplicateCampaigns[0];
    out.push({
      tone: 'warning',
      headline: `${d.duplicateCampaigns.length} campanha(s) duplicadas detectadas`,
      detail: `Ex.: slug \`${first.slug}\` aparece como ${first.variants.map((v) => `\`${v.name}\``).join(' e ')} — fragmenta o relatório.`,
      action: 'Unificar na grafia oficial e merger os dois grupos via workflow.',
    });
  }

  if (d.untaggedLandings.length > 0) {
    const top = d.untaggedLandings[0];
    out.push({
      tone: 'negative',
      headline: `Buraco #1: ${cleanLanding(top.landing)} via ${top.referrer}`,
      detail: `${fmt(top.count)} leads sem UTM apenas dessa combinação.`,
      action: top.suggested
        ? `Aplicar UTM \`${top.suggested.utm_source}/${top.suggested.utm_medium}\` em: ${top.suggested.applyAt}`
        : 'Investigar manualmente o ponto de origem.',
    });
  }

  // Ordena: negativos primeiro, depois warnings, depois positivos
  const order: Record<InsightTone, number> = { negative: 0, warning: 1, positive: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }
function fmt(n: number): string { return new Intl.NumberFormat('pt-BR').format(n); }
function cleanLanding(url: string): string {
  try { return new URL(url).pathname || '/'; } catch { return url; }
}
