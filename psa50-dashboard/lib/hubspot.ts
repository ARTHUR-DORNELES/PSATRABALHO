const BASE = 'https://api.hubapi.com';

const MIN_INTERVAL_MS = 280;
let throttleChain: Promise<void> = Promise.resolve();
let lastStart = 0;
function throttle(): Promise<void> {
  throttleChain = throttleChain.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastStart);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
  });
  return throttleChain;
}

export type HsSearchBody = {
  filterGroups: { filters: { propertyName: string; operator: string; value?: string; values?: string[]; highValue?: string }[] }[];
  properties?: string[];
  limit?: number;
  after?: string;
  sorts?: { propertyName: string; direction: 'ASCENDING' | 'DESCENDING' }[];
};

export async function hsSearch(token: string, objectType: string, body: HsSearchBody) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    const res = await fetch(`${BASE}/crm/v3/objects/${objectType}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) {
      return res.json() as Promise<{ total: number; results: { id: string; properties: Record<string, string> }[]; paging?: { next?: { after: string } } }>;
    }
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1100 * (attempt + 1)));
      continue;
    }
    throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
  }
  throw new Error('HubSpot search: max retries excedidas');
}

export async function hsSearchAll(
  token: string,
  objectType: string,
  body: HsSearchBody,
  maxPages = 25,
): Promise<{ id: string; properties: Record<string, string> }[]> {
  const all: { id: string; properties: Record<string, string> }[] = [];
  let after: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await hsSearch(token, objectType, { ...body, limit: 200, after });
    all.push(...page.results);
    after = page.paging?.next?.after;
    if (!after) break;
  }
  return all;
}
