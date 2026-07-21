// Conta inscritos por sinal "Otaviano" separando pago x orgânico. Só leitura.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const f of ['kiwify-credenciais.txt', '.env.local']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const INSCRITO = { propertyName: 'inscrito_tbs_2026', operator: 'EQ', value: 'Sim' };
async function count(filters) {
  const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ filterGroups: [{ filters }], limit: 1 }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()).total;
}
const CT = (prop, val) => ({ propertyName: prop, operator: 'CONTAINS_TOKEN', value: val });
const EQ = (prop, val) => ({ propertyName: prop, operator: 'EQ', value: val });
(async () => {
  const termOta = await count([INSCRITO, CT('utm_term_tbs', '*otaviano*')]);
  const contentTotal = await count([INSCRITO, CT('utm_content_tbs', '*otaviano*')]);
  const contentPaid = await count([INSCRITO, CT('utm_content_tbs', '*otaviano*'), EQ('utm_medium_tbs', 'paid_social')]);
  const contentSocial = await count([INSCRITO, CT('utm_content_tbs', '*otaviano*'), EQ('utm_medium_tbs', 'social')]);
  console.log('\n── Inscritos por sinal Otaviano ──');
  console.log(`  utm_term ~otaviano (redes/ManyChat):      ${termOta}`);
  console.log(`  utm_content ~Otaviano TOTAL:              ${contentTotal}`);
  console.log(`    • medium=paid_social (PAGO, fica):      ${contentPaid}`);
  console.log(`    • medium=social (ORGÂNICO → Otaviano):  ${contentSocial}`);
  console.log(`    • outros mediums:                       ${contentTotal - contentPaid - contentSocial}`);
  console.log(`\n  ORGÂNICO do Otaviano (term + content social) ≈ ${termOta + contentSocial}`);
  console.log(`  PAGO (criativo Otaviano, fica em Social Pago) ≈ ${contentPaid}\n`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
