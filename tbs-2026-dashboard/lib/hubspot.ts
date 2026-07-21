const BASE = 'https://api.hubapi.com';

// Contadores leves (sem log por chamada) — usados no resumo de tempo do rebuild em buildLiveSnapshot.
export const hubspotDiag = { calls: 0, rows: 0 };

// Throttle global: espaça o INÍCIO de cada request ao HubSpot pra ficar abaixo do limite "secondly"
// da Search API (~4/seg). Vale pra qualquer chamada (serial ou paralela) — evita 429 que derruba o snapshot.
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
  const MAX_ATTEMPTS = 4;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await throttle();
    // Falha de REDE (DNS, conexão resetada, etc.) faz o fetch() lançar ANTES de ter uma resposta — sem
    // o try/catch, um único soluço transitório em qualquer uma das ~150+ chamadas de um rebuild derrubava
    // o snapshot inteiro (sem retry nenhum, já que o retry abaixo só cobria HTTP 429). Trata como retryable.
    let res: Response;
    try {
      res = await fetch(`${BASE}/crm/v3/objects/${objectType}/search`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (e) {
      if (attempt < MAX_ATTEMPTS - 1) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
      throw new Error(`HubSpot fetch falhou (rede) após ${MAX_ATTEMPTS} tentativas: ${e instanceof Error ? e.message : e}`);
    }
    hubspotDiag.calls++;
    if (res.ok) {
      const json = await res.json() as { total: number; results: { id: string; properties: Record<string, string> }[]; paging?: { next?: { after: string } } };
      hubspotDiag.rows += json.results?.length || 0;
      return json;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS - 1) {
      // Rate limit ou erro transitório do servidor — backoff e tenta de novo.
      await new Promise((r) => setTimeout(r, 1100 * (attempt + 1)));
      continue;
    }
    throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
  }
  throw new Error('HubSpot search: max retries excedidas');
}

export async function hsCount(token: string, body: HsSearchBody): Promise<number> {
  const data = await hsSearch(token, 'contacts', { ...body, limit: 1, properties: [] });
  return data.total;
}

// Busca TODOS os resultados paginando (200/página). maxPages é um teto de segurança.
// Sem isso, agregações em JS travavam em 200 e não batiam com a contagem total do funil.
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

// Paginação "seek" por hs_object_id — sem o teto de 10.000 da Search API (o `after` estoura em 10k).
// Ordena por hs_object_id ASC e avança o cursor pelo último id da página; cada filterGroup recebe o
// filtro id > cursor. Use quando a população pode passar de 10k (ex.: varredura de inscritos).
export async function hsSearchAllSeek(
  token: string,
  objectType: string,
  body: HsSearchBody,
  maxRecords = 60000,
): Promise<{ id: string; properties: Record<string, string> }[]> {
  const all: { id: string; properties: Record<string, string> }[] = [];
  let cursor = '0';
  for (let i = 0; i < 600; i++) {
    const page = await hsSearch(token, objectType, {
      ...body,
      filterGroups: body.filterGroups.map((g) => ({ filters: [...g.filters, { propertyName: 'hs_object_id', operator: 'GT', value: cursor }] })),
      sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }],
      limit: 200,
      after: undefined,
    });
    const rows = page.results;
    if (rows.length === 0) break;
    all.push(...rows);
    cursor = rows[rows.length - 1].id;
    if (rows.length < 200 || all.length >= maxRecords) break;
  }
  return all;
}

// Seek dentro de UMA faixa INCLUSIVA [loMs, hiMs] de [dateProp] — paginação ainda por hs_object_id (cursor
// local à faixa). hiMs=null é faixa aberta (sem teto — pega qualquer coisa criada depois, por segurança).
async function hsSearchAllSeekDateRange(
  token: string,
  objectType: string,
  body: HsSearchBody,
  dateProp: string,
  loMs: number,
  hiMs: number | null,
  maxRecords: number,
): Promise<{ id: string; properties: Record<string, string> }[]> {
  const all: { id: string; properties: Record<string, string> }[] = [];
  let cursor = '0';
  const dateFilter = hiMs === null
    ? { propertyName: dateProp, operator: 'GTE', value: String(loMs) }
    : { propertyName: dateProp, operator: 'BETWEEN', value: String(loMs), highValue: String(hiMs) };
  for (let i = 0; i < 600; i++) {
    const page = await hsSearch(token, objectType, {
      ...body,
      filterGroups: body.filterGroups.map((g) => ({ filters: [...g.filters, dateFilter, { propertyName: 'hs_object_id', operator: 'GT', value: cursor }] })),
      sorts: [{ propertyName: 'hs_object_id', direction: 'ASCENDING' }],
      limit: 200,
      after: undefined,
    });
    const rows = page.results;
    if (rows.length === 0) break;
    all.push(...rows);
    cursor = rows[rows.length - 1].id;
    if (rows.length < 200 || all.length >= maxRecords) break;
  }
  return all;
}

