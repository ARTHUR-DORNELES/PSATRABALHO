// Top 50 clientes B2B PSA pelos últimos 12 meses
// - Pipelines B2B: default (B2B Principal), 883258246 (Ecosistema B2B), 881019761 (CRM Ecosistema), 807706157 (Mercado Livre/Partner)
// - dealstage = closedwon
// - closedate >= hoje - 365 dias
// Agrega amount por company associada

const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!T) { console.error("HUBSPOT_PRIVATE_APP_TOKEN não setado"); process.exit(1); }

// Stages WON corretos por pipeline B2B (descobertos via /crm/v3/pipelines/deals)
const WON_STAGES_BY_PIPELINE = {
  "default": ["1076664462", "1076664460"], // Negócio fechado + Ganho / Contrato assinado
  "883258246": ["1326633124"], // B2B Ecosistema - Negócio fechado
  "881019761": ["1323081481"], // CRM Ecosistema - Fechados
  "807706157": ["1188294461"]  // Partner - Negócio fechado
};
const PIPELINES_B2B = Object.keys(WON_STAGES_BY_PIPELINE);
const SINCE_MS = Date.now() - 365 * 24 * 60 * 60 * 1000;
const SINCE_ISO = new Date(SINCE_MS).toISOString();
console.log(`Janela: closedate >= ${SINCE_ISO}`);
console.log(`Pipelines B2B: ${PIPELINES_B2B.join(", ")}\n`);

const DEAL_PROPS = ["dealname", "amount", "deal_currency_code", "closedate", "pipeline", "dealstage", "tipo_de_produto", "produto_de_interesse__ganho_", "valor_total_do_contrato__bruto___ganho_"];

async function api(path, body) {
  const r = await fetch(`https://api.hubapi.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status} ${path}: ${t.substring(0, 200)}`);
  }
  return r.json();
}

// 1) Buscar deals closedwon últimos 12 meses em pipelines B2B
const deals = [];
for (const pipe of PIPELINES_B2B) {
  const wonStages = WON_STAGES_BY_PIPELINE[pipe];
  console.log(`\n>>> Pipeline ${pipe} (won stages: ${wonStages.join(", ")})`);
  let after;
  let pages = 0;
  let total;
  do {
    const data = await api("/crm/v3/objects/deals/search", {
      filterGroups: [{
        filters: [
          { propertyName: "pipeline", operator: "EQ", value: pipe },
          { propertyName: "dealstage", operator: "IN", values: wonStages },
          { propertyName: "closedate", operator: "GTE", value: String(SINCE_MS) }
        ]
      }],
      properties: DEAL_PROPS,
      limit: 100,
      ...(after ? { after } : {})
    });
    if (total === undefined) total = data.total;
    deals.push(...data.results.map(d => ({ ...d, _pipeline: pipe })));
    after = data.paging?.next?.after;
    pages++;
    process.stdout.write(`  page ${pages}: +${data.results.length} (${deals.length}/${total})\n`);
    if (pages > 200) { console.warn("  pages cap reached"); break; }
  } while (after);
}

console.log(`\nTOTAL deals coletados: ${deals.length}`);

// 2) Buscar associações deal -> company em batch
const dealIds = deals.map(d => d.id);
const assocMap = new Map(); // dealId -> [companyId,...]
console.log(`\n>>> Buscando associations deal->companies em batch...`);
for (let i = 0; i < dealIds.length; i += 100) {
  const chunk = dealIds.slice(i, i + 100);
  const data = await api("/crm/v4/associations/deals/companies/batch/read", {
    inputs: chunk.map(id => ({ id }))
  });
  for (const result of data.results || []) {
    const dealId = result.from?.id;
    const companyIds = (result.to || []).map(t => t.toObjectId);
    if (dealId) assocMap.set(dealId, companyIds);
  }
  process.stdout.write(`  batch ${Math.ceil((i + 100) / 100)}: ${assocMap.size} deals com association\n`);
}

const dealsWithCompany = deals.filter(d => assocMap.has(d.id) && assocMap.get(d.id).length > 0);
console.log(`\nDeals com company associada: ${dealsWithCompany.length}/${deals.length}`);

