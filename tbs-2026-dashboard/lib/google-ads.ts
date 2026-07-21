import { unstable_cache } from 'next/cache';

// Integração Google Ads (Google Ads API) — gasto + cliques + campanhas da conta [B2C] The Best Speaker.
// Liga quando TODAS estiverem nas env vars:
//   GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN
//   GOOGLE_ADS_CUSTOMER_ID (default = conta TBS), GOOGLE_ADS_LOGIN_CUSTOMER_ID (opcional, se via MCC).
// Sem OAuth completo, o ROI usa o campo manual do Google.

export type GoogleCampaign = { name: string; spend: number };
export type GoogleAdsData = {
  configured: boolean;
  error?: string;
  totalSpend: number;
  clicks: number;
  impressions: number;
  campaigns: GoogleCampaign[];
  daily: { date: string; spend: number }[]; // gasto por dia (a partir do lançamento) — pra somar com o Meta no Pace
};

const EMPTY: GoogleAdsData = { configured: false, totalSpend: 0, clicks: 0, impressions: 0, campaigns: [], daily: [] };
// Mesma janela do Meta (META_DAILY_SINCE) — o "Investido real" do Pace soma Meta+Google desde o lançamento.
const DAILY_SINCE = process.env.META_DAILY_SINCE || '2026-06-01';
// v20 foi descontinuada pela Google ("Version v20 is deprecated. Requests to this version will be
// blocked.") — era a causa real do google.configured=false em produção (não o range de datas).
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v21';
const clean = (id?: string) => (id || '').replace(/-/g, '').trim();

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`OAuth: ${data.error_description || data.error || res.status}`);
  return data.access_token as string;
}

async function fetchGoogle(): Promise<GoogleAdsData> {
  const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = clean(process.env.GOOGLE_ADS_CUSTOMER_ID || '8649559356');
  if (!dev || !clientId || !clientSecret || !refreshToken) return EMPTY;

  try {
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': dev,
      'Content-Type': 'application/json',
    };
    const loginCid = clean(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
    if (loginCid) headers['login-customer-id'] = loginCid;

    // Campanhas a partir de 01/03/2026 (campanha 2026). Override via env.
    // "until" NÃO pode ser data futura — a Google Ads API rejeita segments.date BETWEEN com fim no futuro
    // ("Request contains an invalid argument"). Antes o default era '2026-12-31' (fixo), que já nasceu no
    // futuro e quebrava a integração inteira (google.configured sempre false, contribuição real sempre R$0).
    const since = process.env.GOOGLE_ADS_SINCE || '2026-03-01';
    const until = process.env.GOOGLE_ADS_UNTIL || new Date().toISOString().slice(0, 10);
    const searchUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:search`;
    const query = `SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'`;
    // Gasto POR DIA (mesma janela do Meta) — pra somar com o Meta no "Investido real" do Pace.
    const dailyQuery = `SELECT campaign.name, metrics.cost_micros, segments.date FROM campaign WHERE segments.date BETWEEN '${DAILY_SINCE}' AND '${until}'`;
    const [res, dailyRes] = await Promise.all([
      fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }), cache: 'no-store' }),
      fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query: dailyQuery }), cache: 'no-store' }),
    ]);
    const data = await res.json();
    const dailyData = await dailyRes.json();
    if (!res.ok) throw new Error(JSON.stringify(data?.error ?? data).slice(0, 1500));

    const rows: { campaign?: { name?: string }; metrics?: { costMicros?: string; clicks?: string; impressions?: string } }[] = data.results || [];
    // Só campanhas TBS reais (exclui demos tipo "App - ... WW ROAS"). Override via GOOGLE_ADS_CAMPAIGN_FILTER.
    const NAME_RE = new RegExp(process.env.GOOGLE_ADS_CAMPAIGN_FILTER || 'speaker|b2c|orat[oó]ria|palestra|tbs|the best', 'i');
    const matched = rows.filter((r) => NAME_RE.test(r.campaign?.name || ''));
    const campaigns: GoogleCampaign[] = matched
      .map((r) => ({ name: r.campaign?.name || '(sem nome)', spend: Number(r.metrics?.costMicros || 0) / 1e6 }))
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.spend - a.spend);
    const totalSpend = matched.reduce((s, r) => s + Number(r.metrics?.costMicros || 0) / 1e6, 0);
    const clicks = matched.reduce((s, r) => s + Number(r.metrics?.clicks || 0), 0);
    const impressions = matched.reduce((s, r) => s + Number(r.metrics?.impressions || 0), 0);

    const dailyRows: { campaign?: { name?: string }; metrics?: { costMicros?: string }; segments?: { date?: string } }[] = dailyRes.ok ? (dailyData.results || []) : [];
    const byDate = new Map<string, number>();
    for (const r of dailyRows) {
      const date = r.segments?.date;
      if (!date || !NAME_RE.test(r.campaign?.name || '')) continue;
      byDate.set(date, (byDate.get(date) || 0) + Number(r.metrics?.costMicros || 0) / 1e6);
    }
    const daily = [...byDate.entries()].map(([date, spend]) => ({ date, spend })).sort((a, b) => a.date.localeCompare(b.date));

    return { configured: true, totalSpend, clicks, impressions, campaigns, daily };
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : String(e) };
  }
}

export const getGoogleAds = unstable_cache(fetchGoogle, ['google-ads'], { tags: ['dashboard'], revalidate: 300 });