// Paginação seek EM PARALELO — particiona por uma propriedade de DATA (ex.: data de inscrição) em N faixas
// de tempo CONTÍGUAS e DISJUNTAS ([lo,hi] inclusivo; a próxima começa em hi+1ms) e roda os seeks concorrentemente.
// A varredura de inscritos é 100% sequencial por natureza (cursor da página N+1 depende da N) e, sozinha, vinha
// levando ~90s conforme a base passou de 20k+ — estourando o maxDuration de 60s da Vercel (Hobby não permite
// aumentar). Particiona por DATA (não por hs_object_id): o ID não é uniformemente denso (base reativada tem
// contatos antigos com ID baixo mas inscrição recente), então particionar por ID gerava faixas MUITO
// desbalanceadas (uma faixa concentrava 80%+ dos registros). A data de inscrição acompanha o volume diário
// real da campanha — faixas bem mais parecidas em tamanho.
export async function hsSearchAllSeekByDateParallel(
  token: string,
  objectType: string,
  body: HsSearchBody,
  dateProp: string,
  floorMs: number,
  partitions = 6,
  maxRecords = 60000,
): Promise<{ id: string; properties: Record<string, string> }[]> {
  if (partitions <= 1) return hsSearchAllSeek(token, objectType, body, maxRecords);
  const step = Math.ceil((Date.now() - floorMs) / partitions);
  const ranges = Array.from({ length: partitions }, (_, i) => ({
    lo: floorMs + i * step,
    hi: i === partitions - 1 ? null : floorMs + (i + 1) * step - 1,
  }));
  const chunks = await Promise.all(
    ranges.map(({ lo, hi }) => hsSearchAllSeekDateRange(token, objectType, body, dateProp, lo, hi, maxRecords)),
  );
  return chunks.flat();
}

// Concorrência limitada genérica (mesma ideia do pLimit de lib/data.ts) — batches independentes (não-seek)
// podem rodar concorrentes com segurança; o throttle global já protege a taxa real de chamadas ao HubSpot.
export async function withConcurrency<T>(n: number, count: number, fn: (i: number) => Promise<T>): Promise<T[]> {
  const results: T[] = new Array(count);
  let idx = 0;
  const worker = async () => {
    while (true) {
      const i = idx++;
      if (i >= count) return;
      results[i] = await fn(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, count) }, worker));
  return results;
}

// Associações em lote (v4): mapeia cada objeto de origem -> ids dos objetos de destino.
// Ex.: deals -> contacts. Usado pra atribuir o negócio (venda) ao contato (canal/etapa). Cada lote de 100 é
// independente dos outros (não precisa de cursor) — roda concorrente em vez de serializar um-a-um.
export async function hsBatchAssoc(
  token: string,
  fromType: string,
  toType: string,
  ids: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const numBatches = Math.ceil(ids.length / 100);
  await withConcurrency(3, numBatches, async (b) => {
    const batch = ids.slice(b * 100, b * 100 + 100);
    // Mesmo retry de hsSearch (rede + 429/5xx) — sem isso, um lote falho era descartado em SILÊNCIO
    // (`if (!res.ok) return`), perdendo a associação negócio→contato daqueles negócios sem erro nenhum.
    for (let attempt = 0; attempt < 4; attempt++) {
      await throttle();
      let res: Response;
      try {
        res = await fetch(`${BASE}/crm/v4/associations/${fromType}/${toType}/batch/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: batch.map((id) => ({ id })) }),
        });
      } catch {
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
        throw new Error(`hsBatchAssoc: fetch falhou (rede) após 4 tentativas`);
      }
      if (res.ok) {
        const data = await res.json();
        for (const r of data.results || []) {
          map.set(String(r.from.id), (r.to || []).map((t: { toObjectId: string | number }) => String(t.toObjectId)));
        }
        return;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1100 * (attempt + 1)));
        continue;
      }
      throw new Error(`hsBatchAssoc: HTTP ${res.status}: ${await res.text()}`);
    }
  });
  return map;
}
