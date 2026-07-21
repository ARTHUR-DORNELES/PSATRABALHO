const BASE = 'https://api.hubapi.com';

export type HsFilter = {
  propertyName: string;
  operator:
    | 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'BETWEEN'
    | 'IN' | 'NOT_IN'
    | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY'
    | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN';
  value?: string;
  values?: string[];
  highValue?: string;
};

export type HsSearchBody = {
  filterGroups: { filters: HsFilter[] }[];
  properties?: string[];
  limit?: number;
  after?: string;
  sorts?: { propertyName: string; direction: 'ASCENDING' | 'DESCENDING' }[];
};

export type HsContact = { id: string; properties: Record<string, string | null> };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function hsSearch(
  token: string,
  objectType: string,
  body: HsSearchBody,
): Promise<{ total: number; results: HsContact[]; paging?: { next?: { after: string } } }> {
  const url = `${BASE}/crm/v3/objects/${objectType}/search`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 500 * 2 ** attempt);
      await sleep(wait);
      lastErr = new Error(`HubSpot ${res.status}`);
      continue;
    }
    throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
  }
  throw lastErr ?? new Error('HubSpot retry exhausted');
}

export async function hsCount(token: string, body: HsSearchBody, objectType: string = 'contacts'): Promise<number> {
  const data = await hsSearch(token, objectType, { ...body, limit: 1, properties: [] });
  return data.total;
}

type ListMembership = { recordId: string; membershipTimestamp?: string };
type ListMembershipsPage = { results: ListMembership[]; paging?: { next?: { after: string } }; total?: number };

export async function hsListMembershipsCount(token: string, listId: string): Promise<number> {
  const url = `${BASE}/crm/v3/lists/${listId}/memberships?count=true&limit=1`;
  const res = await fetchWithRetry(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HubSpot list ${listId} count ${res.status}: ${await res.text()}`);
  const data = await res.json() as ListMembershipsPage;
  return data.total ?? data.results?.length ?? 0;
}

export async function hsListMembershipIds(token: string, listId: string, maxIds = 500): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({ limit: '100' });
    if (after) params.set('after', after);
    const url = `${BASE}/crm/v3/lists/${listId}/memberships?${params}`;
    const res = await fetchWithRetry(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HubSpot list ${listId} memberships ${res.status}: ${await res.text()}`);
    const data = await res.json() as ListMembershipsPage;
    for (const m of data.results ?? []) ids.push(m.recordId);
    after = data.paging?.next?.after;
    if (!after || ids.length >= maxIds) break;
    await sleep(220);
  }
  return ids.slice(0, maxIds);
}

export async function hsBatchRead(
  token: string,
  objectType: string,
  ids: string[],
  properties: string[],
): Promise<HsContact[]> {
  if (ids.length === 0) return [];
  const out: HsContact[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100);
    const res = await fetchWithRetry(`${BASE}/crm/v3/objects/${objectType}/batch/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: slice.map((id) => ({ id })), properties }),
    });
    if (!res.ok) throw new Error(`HubSpot batch read ${res.status}: ${await res.text()}`);
    const data = await res.json() as { results: HsContact[] };
    out.push(...(data.results ?? []));
    if (i + 100 < ids.length) await sleep(220);
  }
  return out;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { ...init, cache: 'no-store' });
    if (res.ok) return res;
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 500 * 2 ** attempt);
      await sleep(wait);
      continue;
    }
    return res; // non-retryable, caller decides
  }
  // last attempt
  return fetch(url, { ...init, cache: 'no-store' });
}

export async function hsFetchAll(
  token: string,
  body: HsSearchBody,
  maxPages = 5,
  objectType: string = 'contacts',
): Promise<HsContact[]> {
  const out: HsContact[] = [];
  let after: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await hsSearch(token, objectType, { ...body, after, limit: 100 });
    out.push(...page.results);
    after = page.paging?.next?.after;
    if (!after) break;
    await sleep(220); // HubSpot search: ~5 req/sec por portal
  }
  return out;
}
