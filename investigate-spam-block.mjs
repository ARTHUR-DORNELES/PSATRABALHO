// Investiga se as submissões estão sendo bloqueadas por spam/captcha
const T = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const FID = "3b15026a-9b09-418d-91cc-77ec76467823";

// 1) Pega config completa do form, incluindo spam protection
console.log("=== Config completa do form ===\n");
const r1 = await fetch(`https://api.hubapi.com/marketing/v3/forms/${FID}`, {
  headers: { Authorization: "Bearer " + T },
});
const f = await r1.json();
console.log("name:", f.name);
console.log("formType:", f.formType);
console.log("\nconfiguration:");
console.log(JSON.stringify(f.configuration, null, 2));
console.log("\nlegalConsentOptions:");
console.log(JSON.stringify(f.legalConsentOptions, null, 2));
console.log("\ndisplayOptions:");
console.log(JSON.stringify(f.displayOptions, null, 2));

// 2) Tenta endpoint legacy v2 que retorna mais detalhes
console.log("\n=== Endpoint v2 (mais detalhes de spam) ===\n");
const r2 = await fetch(`https://api.hubapi.com/forms/v2/forms/${FID}`, {
  headers: { Authorization: "Bearer " + T },
});
console.log("HTTP", r2.status);
if (r2.ok) {
  const fv2 = await r2.json();
  console.log("captchaEnabled:", fv2.captchaEnabled);
  console.log("inlineMessage:", fv2.inlineMessage?.slice(0, 100));
  console.log("notifyRecipients:", fv2.notifyRecipients);
  console.log("submitText:", fv2.submitText);
}

// 3) Confirma que o deploy novo da LP está com embed v2
console.log("\n=== Confirma embed atual na URL pública ===\n");
const r3 = await fetch("https://tbday-sorteio.vercel.app/");
const html = await r3.text();
const hasV2 = html.includes("js.hsforms.net/forms/embed/v2.js");
const hasV2create = html.includes("hbspt.forms.create");
const hasOld = html.includes("js.hsforms.net/forms/embed/49656171.js");
console.log("Embed v2 (novo, deveria estar):", hasV2 && hasV2create ? "✓ SIM" : "✗ NÃO");
console.log("Embed Form 2.0 (antigo, não deveria):", hasOld ? "⚠ AINDA TEM" : "✓ removido");
