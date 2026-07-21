// Scan resiliente das LISTAS procurando filtros que referenciam os campos alvo.
import fs from "node:fs";
const envTxt = fs.readFileSync(new URL("./psa-bonus-dashboard/.env", import.meta.url), "utf8");
const TOKEN = (envTxt.match(/HUBSPOT_PRIVATE_APP_TOKEN=(\S+)/) || [])[1];
const H = { Authorization: "Bearer " + TOKEN };
async function api(url, opts = {}, tries = 4) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
      const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
      if (r.status === 429) { await new Promise(s=>setTimeout(s,1500)); continue; }
      return { status: r.status, json, text };
    } catch (e) { await new Promise(s=>setTimeout(s, 800*(t+1))); }
  }
  return { status: 0, json: null, text: "fetch failed after retries" };
}
const TARGETS = ["cargo__oficial_", "quantos_colabores_tem_na_empresa_"];
const COUSINS = ["quantos_colaboradores_tem_na_empresa","quantos_colabores_tem_na_empresa","qual_e_o_seu_cargo___","cargo"];
const ALL=[...TARGETS,...COUSINS];
const hitsIn = s => ALL.filter(t => s.includes(`"${t}"`));

// lista todas as listas
let offset = 0, lists = [];
while (true) {
  const r = await api("https://api.hubapi.com/crm/v3/lists/search", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ query:"", count:250, offset })});
  if (r.status !== 200) { console.log("search HTTP", r.status, r.text.slice(0,200)); break; }
  const batch = r.json.lists || r.json.results || [];
  lists.push(...batch);
  if (batch.length < 250) break;
  offset += batch.length;
}
console.log("total listas:", lists.length);

// scan com concorrencia limitada
const listHits = [];
let done = 0, errors = 0;
const queue = [...lists];
async function worker() {
  while (queue.length) {
    const l = queue.shift();
    const lid = l.listId || l.listid;
    const det = await api(`https://api.hubapi.com/crm/v3/lists/${lid}?includeFilters=true`);
    done++;
    if (det.status !== 200 || !det.json) { errors++; continue; }
    const h = hitsIn(JSON.stringify(det.json));
    if (h.length) listHits.push({ id: lid, name: l.name, type: l.processingType || l.processingTypeId, hits: h });
    if (done % 200 === 0) console.log(`  ...${done}/${lists.length} (hits ${listHits.length}, erros ${errors})`);
  }
}
await Promise.all(Array.from({length:6}, worker));

console.log(`\nlistas com referencia aos campos: ${listHits.length} (erros de fetch: ${errors})`);
for (const l of listHits.sort((a,b)=>(a.type>b.type?1:-1)))
  console.log(`  >>> ${l.id} [${l.type}] ${l.name} :: ${l.hits.join(", ")}`);
fs.writeFileSync("_listHits.json", JSON.stringify(listHits,null,2));
console.log("\nsalvo em _listHits.json");
