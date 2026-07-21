// =====================================================================
// Cliente HubSpot — fetch direto com Private App Token, retry em 429 e
// throttle global (~280ms), no mesmo padrão de tbs-2026-dashboard e
// psa-utm-dashboard.
// =====================================================================
const BASE = "https://api.hubapi.com";
const MIN_INTERVAL_MS = 280;

let lastCall = 0;
async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export function hubspotConfigured(): boolean {
  return !!process.env.HUBSPOT_PRIVATE_APP_TOKEN;
}

function token(): string {
  const t = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!t) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN não configurado.");
  return t;
}

async function hsFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  retries = 5,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 400));
        continue;
      }
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HubSpot ${res.status} em ${path}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
  throw new Error(`HubSpot: esgotou retries em ${path}`);
}

export type HsFilter = { propertyName: string; operator: string; value?: string };
export type HsFilterGroup = { filters: HsFilter[] };

/** Conta objetos que batem com os filtros (search com limit=1, lê `total`). */
export async function hsCount(
  objectType: string,
  filterGroups: HsFilterGroup[],
): Promise<number> {
  const data = await hsFetch<{ total?: number }>(
    `/crm/v3/objects/${objectType}/search`,
    { method: "POST", body: JSON.stringify({ filterGroups, limit: 1 }) },
  );
  return data.total ?? 0;
}

/** Busca com paginação (até `maxPages` páginas de 100). */
export async function hsSearch<T = Record<string, unknown>>(
  objectType: string,
  filterGroups: HsFilterGroup[],
  properties: string[],
  maxPages = 10,
): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const body: Record<string, unknown> = { filterGroups, properties, limit: 100 };
    if (after) body.after = after;
    const data = await hsFetch<{
      results?: T[];
      paging?: { next?: { after?: string } };
    }>(`/crm/v3/objects/${objectType}/search`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    out.push(...(data.results ?? []));
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}
