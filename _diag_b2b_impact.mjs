// Etapa 3: varre TODOS os workflows (v4 flows + v3) e TODAS as listas
// procurando referencias a cargo__oficial_ e quantos_colabores_tem_na_empresa_.
import fs from "node:fs";
const envTxt = fs.readFileSync(new URL("./psa-bonus-dashboard/.env", import.meta.url), "utf8");
const TOKEN = (envTxt.match(/HUBSPOT_PRIVATE_APP_TOKEN=(\S+)/) || [])[1];
const H = { Authorization: "Bearer " + TOKEN };
async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}
const TARGETS = ["cargo__oficial_", "quantos_colabores_tem_na_empresa_"];
// tambem rastreio os "primos" pra ver se algum fluxo usa variante diferente
const COUSINS = ["cargo", "qual_o_seu_cargo", "qual__o_seu_cargo", "qual_e_o_seu_cargo___", "jobtitle",
  "quantos_colaboradores_tem_na_empresa", "quantos_colabores_tem_na_empresa"];
const ALL = [...TARGETS, ...COUSINS];

function hitsIn(str) {
  // conta ocorrencias com delimitador de aspas pra evitar match parcial
  return ALL.filter(t => str.includes(`"${t}"`));
}

// ---------- WORKFLOWS v4 flows ----------
console.log("===== WORKFLOWS (automation/v4/flows) =====");
let after = null, flows = [];
do {
  const r = await api(`https://api.hubapi.com/automation/v4/flows?limit=100${after ? `&after=${after}` : ""}`);
  if (r.status !== 200) { console.log("list HTTP", r.status, r.text.slice(0,200)); break; }
  flows.push(...(r.json.results || []));
  after = r.json.paging?.next?.after || null;
} while (after);
console.log(`total de flows: ${flows.length}`);

const flowHits = [];
for (const fl of flows) {
  const det = await api(`https://api.hubapi.com/automation/v4/flows/${fl.id}`);
  if (det.status !== 200) { console.log(`  ! flow ${fl.id} HTTP ${det.status}`); continue; }
  const str = JSON.stringify(det.json);
  const h = hitsIn(str);
  if (h.length) flowHits.push({ id: fl.id, name: det.json.name, enabled: det.json.isEnabled, hits: h, def: det.json });
}
console.log(`\nflows que referenciam algum dos campos (alvos+primos): ${flowHits.length}`);
for (const f of flowHits) {
  console.log(`\n  >>> [${f.enabled ? "ATIVO" : "inativo"}] ${f.id}  ${f.name}`);
  console.log(`      campos referenciados: ${f.hits.join(", ")}`);
}

// salva defs dos flows com hit pra inspecao detalhada
fs.writeFileSync("_flowHits.json", JSON.stringify(flowHits, null, 2));

// ---------- WORKFLOWS v3 (legacy cross-check) ----------
console.log("\n===== WORKFLOWS (automation/v3 legacy) cross-check =====");
const v3 = await api("https://api.hubapi.com/automation/v3/workflows");
const v3list = v3.json?.workflows || [];
console.log(`total v3: ${v3list.length}`);
let v3hits = 0;
for (const w of v3list) {
  const det = await api(`https://api.hubapi.com/automation/v3/workflows/${w.id}`);
  if (det.status !== 200) continue;
  const h = hitsIn(JSON.stringify(det.json));
  if (h.length) { v3hits++; console.log(`  >>> [${det.json.enabled?"ATIVO":"inativo"}] ${w.id} ${det.json.name} :: ${h.join(", ")}`); }
}
console.log(`v3 com hit: ${v3hits}`);

// ---------- LISTAS ----------
console.log("\n===== LISTAS (crm/v3/lists) =====");
let listOffset = 0, lists = [];
do {
  const r = await api("https://api.hubapi.com/crm/v3/lists/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", count: 250, offset: listOffset }) });
  if (r.status !== 200) { console.log("list search HTTP", r.status, r.text.slice(0,200)); break; }
  const batch = r.json.lists || r.json.results || [];
  lists.push(...batch);
  if (batch.length < 250) break;
  listOffset += batch.length;
} while (true);
console.log(`total de listas: ${lists.length}`);

const listHits = [];
for (const l of lists) {
  const lid = l.listId || l.listid;
  const det = await api(`https://api.hubapi.com/crm/v3/lists/${lid}?includeFilters=true`);
  if (det.status !== 200) continue;
  const h = hitsIn(JSON.stringify(det.json));
  if (h.length) listHits.push({ id: lid, name: l.name, type: l.processingType, hits: h });
}
console.log(`\nlistas que referenciam algum dos campos: ${listHits.length}`);
for (const l of listHits) console.log(`  >>> ${l.id} [${l.type}] ${l.name} :: ${l.hits.join(", ")}`);
fs.writeFileSync("_listHits.json", JSON.stringify(listHits, null, 2));

console.log("\n===== FIM. Detalhes dos flows com hit salvos em _flowHits.json =====");
