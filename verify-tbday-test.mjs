// Verifica se o teste de submit criou contato e/ou aparece nas submissões
const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

console.log("--- 1) Procurando contatos com email contendo 'tbday-debug' ---");
const r1 = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
  method: "POST",
  headers: { Authorization: "Bearer " + T, "Content-Type": "application/json" },
  body: JSON.stringify({
    filterGroups: [{ filters: [{ propertyName: "email", operator: "CONTAINS_TOKEN", value: "tbday-debug" }] }],
    properties: ["email", "firstname", "lastname", "createdate", "hs_analytics_source"],
    limit: 10,
  }),
});
const j1 = await r1.json();
console.log("HTTP", r1.status, "- total:", j1.total ?? (j1.results?.length || 0));
for (const c of j1.results ?? []) {
  console.log("  -", c.properties.email, "|", c.properties.firstname, c.properties.lastname, "| criado:", c.properties.createdate, "| source:", c.properties.hs_analytics_source);
}

console.log("\n--- 2) Re-fetch submissões do form ---");
const r2 = await fetch("https://api.hubapi.com/form-integrations/v1/submissions/forms/3b15026a-9b09-418d-91cc-77ec76467823?limit=20", {
  headers: { Authorization: "Bearer " + T },
});
const j2 = await r2.json();
console.log("HTTP", r2.status, "- submissions:", j2.results?.length || 0);
for (const s of (j2.results ?? [])) {
  const email = (s.values || []).find((v) => v.name === "email")?.value;
  console.log("  -", new Date(s.submittedAt).toISOString(), email);
}

console.log("\n--- 3) Lista de contatos mais recentes (qualquer email) ---");
const r3 = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=5&sorts=-createdate&properties=email,firstname,createdate,hs_analytics_source", {
  headers: { Authorization: "Bearer " + T },
});
const j3 = await r3.json();
console.log("HTTP", r3.status);
for (const c of (j3.results ?? []).slice(0, 5)) {
  console.log("  -", c.properties.createdate, "|", c.properties.email, "| source:", c.properties.hs_analytics_source);
}
