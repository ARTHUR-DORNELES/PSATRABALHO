// Conserta o setting createNewContactForNewEmail do form TBS.
// Estava em false → todo submit de email novo era silenciosamente descartado.
// Mudando pra true → vai criar contato e registrar a submissão.

const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const FID = "3b15026a-9b09-418d-91cc-77ec76467823";

console.log("--- ANTES ---");
const before = await (await fetch(`https://api.hubapi.com/marketing/v3/forms/${FID}`, {
  headers: { Authorization: "Bearer " + T },
})).json();
console.log("createNewContactForNewEmail:", before.configuration?.createNewContactForNewEmail);

console.log("\n--- Aplicando PATCH ---");
const r = await fetch(`https://api.hubapi.com/marketing/v3/forms/${FID}`, {
  method: "PATCH",
  headers: { Authorization: "Bearer " + T, "Content-Type": "application/json" },
  body: JSON.stringify({
    configuration: {
      ...before.configuration,
      createNewContactForNewEmail: true,
    },
  }),
});
const after = await r.json();
console.log("HTTP", r.status);

console.log("\n--- DEPOIS ---");
console.log("createNewContactForNewEmail:", after.configuration?.createNewContactForNewEmail);
console.log("(Se mostrou true, o form agora aceita emails novos e registra submissões)");
