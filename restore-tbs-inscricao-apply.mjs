// APLICA a restauração: regrava a 1ª data de "Data de inscrição | TBS 2026"
// (tbs_2026__data_de_inscricao) nos contatos listados em tbs-inscricao-restore-plan.json.
//
// ⚠️ ESCREVE no HubSpot. Só roda com a flag --confirm.
//   Dry-run (não escreve, só mostra o que faria):
//     node --env-file=psa-bonus-dashboard/.env restore-tbs-inscricao-apply.mjs
//   Aplicar de verdade:
//     node --env-file=psa-bonus-dashboard/.env restore-tbs-inscricao-apply.mjs --confirm
//
// O valor "atual" de cada contato já está salvo no plano JSON, servindo de backup
// para um eventual rollback.

import { readFileSync, writeFileSync } from "node:fs";

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!TOKEN) {
  console.error("Falta HUBSPOT_PRIVATE_APP_TOKEN. Rode com --env-file=psa-bonus-dashboard/.env");
  process.exit(1);
}
const CONFIRM = process.argv.includes("--confirm");
const PROP = "tbs_2026__data_de_inscricao";
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

const plan = JSON.parse(readFileSync("tbs-inscricao-restore-plan.json", "utf8"));
console.log(`Plano: ${plan.length} contato(s) para restaurar a 1ª data.`);

if (!CONFIRM) {
  console.log("\n[DRY-RUN] Nada será escrito. Use --confirm para aplicar.");
  for (const p of plan.slice(0, 10)) {
    console.log(`  ${p.id} ${p.email}: ${p.atual_data} → ${p.primeira_data}`);
  }
  if (plan.length > 10) console.log(`  ... (+${plan.length - 10})`);
  process.exit(0);
}

// Batch update, 100 por requisição. Regrava o valor bruto da 1ª versão.
const results = [];
for (let i = 0; i < plan.length; i += 100) {
  const chunk = plan.slice(i, i + 100);
  const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/update", {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      inputs: chunk.map((p) => ({ id: String(p.id), properties: { [PROP]: String(p.primeira) } })),
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HubSpot ${r.status}: ${text}`);
  const data = JSON.parse(text);
  results.push(...(data.results || []));
  console.log(`  Lote ${i / 100 + 1}: ${chunk.length} atualizados.`);
}

writeFileSync(
  "tbs-inscricao-restore-applied.json",
  JSON.stringify({ aplicadoEm: "ver git/log", total: results.length, plan }, null, 2)
);
console.log(`\n✅ ${results.length} contato(s) atualizados. Registro em tbs-inscricao-restore-applied.json (backup do 'atual' está no plano).`);
