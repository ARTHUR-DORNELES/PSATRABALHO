// Diagnóstico de impacto: remoção dos campos cargo_oficial e
// quantos_colabores_tem_na_empresa_ do formulário B2B de criação de LEAD.
// Etapa 1: defs das props, forms que contêm os campos, e probe das APIs.
import fs from "node:fs";

const envTxt = fs.readFileSync(new URL("./psa-bonus-dashboard/.env", import.meta.url), "utf8");
const TOKEN = (envTxt.match(/HUBSPOT_PRIVATE_APP_TOKEN=(\S+)/) || [])[1];
if (!TOKEN) throw new Error("token nao encontrado");

const TARGETS = ["cargo_oficial", "quantos_colabores_tem_na_empresa_"];
const H = { Authorization: "Bearer " + TOKEN };

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, json, text };
}

// ---------- 1) Definicoes das propriedades (contacts) ----------
console.log("===== 1) DEFINICOES DAS PROPRIEDADES (contact) =====");
for (const p of TARGETS) {
  const r = await api(`https://api.hubapi.com/crm/v3/properties/contacts/${p}`);
  if (r.status !== 200) { console.log(`  ${p}: HTTP ${r.status} ${r.text.slice(0,200)}`); continue; }
  const d = r.json;
  console.log(`  ${p}`);
  console.log(`     label: ${d.label}`);
  console.log(`     type: ${d.type}/${d.fieldType}  grupo: ${d.groupName}`);
  console.log(`     calculated: ${d.calculated}  hasUniqueValue: ${d.hasUniqueValue}`);
  console.log(`     formField: ${d.formField}  hidden: ${d.hidden}`);
  if (d.options?.length) console.log(`     options(${d.options.length}): ${d.options.map(o=>o.label).slice(0,12).join(" | ")}`);
}

// ---------- 2) Forms que contem os campos ----------
console.log("\n===== 2) FORMS QUE CONTEM OS CAMPOS =====");
let after = null, all = [];
do {
  const url = `https://api.hubapi.com/marketing/v3/forms?limit=100${after ? `&after=${after}` : ""}`;
  const r = await api(url);
  if (r.status !== 200) { console.log("  forms list HTTP", r.status, r.text.slice(0,300)); break; }
  all.push(...(r.json.results || []));
  after = r.json.paging?.next?.after || null;
} while (after);
console.log(`  total de forms no portal: ${all.length}`);

function fieldsOf(form) {
  const names = [];
  (form.fieldGroups || []).forEach(g => (g.fields || []).forEach(f => names.push(f)));
  return names;
}
const hits = [];
for (const f of all) {
  const fields = fieldsOf(f);
  const present = TARGETS.filter(t => fields.some(x => x.name === t));
  if (present.length) {
    hits.push({ id: f.id, name: f.name, archived: f.archived, formType: f.formType, present,
      details: present.map(t => { const fl = fields.find(x=>x.name===t); return { name:t, required: fl.required, hidden: fl.hidden }; }) });
  }
}
console.log(`  forms que contem pelo menos 1 dos campos: ${hits.length}`);
for (const h of hits) {
  console.log(`\n  - ${h.id} ${h.archived ? "[ARQUIVADO]" : ""} (${h.formType})  ${h.name}`);
  for (const d of h.details) console.log(`       campo ${d.name}  required=${d.required} hidden=${d.hidden}`);
}

// ---------- 3) Probe das APIs de automacao / listas ----------
console.log("\n===== 3) PROBE DE APIS (scopes) =====");
const probes = [
  ["workflows v4 flows", "https://api.hubapi.com/automation/v4/flows?limit=1"],
  ["workflows v3", "https://api.hubapi.com/automation/v3/workflows"],
  ["lists v3 search", "https://api.hubapi.com/crm/v3/lists/search?count=1"],
  ["lists legacy v1", "https://api.hubapi.com/contacts/v1/lists?count=1"],
];
for (const [label, url] of probes) {
  const r = await api(url, label.includes("search") ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "", count: 1 }) } : {});
  console.log(`  ${label}: HTTP ${r.status}` + (r.status !== 200 ? `  ${r.text.slice(0,160)}` : ` OK`));
}
