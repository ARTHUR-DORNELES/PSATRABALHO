// Fetch protegido pros scripts de reconciliação Kiwify×HubSpot (_diag/_reconciliar/_perdido/_backfill).
// Sem isso, uma página que batesse 429 (rate limit) era tratada como "acabou" (paging.next.after vem
// undefined numa resposta de erro) — os scripts seguiam adiante com uma lista de negócios TRUNCADA e sem
// avisar nada, o que já quase gerou milhares de negócios duplicados numa reconciliação (dia 20/07).
let lastCall = 0;
const MIN_INTERVAL_MS = 300;

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

// fetch + parse JSON com throttle e retry (rede + 429/5xx). Lança erro explícito em vez de devolver {} silencioso.
async function hsFetch(url, opts) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await throttle();
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
      throw new Error(`hsFetch: falha de rede após 4 tentativas em ${url}: ${e.message}`);
    }
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      continue;
    }
    throw new Error(`hsFetch: HTTP ${res.status} em ${url}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error(`hsFetch: máximo de tentativas excedido em ${url}`);
}

// Pagina TODOS os resultados de uma busca (deals/contacts) via `after`, com o hsFetch protegido acima.
// Lança erro se alguma página falhar (nunca retorna uma lista truncada silenciosamente).
async function hsSearchAllPaged(H, objectType, filterGroups, properties) {
  const all = [];
  let after;
  do {
    const body = { filterGroups, properties, limit: 100, ...(after ? { after } : {}) };
    const j = await hsFetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/search`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    (j.results || []).forEach((d) => all.push(d));
    after = j.paging?.next?.after;
  } while (after);
  return all;
}

module.exports = { hsFetch, hsSearchAllPaged };
