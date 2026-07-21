const fs = require('fs'), path = require('path');
for (const f of ['.env.local', 'kiwify-credenciais.txt']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] = process.env[m[1]] || m[2].replace(/^["']|["']$/g, ''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
// 3 vendas em USD → converte pra BRL (rate ~5,1829 que fecha os R$171,96 da tela do Kiwify)
const inputs = [
  { id: '61005961851', properties: { amount: '177.26' } }, // Debora — upsell (US$34,20)
  { id: '61008706473', properties: { amount: '23.84' } },  // Debora — live (US$4,60)
  { id: '60887064332', properties: { amount: '11.97' } },  // Rafael — live (US$2,31)
];
(async () => {
  const r = await fetch('https://api.hubapi.com/crm/v3/objects/deals/batch/update', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs }) });
  const t = await r.text();
  console.log('HTTP', r.status);
  if (r.ok) { const j = JSON.parse(t); for (const d of j.results) console.log(`  ✓ ${d.id} → amount R$ ${d.properties.amount}`); }
  else console.log(t.slice(0, 400));
})();
