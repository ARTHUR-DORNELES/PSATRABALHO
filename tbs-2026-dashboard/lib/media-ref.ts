import { unstable_cache } from 'next/cache';

// Fonte do "Investido real" da Trajetória dia a dia (Pace): em vez de consultar o Graph API / Google Ads
// API diretamente (lib/meta-ads.ts / lib/google-ads.ts, usados pelas OUTRAS abas — School, ROAS por hora),
// puxa os gastos diários direto do painel de referência que a diretoria acompanha (tbs-meta-ads.vercel.app,
// "painel Gustavo"). Decisão 08/07/2026: calibrar 1:1 com esse painel em vez de tentar bater os dois de
// fontes independentes — mesmo sabendo que esse painel tem um gap de dados conhecido (26-30/06 some do
// Meta lá, confirmado via API deles) que a nossa consulta direta ao Graph não tem.
const REF_BASE = 'https://tbs-meta-ads.vercel.app';

export type RefAdsDaily = {
  meta: { date: string; spend: number }[];
  google: { date: string; spend: number }[];
  metaError?: string;
  googleError?: string;
};

const EMPTY: RefAdsDaily = { meta: [], google: [] };

async function fetchRefAds(): Promise<RefAdsDaily> {
  const [metaJson, googleJson] = await Promise.all([
    fetch(`${REF_BASE}/api/meta/insights?date_preset=maximum`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => ({ __error: e instanceof Error ? e.message : String(e) })),
    fetch(`${REF_BASE}/api/google/insights?date_preset=maximum`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => ({ __error: e instanceof Error ? e.message : String(e) })),
  ]);

  const meta = Array.isArray(metaJson?.data)
    ? metaJson.data
        .map((d: { date_start?: string; spend?: string }) => ({ date: d.date_start || '', spend: parseFloat(d.spend || '0') }))
        .filter((d: { date: string }) => d.date)
    : [];
  const google = Array.isArray(googleJson?.data)
    ? googleJson.data
        .map((d: { date?: string; spend?: number }) => ({ date: d.date || '', spend: Number(d.spend || 0) }))
        .filter((d: { date: string }) => d.date)
    : [];

  return { meta, google, metaError: metaJson?.__error, googleError: googleJson?.__error };
}

export const getRefAdsDaily = unstable_cache(fetchRefAds, ['ref-ads-daily'], { tags: ['dashboard'], revalidate: 300 });
export { EMPTY as EMPTY_REF_ADS };
