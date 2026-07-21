import crypto from 'crypto';
import { unstable_cache } from 'next/cache';

// Integração GA4 (Data API) via service account — sem dependência externa.
// Liga automaticamente quando GA4_PROPERTY_ID e GA4_SA_KEY estiverem nas env vars da Vercel.
// GA4_SA_KEY = conteúdo JSON da chave da conta de serviço (colar o arquivo inteiro).

export type Ga4Data = {
  configured: boolean;
  error?: string;
  totalPageviews: number;
  daily: { date: string; pageviews: number }[];
  sources: { label: string; sessions: number }[];
};

const EMPTY: Ga4Data = { configured: false, totalPageviews: 0, daily: [], sources: [] };
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const PAGE_PATH_MATCH = '/inscricoes';
const START_DATE = '2026-06-01';

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(saKeyRaw: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const key = JSON.parse(saKeyRaw) as { client_email: string; private_key: string; token_uri?: string };
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(key.private_key);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    cache: 'no-store',
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) throw new Error(`GA4 token error: ${JSON.stringify(data)}`);
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

type GaRow = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };

async function runReport(token: string, propertyId: string, body: unknown): Promise<{ rows?: GaRow[] }> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 runReport ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const pagePathFilter = {
  filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: PAGE_PATH_MATCH } },
};

async function fetchGa4(): Promise<Ga4Data> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const saKey = process.env.GA4_SA_KEY;
  if (!propertyId || !saKey) return EMPTY;

  try {
    const token = await getAccessToken(saKey);
    const dateRanges = [{ startDate: START_DATE, endDate: 'today' }];

    const dailyRes = await runReport(token, propertyId, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: pagePathFilter,
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    const daily = (dailyRes.rows || []).map((r) => {
      const d = r.dimensionValues[0].value; // YYYYMMDD
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, pageviews: Number(r.metricValues[0].value) };
    });

    const srcRes = await runReport(token, propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: pagePathFilter,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });
    const sources = (srcRes.rows || []).map((r) => ({ label: r.dimensionValues[0].value, sessions: Number(r.metricValues[0].value) }));

    const totalPageviews = daily.reduce((s, d) => s + d.pageviews, 0);
    return { configured: true, totalPageviews, daily, sources };
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : String(e) };
  }
}

// Cache de 10 min, invalida junto com o botão "Atualizar dados" (tag 'dashboard').
export const getGa4Data = unstable_cache(fetchGa4, ['ga4-pageviews'], { tags: ['dashboard'], revalidate: 60 });
