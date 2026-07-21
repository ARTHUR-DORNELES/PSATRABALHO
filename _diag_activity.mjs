// Mede atividade RECENTE relacionada aos workflows que leem cargo__oficial_ /
// quantos_colabores_tem_na_empresa_, e pega portalId p/ montar os links.
import fs from "node:fs";
const envTxt = fs.readFileSync(new URL("./psa-bonus-dashboard/.env", import.meta.url), "utf8");
const TOKEN = (envTxt.match(/HUBSPOT_PRIVATE_APP_TOKEN=(\S+)/) || [])[1];
const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers||{}) } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t };
}
const now = Date.now();
const d30 = now - 30*864e5, d90 = now - 90*864e5;
const D = ms => new Date(ms).toISOString().slice(0,10);
console.log(`Hoje=${D(now)}  |  janela 30d>=${D(d30)}  90d>=${D(d90)}\n`);

// portalId
const acc = await api("https://api.hubapi.com/account-info/v3/details");
const portalId = acc.json?.portalId;
console.log("portalId:", portalId, " região:", acc.json?.uiDomain, "\n");

async function count(obj, filters, label) {
  const r = await api(`https://api.hubapi.com/crm/v3/objects/${obj}/search`, {
    method:"POST", body: JSON.stringify({ filterGroups:[{filters}], limit:1, properties:["hs_object_id"] }) });
  const tot = r.json?.total ?? `ERR ${r.status} ${r.text.slice(0,120)}`;
  console.log(`  ${label}: ${tot}`);
  return r.json?.total ?? 0;
}

console.log("=== 1751174289 — Cria LEAD B2B (gatilho = envio de form) ===");
const B2B_FORMS = {
  "B2B Novo Oficial": "3aa57411-f03d-4a57-b2aa-5e71facf2b41",
  "B2B Novo Oficial (whatsapp)": "72639e53-2ff2-4861-a0ab-869a84b4e9ea",
  "B2B sem pág obrigado": "c4ab21ac-d655-4b48-b206-91a2a19abfbd",
};
for (const [nome, guid] of Object.entries(B2B_FORMS)) {
  const s = await api(`https://api.hubapi.com/form-integrations/v1/submissions/forms/${guid}?limit=50`);
  const subs = s.json?.results || [];
  const times = subs.map(x=>x.submittedAt).filter(Boolean).sort((a,b)=>b-a);
  const c30 = times.filter(t=>t>=d30).length, c90 = times.filter(t=>t>=d90).length;
  console.log(`  form "${nome}": últimas ${subs.length} subs | mais recente=${times[0]?D(times[0]):"-"} | últimos30d=${c30} últimos90d=${c90}${times.length===50?" (>=50, pode haver mais)":""}`);
}
console.log("  -- branch de qualificação (action 45) usa os 2 campos --");
await count("contacts",[{propertyName:"quantos_colabores_tem_na_empresa_",operator:"IN",values:["1-10","11-50"]},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "contatos criados 90d c/ porte 1-50 (seriam barrados)");
await count("contacts",[{propertyName:"cargo__oficial_",operator:"IN",values:["Estagiário","Outro"]},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "contatos criados 90d c/ cargo Estagiário/Outro (seriam barrados)");

console.log("\n=== 1717726261 — Boas-vindas Executivos ===");
await count("contacts",[{propertyName:"cargo__oficial_",operator:"IN",values:["Presidente/CEO","Gerente","Diretor/Head"]},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "contatos criados 90d c/ cargo executivo");
await count("contacts",[{propertyName:"cargo__oficial_",operator:"IN",values:["Presidente/CEO","Gerente","Diretor/Head"]},{propertyName:"createdate",operator:"GTE",value:String(d30)}], "contatos criados 30d c/ cargo executivo");
await count("deals",[{propertyName:"dealstage",operator:"EQ",value:"1079623682"},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "negócios criados 90d na etapa-gatilho 1079623682");

console.log("\n=== 1652646795 / 1654405420 — Advisor (porte) ===");
await count("contacts",[{propertyName:"lead_qualificado",operator:"EQ",value:"Sím"},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "contatos criados 90d c/ lead_qualificado=Sím (gatilho Qualificação)");
await count("deals",[{propertyName:"dealstage",operator:"EQ",value:"1060874681"},{propertyName:"createdate",operator:"GTE",value:String(d90)}], "negócios criados 90d na etapa 1060874681 (gatilho Move p/ Prospects)");

console.log("\n=== 1743612472 — Cria Negócio (gatilho parece placeholder) ===");
await count("deals",[{propertyName:"hs_pipeline_stage",operator:"EQ",value:"qualified-stage-id"}], "negócios c/ stage = 'qualified-stage-id' (esperado 0 = inerte)");

console.log("\n=== Cobertura geral dos 2 campos (todos os contatos) ===");
await count("contacts",[{propertyName:"cargo__oficial_",operator:"HAS_PROPERTY"}], "contatos com cargo__oficial_ preenchido (total)");
await count("contacts",[{propertyName:"quantos_colabores_tem_na_empresa_",operator:"HAS_PROPERTY"}], "contatos com quantos_colabores preenchido (total)");
await count("contacts",[{propertyName:"cargo__oficial_",operator:"HAS_PROPERTY"},{propertyName:"createdate",operator:"GTE",value:String(d30)}], "  ^ destes, criados nos últimos 30d");
await count("contacts",[{propertyName:"quantos_colabores_tem_na_empresa_",operator:"HAS_PROPERTY"},{propertyName:"createdate",operator:"GTE",value:String(d30)}], "  ^ destes, criados nos últimos 30d");
