// Diagnóstico do form da LP The Best Day:
//   1) Confirma que o token tem acesso ao portal (lista alguns forms)
//   2) Pega os settings do form específico (estado, restrições de domínio)
//   3) Testa o endpoint de submissões de novo com mais info de erro

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const FORM_GUID = "3b15026a-9b09-418d-91cc-77ec76467823";

async function callApi(url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const body = await r.text();
  return { status: r.status, body };
}

// 1) Lista alguns forms pra ver se o GUID alvo aparece
console.log("=== 1) Lista de forms no portal (primeiros 20) ===\n");
const list = await callApi("https://api.hubapi.com/marketing/v3/forms?limit=20");
console.log(`HTTP ${list.status}`);
if (list.status !== 200) {
  console.log("Body:", list.body.slice(0, 800));
} else {
  const data = JSON.parse(list.body);
  const matches = (data.results ?? []).filter((f) => f.id === FORM_GUID || f.name?.toLowerCase().includes("best") || f.name?.toLowerCase().includes("sorteio") || f.name?.toLowerCase().includes("inova"));
  console.log(`Total retornado: ${data.results?.length ?? 0}`);
  console.log("\nForms relacionados (Best/Sorteio/Inovação):");
  for (const f of matches) {
    console.log(`  - ${f.id}  ${f.archived ? "[ARQUIVADO]" : ""}  →  ${f.name}`);
  }
  console.log("\nGUID que estamos usando na LP:", FORM_GUID);
  const exists = (data.results ?? []).some((f) => f.id === FORM_GUID);
  console.log(`Existe na lista? ${exists ? "SIM" : "NÃO (ou está fora dos primeiros 20)"}`);
}

// 2) Pega detalhes do form
console.log("\n=== 2) Detalhes do form alvo ===\n");
const detail = await callApi(`https://api.hubapi.com/marketing/v3/forms/${FORM_GUID}`);
console.log(`HTTP ${detail.status}`);
if (detail.status !== 200) {
  console.log("Body:", detail.body.slice(0, 800));
} else {
  const f = JSON.parse(detail.body);
  console.log("Nome:", f.name);
  console.log("Tipo:", f.formType);
  console.log("Criado em:", f.createdAt);
  console.log("Atualizado em:", f.updatedAt);
  console.log("Arquivado?", f.archived);
  if (f.configuration) {
    console.log("Restrição de domínios:", JSON.stringify(f.configuration?.allowLinkToResetKnownValues ?? "n/a"));
  }
  console.log("\nCampos do form:");
  (f.fieldGroups ?? []).forEach((g, gi) => {
    (g.fields ?? []).forEach((field) => {
      console.log(`  - [${field.fieldType}] ${field.name} → ${field.label}`);
    });
  });
}

// 3) Retest submissions endpoint
console.log("\n=== 3) Endpoint de submissões (com paginação) ===\n");
const subs = await callApi(`https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_GUID}?limit=50`);
console.log(`HTTP ${subs.status}`);
if (subs.status !== 200) console.log("Body:", subs.body.slice(0, 800));
else {
  const data = JSON.parse(subs.body);
  console.log("Total de submissões retornadas:", data.results?.length ?? 0);
}
