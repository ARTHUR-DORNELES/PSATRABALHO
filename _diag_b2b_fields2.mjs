// Etapa 2: resolver o nome real do campo "Qual seu cargo?" e dump dos campos
// do form principal B2B (B2B Novo Oficial).
import fs from "node:fs";
const envTxt = fs.readFileSync(new URL("./psa-bonus-dashboard/.env", import.meta.url), "utf8");
const TOKEN = (envTxt.match(/HUBSPOT_PRIVATE_APP_TOKEN=(\S+)/) || [])[1];
const H = { Authorization: "Bearer " + TOKEN };
async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}

// 1) Procurar props de contact relacionadas a "cargo" / "colabor" / "job"
console.log("===== Props de CONTACT relacionadas a cargo/colaboradores/job =====");
const props = await api("https://api.hubapi.com/crm/v3/properties/contacts?archived=false");
const cand = (props.json.results || []).filter(p =>
  /cargo|colabor|job|funcao|função|nivel|n[ií]vel|senioridade/i.test(p.name + " " + (p.label||"")));
for (const p of cand) console.log(`  ${p.name}  |  "${p.label}"  | ${p.type}/${p.fieldType}`);

// 1b) Procurar tambem em company (caso cargo_oficial esteja em outro objeto)
console.log("\n===== Props de COMPANY relacionadas a cargo/colaboradores =====");
const cprops = await api("https://api.hubapi.com/crm/v3/properties/companies?archived=false");
const ccand = (cprops.json.results || []).filter(p =>
  /cargo|colabor|funcao|função|numberofemployees|employees/i.test(p.name + " " + (p.label||"")));
for (const p of ccand) console.log(`  ${p.name}  |  "${p.label}"  | ${p.type}/${p.fieldType}`);

// 1c) cargo_oficial poderia estar arquivado?
console.log("\n===== Checando cargo_oficial em archived=true (contacts) =====");
const arch = await api("https://api.hubapi.com/crm/v3/properties/contacts?archived=true");
const archHit = (arch.json.results || []).filter(p => /cargo/i.test(p.name) || /cargo/i.test(p.label||""));
for (const p of archHit) console.log(`  [ARQUIVADA] ${p.name} | "${p.label}" | ${p.type}`);
if (!archHit.length) console.log("  (nenhuma prop arquivada com 'cargo')");

// 2) Dump completo dos campos do form principal B2B Novo Oficial
const FORMS = {
  "B2B Novo Oficial": "3aa57411-f03d-4a57-b2aa-5e71facf2b41",
  "B2B Novo Oficial (whatsapp)": "72639e53-2ff2-4861-a0ab-869a84b4e9ea",
  "Formulario B2B - Oficial - Sem pagina de obrigado": "c4ab21ac-d655-4b48-b206-91a2a19abfbd",
};
for (const [nome, fid] of Object.entries(FORMS)) {
  console.log(`\n===== CAMPOS do form "${nome}" (${fid}) =====`);
  const f = await api(`https://api.hubapi.com/marketing/v3/forms/${fid}`);
  if (f.status !== 200) { console.log("  HTTP", f.status, f.text.slice(0,200)); continue; }
  (f.json.fieldGroups || []).forEach((g, gi) => {
    (g.fields || []).forEach(fl => {
      console.log(`  [g${gi}] ${fl.objectTypeId||""} ${fl.name}  req=${fl.required} hidden=${fl.hidden}  label="${fl.label}"`);
    });
  });
}
