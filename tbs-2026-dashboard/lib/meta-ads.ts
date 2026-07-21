import { unstable_cache } from 'next/cache';

// Integração Meta Ads (Marketing API) — gasto + campanhas da conta The Best Speaker.
// Liga quando META_ADS_TOKEN estiver nas env vars da Vercel (token de System User com ads_read).
// META_AD_ACCOUNT_ID opcional (default = conta TBS). Sem token, o ROI usa o campo manual.

export type MetaCampaign = { name: string; spend: number };
export type MetaAdsData = {
  configured: boolean;
  error?: string;
  totalSpend: number; // conta inteira (captação + retargeting/"Compras") — usado pelo ROAS/ROI geral
  clicks: number;
  impressions: number;
  campaigns: MetaCampaign[]; // todas as campanhas com gasto
  daily: { date: string; spend: number }[]; // gasto por dia, conta inteira (a partir do lançamento)
  // Só campanhas de CAPTAÇÃO (nome começa com "Inscrições") — comparável ao "deveria" do Pace, que nunca
  // contemplou o orçamento de retargeting/recuperação de carrinho. Usar SÓ no Pace; ROAS/ROI de outras
  // abas (ex.: The Best School) precisa do gasto completo acima, já que retargeting também gera venda.
  captacaoSpend: number;
  captacaoDaily: { date: string; spend: number }[];
  periodStart?: string;
  periodStop?: string;
};

const EMPTY: MetaAdsData = { configured: false, totalSpend: 0, clicks: 0, impressions: 0, campaigns: [], daily: [], captacaoSpend: 0, captacaoDaily: [] };
// Gasto diário a partir do lançamento — base pra quebrar o investido por janela de preço (19,90 vs 29,00).
const META_DAILY_SINCE = process.env.META_DAILY_SINCE || '2026-06-01';
const DEFAULT_ACCOUNT = '940259970860976';
const API_VERSION = 'v21.0';
// Período: a partir de 01/03/2026 (campanha 2026, exclui edição 2024-25). Override via env.
const META_SINCE = process.env.META_SINCE || '2026-03-01';
const META_UNTIL = process.env.META_UNTIL || '2026-12-31'; // Meta capa no dia de hoje automaticamente
const TIME_RANGE = JSON.stringify({ since: META_SINCE, until: META_UNTIL });
// Campanhas de CAPTAÇÃO (geram inscrito novo) — exclui retargeting/recuperação ("Compras Site...").
// Sem "^" de propósito: nomes de campanha às vezes vêm com espaço/caractere invisível no início
// (já vi isso quebrar match ancorado no início) — "inscri" sem âncora é mais robusto e ainda não
// bate em "Compras Site | ..." (as únicas outras campanhas da conta).
const CAPTACAO_RE = new RegExp(process.env.META_CAMPAIGN_FILTER || 'inscri', 'i');

async function fetchMeta(): Promise<MetaAdsData> {
  const token = process.env.META_ADS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID || DEFAULT_ACCOUNT;
  if (!token) return EMPTY;

  const base = `https://graph.facebook.com/${API_VERSION}/act_${account}/insights`;
  try {
    // Total autoritativo (nível conta, todas as campanhas) + quebra por campanha — mesmo período.
    const accountUrl = `${base}?${new URLSearchParams({ fields: 'spend,clicks,impressions', time_range: TIME_RANGE, access_token: token })}`;
    const campaignUrl = `${base}?${new URLSearchParams({ level: 'campaign', fields: 'campaign_name,spend', time_range: TIME_RANGE, limit: '200', access_token: token })}`;
    // Gasto POR DIA, conta inteira (a partir do lançamento) — pra ROAS/ROI geral e janela de preço.
    const dailyUrl = `${base}?${new URLSearchParams({ fields: 'spend', time_increment: '1', time_range: JSON.stringify({ since: META_DAILY_SINCE, until: META_UNTIL }), limit: '400', access_token: token })}`;
    const [accRes, campRes, dailyRes] = await Promise.all([
      fetch(accountUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(campaignUrl, { cache: 'no-store' }).then((r) => r.json()),
      fetch(dailyUrl, { cache: 'no-store' }).then((r) => r.json()),
    ]);
    if (accRes.error) throw new Error(accRes.error.message);

    const accRow = (accRes.data || [])[0] || {};
    const totalSpend = parseFloat(accRow.spend || '0');
    const clicks = parseInt(accRow.clicks || '0', 10);
    const impressions = parseInt(accRow.impressions || '0', 10);
    const campaigns: MetaCampaign[] = (campRes.data || [])
      .map((r: { campaign_name?: string; spend?: string }) => ({ name: r.campaign_name || '(sem nome)', spend: parseFloat(r.spend || '0') }))
      .filter((c: MetaCampaign) => c.spend > 0)
      .sort((a: MetaCampaign, b: MetaCampaign) => b.spend - a.spend);
    const captacaoSpend = campaigns.filter((c) => CAPTACAO_RE.test(c.name.normalize('NFC').trim())).reduce((s, c) => s + c.spend, 0);

    const daily: { date: string; spend: number }[] = (dailyRes.data || [])
      .map((r: { date_start?: string; spend?: string }) => ({ date: r.date_start || '', spend: parseFloat(r.spend || '0') }))
      .filter((d: { date: string }) => d.date);

    // captacaoDaily = daily rateado pela proporção captação/total (evita uma 2ª consulta nível-campanha×dia,
    // que já causou uma falha em produção — se ela desse erro, derrubava a resposta INTEIRA, config incluída).
    // Aproximação: assume que o mix captação/retargeting não varia muito dia a dia. Suficiente pro Pace.
    const captacaoRatio = totalSpend > 0 ? captacaoSpend / totalSpend : 0;
    const captacaoDaily = daily.map((d) => ({ date: d.date, spend: d.spend * captacaoRatio }));

    return { configured: true, totalSpend, clicks, impressions, campaigns, daily, captacaoSpend, captacaoDaily, periodStart: accRow.date_start, periodStop: accRow.date_stop };
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : String(e) };
  }
}

// Cache 5 min (gasto muda devagar). Invalida junto com o "Atualizar dados" (tag 'dashboard').
export const getMetaAds = unstable_cache(fetchMeta, ['meta-ads'], { tags: ['dashboard'], revalidate: 300 });
