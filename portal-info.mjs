// Verifica se o portal 49656171 é prod ou sandbox, e quais scopes o token tem
const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

console.log("--- 1) Account info ---");
const r1 = await fetch("https://api.hubapi.com/account-info/v3/details", {
  headers: { Authorization: "Bearer " + T },
});
const j1 = await r1.json();
console.log("HTTP", r1.status);
console.log(JSON.stringify(j1, null, 2));

console.log("\n--- 2) Token info (scopes) ---");
const r2 = await fetch("https://api.hubapi.com/integrations/v1/me", {
  headers: { Authorization: "Bearer " + T },
});
console.log("HTTP", r2.status);
const t2 = await r2.text();
console.log(t2.slice(0, 800));

console.log("\n--- 3) Total de contatos no portal ---");
const r3 = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
  headers: { Authorization: "Bearer " + T },
});
const j3 = await r3.json();
console.log("HTTP", r3.status, "- paging:", JSON.stringify(j3.paging));
console.log("Sample:", j3.results?.[0]?.properties?.email);

// Total via search
const r4 = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
  method: "POST",
  headers: { Authorization: "Bearer " + T, "Content-Type": "application/json" },
  body: JSON.stringify({ filterGroups: [], properties: ["email"], limit: 1 }),
});
const j4 = await r4.json();
console.log("Total de contatos no portal:", j4.total);