// 3) Agregar por company
const byCompany = new Map(); // companyId -> { sumAmount, dealCount, deals: [{dealId, dealname, amount, closedate}] }
for (const d of dealsWithCompany) {
  const companies = assocMap.get(d.id);
  // Distribui o amount integralmente para cada company associada (deal pode ter múltiplas) - mas geralmente é 1
  // Se quisermos ser conservadores: dividir. Aqui vou atribuir ao primeira company associada (deal "primary company")
  const primaryCo = companies[0];
  const amtStd = parseFloat(d.properties?.amount || "0") || 0;
  const amtCustom = parseFloat(d.properties?.valor_total_do_contrato__bruto___ganho_ || "0") || 0;
  const amt = amtStd > 0 ? amtStd : amtCustom; // fallback se amount padrão estiver vazio
  if (!byCompany.has(primaryCo)) byCompany.set(primaryCo, { companyId: primaryCo, sumAmount: 0, dealCount: 0, deals: [], lastClose: null, pipelines: new Set() });
  const agg = byCompany.get(primaryCo);
  agg.sumAmount += amt;
  agg.dealCount += 1;
  agg.deals.push({ id: d.id, name: d.properties?.dealname, amount: amt, closedate: d.properties?.closedate, pipeline: d._pipeline });
  agg.pipelines.add(d._pipeline);
  if (!agg.lastClose || (d.properties?.closedate && d.properties.closedate > agg.lastClose)) agg.lastClose = d.properties?.closedate;
}

const ranking = [...byCompany.values()].sort((a, b) => b.sumAmount - a.sumAmount);
const top50 = ranking.slice(0, 50);

// 4) Buscar nomes das companies do top50
const top50Ids = top50.map(x => x.companyId);
console.log(`\n>>> Buscando dados das top 50 companies...`);
const r = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/batch/read`, {
  method: "POST",
  headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    inputs: top50Ids.map(id => ({ id: String(id) })),
    properties: ["name", "domain", "tipo_de_empresa", "segmento", "industry", "country", "state", "lifecyclestage"]
  })
});
if (!r.ok) { console.error(await r.text()); process.exit(1); }
const coData = await r.json();
const coById = new Map((coData.results || []).map(c => [String(c.id), c.properties]));

// 5) Imprimir + salvar
const fmtBRL = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

console.log(`\n=== TOP 50 CLIENTES B2B — últimos 12 meses (closed-won) ===\n`);
console.log("Rank | Empresa | Total (R$) | # Deals | Último ganho | Tipo");
console.log("-".repeat(110));
top50.forEach((x, i) => {
  const co = coById.get(String(x.companyId)) || {};
  const name = (co.name || "(sem nome)").padEnd(40).substring(0, 40);
  const tipo = co.tipo_de_empresa || "—";
  const lc = (x.lastClose || "").substring(0, 10);
  console.log(`${(i + 1).toString().padStart(2)} | ${name} | ${fmtBRL(x.sumAmount).padStart(14)} | ${x.dealCount.toString().padStart(3)} | ${lc} | ${tipo}`);
});

const total12m = ranking.reduce((s, x) => s + x.sumAmount, 0);
const top50Sum = top50.reduce((s, x) => s + x.sumAmount, 0);
console.log(`\nTotal 12m (todos B2B): ${fmtBRL(total12m)}`);
console.log(`Top 50 concentra: ${fmtBRL(top50Sum)} (${(top50Sum / total12m * 100).toFixed(1)}%)`);
console.log(`Total companies B2B com compras 12m: ${ranking.length}`);

// CSV
const fs = await import("node:fs/promises");
const cols = ["rank", "company_id", "name", "domain", "tipo_de_empresa", "segmento", "industry", "country", "state", "lifecyclestage", "sum_amount_brl", "deal_count", "last_closedate", "pipelines"];
const esc = v => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const lines = [cols.join(",")];
top50.forEach((x, i) => {
  const co = coById.get(String(x.companyId)) || {};
  lines.push([
    i + 1, x.companyId, co.name, co.domain, co.tipo_de_empresa, co.segmento, co.industry,
    co.country, co.state, co.lifecyclestage,
    x.sumAmount.toFixed(2), x.dealCount, (x.lastClose || "").substring(0, 10),
    [...x.pipelines].join("|")
  ].map(esc).join(","));
});
await fs.writeFile("top50_clientes_b2b_12m.csv", lines.join("\n"), "utf8");

// JSON full ranking
await fs.writeFile("top50_clientes_b2b_12m.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  window_start: SINCE_ISO,
  pipelines_b2b: PIPELINES_B2B,
  total_companies: ranking.length,
  total_revenue_brl: total12m,
  top50: top50.map((x, i) => {
    const co = coById.get(String(x.companyId)) || {};
    return {
      rank: i + 1,
      company_id: x.companyId,
      name: co.name,
      domain: co.domain,
      tipo_de_empresa: co.tipo_de_empresa,
      segmento: co.segmento,
      sum_amount_brl: x.sumAmount,
      deal_count: x.dealCount,
      last_closedate: x.lastClose,
      pipelines: [...x.pipelines]
    };
  })
}, null, 2));

console.log(`\nArquivos:\n  top50_clientes_b2b_12m.csv\n  top50_clientes_b2b_12m.json`);
