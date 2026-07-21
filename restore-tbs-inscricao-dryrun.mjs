// DRY-RUN (somente leitura): recupera a 1ª data de "Data de inscrição | TBS 2026"
// (tbs_2026__data_de_inscricao) a partir do histórico de versões do HubSpot, para
// contatos que se inscreveram 2x+ e tiveram a 1ª data sobrescrita pela 2ª.
//
// Rode com:
//   node --env-file=psa-bonus-dashboard/.env restore-tbs-inscricao-dryrun.mjs
//
// NÃO escreve nada no HubSpot. Só lê a lista 13822, lê o histórico da propriedade,
// e grava um plano de restauração em tbs-inscricao-restore-plan.json.

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!TOKEN) {
  console.error("Falta HUBSPOT_PRIVATE_APP_TOKEN. Rode com --env-file=psa-bonus-dashboard/.env");
  process.exit(1);
}

const LIST_ID = "13822";
const PROP = "tbs_2026__data_de_inscricao";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "(vazio)";
  const n = Number(v);
  const d = Number.isFinite(n) ? new Date(n) : new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
};

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: H, ...opts });
  const text = await r.text();
  if (!r.ok) throw new Error(`HubSpot ${r.status} em ${url}: ${text}`);
  return text ? JSON.parse(text) : {};
}

// 1) Puxa todos os IDs da lista 13822
async function getListMembers() {
  const ids = [];
  let after;
  do {
    const url = `https://api.hubapi.com/crm/v3/lists/${LIST_ID}/memberships?limit=100${after ? `&after=${after}` : ""}`;
    const data = await api(url);
    for (const m of data.results || []) ids.push(m.recordId);
    after = data.paging?.next?.after;
  } while (after);
  return ids;
}

// 2) Batch read com histórico (100 por vez)
async function readWithHistory(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await api("https://api.hubapi.com/crm/v3/objects/contacts/batch/read", {
      method: "POST",
      body: JSON.stringify({
        propertiesWithHistory: [PROP],
        properties: [PROP, "email", "firstname", "lastname"],
        inputs: chunk.map((id) => ({ id: String(id) })),
      }),
    });
    out.push(...(data.results || []));
  }
  return out;
}

const members = await getListMembers();
console.log(`Lista ${LIST_ID}: ${members.length} contatos.`);

const records = await readWithHistory(members);

const plan = [];
let multi = 0, noHist = 0, sameVal = 0;

for (const rec of records) {
  const hist = rec.propertiesWithHistory?.[PROP] || [];
  const current = rec.properties?.[PROP] ?? "";
  // histórico vem do mais novo p/ o mais antigo — ordena por timestamp asc
  const asc = [...hist].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const versions = asc.length;
  // 1ª data setada = valor mais antigo não-vazio
  const firstSet = asc.find((v) => v.value !== "" && v.value != null);
  const earliest = firstSet?.value ?? "";

  if (versions <= 1) { noHist++; continue; }      // nunca foi sobrescrita
  multi++;
  if (String(earliest) === String(current)) { sameVal++; continue; } // 2ª = mesma data

  plan.push({
    id: rec.id,
    email: rec.properties?.email || "",
    nome: `${rec.properties?.firstname || ""} ${rec.properties?.lastname || ""}`.trim(),
    versoes: versions,
    atual: current,
    atual_data: fmt(current),
    primeira: earliest,
    primeira_data: fmt(earliest),
    fontes: asc.map((v) => `${fmt(v.value)}←${v.sourceType || "?"}`),
  });
}

await import("node:fs").then((fs) =>
  fs.writeFileSync("tbs-inscricao-restore-plan.json", JSON.stringify(plan, null, 2))
);

console.log(`\nResumo:`);
console.log(`  ${noHist} contato(s) com 1 só versão (nunca sobrescrita) — nada a fazer`);
console.log(`  ${multi} contato(s) com 2+ versões`);
console.log(`    - ${sameVal} re-inscreveram na MESMA data (sem mudança real)`);
console.log(`    - ${plan.length} com 1ª data DIFERENTE da atual → candidatos a restaurar`);

console.log(`\nPrévia (até 15):`);
for (const p of plan.slice(0, 15)) {
  console.log(`  ${p.id} ${p.email.padEnd(34)} atual=${p.atual_data}  →  1ª=${p.primeira_data}  [${p.versoes}v: ${p.fontes.join(", ")}]`);
}
console.log(`\nPlano completo salvo em tbs-inscricao-restore-plan.json (${plan.length} registros).`);
console.log(`Nada foi escrito no HubSpot.`);
