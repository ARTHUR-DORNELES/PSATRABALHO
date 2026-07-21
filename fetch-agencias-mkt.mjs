// Busca companies que são agências de marketing no HubSpot
// Critérios (OR entre grupos, AND com num_associated_contacts >= 1):
//   - industry = MARKETING_AND_ADVERTISING
//   - name OU domain contém: agencia/agência/agency, marketing, publicidade, propaganda, comunicação/comunicacao, mídia/midia
// Dedupe por id e exporta JSON + CSV

const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!T) { console.error("HUBSPOT_PRIVATE_APP_TOKEN não setado"); process.exit(1); }

const SEARCH_URL = "https://api.hubapi.com/crm/v3/objects/companies/search";
const PROPERTIES = ["name", "domain", "website", "industry", "segmento", "country", "state", "city", "num_associated_contacts", "num_associated_deals", "lifecyclestage", "createdate"];

const RADICAIS_NAME = ["agência", "agencia", "agency"];
const RADICAIS_DOMAIN = ["agencia", "agency"];
const RADICAIS_MKT = ["marketing", "publicidade", "propaganda", "comunicação", "comunicacao", "mídia", "midia"];

const baseContactFilter = { propertyName: "num_associated_contacts", operator: "GTE", value: "1" };

async function searchPage(filterGroups, after) {
  const body = {
    filterGroups,
    properties: PROPERTIES,
    limit: 100,
    ...(after ? { after } : {})
  };
  const r = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status}: ${t}`);
  }
  return r.json();
}

async function searchAll(label, filterGroups) {
  // HubSpot caps at 5 filterGroups per request — chunk if needed
  const CHUNK = 5;
  const chunks = [];
  for (let i = 0; i < filterGroups.length; i += CHUNK) {
    chunks.push(filterGroups.slice(i, i + CHUNK));
  }
  const out = [];
  let total = 0;
  for (let ci = 0; ci < chunks.length; ci++) {
    const grp = chunks[ci];
    let after;
    let pages = 0;
    let chunkTotal;
    do {
      const data = await searchPage(grp, after);
      if (chunkTotal === undefined) { chunkTotal = data.total; total += chunkTotal; }
      out.push(...data.results);
      after = data.paging?.next?.after;
      pages++;
      process.stdout.write(`  [${label} ch${ci + 1}/${chunks.length}] page ${pages}, +${data.results.length} (chunk ${data.results.length}; total so far ${out.length})\n`);
      if (pages > 60) { console.warn("  (pages cap reached)"); break; }
    } while (after);
  }
  return { total, results: out };
}

function buildGroups(criteriaList) {
  // Each criterion becomes its own filterGroup (groups are ORed) and includes contact filter (AND inside group)
  return criteriaList.map(c => ({ filters: [c, baseContactFilter] }));
}

const queries = [
  {
    label: "industry",
    groups: buildGroups([{ propertyName: "industry", operator: "EQ", value: "MARKETING_AND_ADVERTISING" }])
  },
  {
    label: "name-agencia",
    groups: buildGroups(RADICAIS_NAME.map(v => ({ propertyName: "name", operator: "CONTAINS_TOKEN", value: v })))
  },
  {
    label: "domain-agencia",
    groups: buildGroups(RADICAIS_DOMAIN.map(v => ({ propertyName: "domain", operator: "CONTAINS_TOKEN", value: v })))
  },
  {
    label: "name-mkt",
    groups: buildGroups(RADICAIS_MKT.map(v => ({ propertyName: "name", operator: "CONTAINS_TOKEN", value: v })))
  },
  {
    label: "domain-mkt",
    groups: buildGroups(RADICAIS_MKT.map(v => ({ propertyName: "domain", operator: "CONTAINS_TOKEN", value: v })))
  }
];

const all = new Map();
const sourceTag = new Map(); // id -> set of source labels

for (const q of queries) {
  console.log(`\n>>> ${q.label} (${q.groups.length} filterGroups)`);
  const { total, results } = await searchAll(q.label, q.groups);
  console.log(`  total reported: ${total}; collected: ${results.length}`);
  for (const r of results) {
    if (!all.has(r.id)) all.set(r.id, r);
    if (!sourceTag.has(r.id)) sourceTag.set(r.id, new Set());
    sourceTag.get(r.id).add(q.label);
  }
}

console.log(`\nUNIQUE companies: ${all.size}`);

// Sort by name asc
const list = [...all.values()].sort((a, b) => (a.properties?.name || "").localeCompare(b.properties?.name || ""));

// Save JSON
const fs = await import("node:fs/promises");
const jsonPath = "agencias_candidatas.json";
await fs.writeFile(jsonPath, JSON.stringify({ count: list.length, generated_at: new Date().toISOString(), companies: list.map(c => ({ id: c.id, properties: c.properties, sources: [...(sourceTag.get(c.id) || [])] })) }, null, 2));

// Save CSV
const csvCols = ["id", "name", "domain", "website", "industry", "segmento", "country", "state", "city", "num_associated_contacts", "num_associated_deals", "lifecyclestage", "sources"];
const esc = v => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
const lines = [csvCols.join(",")];
for (const c of list) {
  const p = c.properties || {};
  lines.push(csvCols.map(k => {
    if (k === "id") return esc(c.id);
    if (k === "sources") return esc([...(sourceTag.get(c.id) || [])].join("|"));
    return esc(p[k]);
  }).join(","));
}
const csvPath = "agencias_candidatas.csv";
await fs.writeFile(csvPath, lines.join("\n"), "utf8");

// Breakdown by industry and segmento
const byIndustry = new Map();
const bySegmento = new Map();
const byLifecycle = new Map();
for (const c of list) {
  const i = c.properties?.industry || "(vazio)";
  byIndustry.set(i, (byIndustry.get(i) || 0) + 1);
  const s = c.properties?.segmento || "(vazio)";
  bySegmento.set(s, (bySegmento.get(s) || 0) + 1);
  const l = c.properties?.lifecyclestage || "(vazio)";
  byLifecycle.set(l, (byLifecycle.get(l) || 0) + 1);
}

console.log(`\n=== BREAKDOWN ===`);
console.log("\nBy industry:");
[...byIndustry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`  ${v.toString().padStart(4)}  ${k}`));
console.log("\nBy segmento (PSA):");
[...bySegmento.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`  ${v.toString().padStart(4)}  ${k}`));
console.log("\nBy lifecyclestage:");
[...byLifecycle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`  ${v.toString().padStart(4)}  ${k}`));

console.log(`\nArquivos:`);
console.log(`  ${jsonPath}`);
console.log(`  ${csvPath}`);
