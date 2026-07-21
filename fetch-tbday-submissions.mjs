// Puxa todas as submissões do form da LP The Best Day Sorteio (Inovação)
// via API do HubSpot Forms. Lista contatos + grava JSON completo pra análise.
//
// Form: The Best Day Sorteio / The Best School Inovação
// Portal: 49656171 · Form GUID: 3b15026a-9b09-418d-91cc-77ec76467823

import { writeFileSync } from "fs";

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!TOKEN) {
  console.error("Falta HUBSPOT_PRIVATE_APP_TOKEN no ambiente. Rode com --env-file=psa-bonus-dashboard/.env");
  process.exit(1);
}

const FORM_GUID = "3b15026a-9b09-418d-91cc-77ec76467823";
const BASE = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_GUID}`;

async function fetchPage(after) {
  const url = new URL(BASE);
  url.searchParams.set("limit", "50");
  if (after) url.searchParams.set("after", after);
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`HubSpot API ${r.status}: ${text}`);
  }
  return r.json();
}

const all = [];
let cursor = null;
let page = 0;
while (true) {
  const data = await fetchPage(cursor);
  const results = data.results ?? [];
  all.push(...results);
  page++;
  cursor = data.paging?.next?.after;
  if (!cursor || results.length === 0) break;
  if (page > 100) { console.warn("Stop guard: passou de 100 pages, abortando paginação"); break; }
}

console.log(`Total de submissões: ${all.length}\n`);

if (all.length === 0) {
  console.log("Nenhuma submissão registrada. Possíveis causas:");
  console.log("  - Form não está conectado ao portal certo");
  console.log("  - Domínio embed (tbday-sorteio.vercel.app) não está permitido");
  console.log("  - Form em estado draft/pausado");
  console.log("\nVá em https://app.hubspot.com/forms/49656171/3b15026a-9b09-418d-91cc-77ec76467823/performance pra confirmar");
} else {
  console.log("Últimas 10 submissões (ordem cronológica decrescente):\n");
  const sorted = [...all].sort((a, b) => b.submittedAt - a.submittedAt);
  for (const s of sorted.slice(0, 10)) {
    const when = new Date(s.submittedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const emailField = (s.values ?? []).find((v) => v.name === "email");
    const nameField = (s.values ?? []).find((v) => v.name === "firstname");
    const email = emailField?.value ?? "(sem email)";
    const name = nameField?.value ?? "(sem nome)";
    console.log(`  ${when}  ·  ${name}  ·  ${email}`);
  }
}

const outFile = "tbday-submissions.json";
writeFileSync(outFile, JSON.stringify({ form_guid: FORM_GUID, fetched_at: new Date().toISOString(), total: all.length, submissions: all }, null, 2));
console.log(`\nDump completo salvo em ${outFile}`);
