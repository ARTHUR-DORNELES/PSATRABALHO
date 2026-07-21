import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const f of ['kiwify-credenciais.txt', '.env.local']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const hs = async (url) => { const r = await fetch(url,{headers:{Authorization:`Bearer ${TOKEN}`}}); if(!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
for (const obj of ['contacts','deals']) {
  const j = await hs('https://api.hubapi.com/crm/v3/properties/' + obj);
  const utm = (j.results||[]).filter(p => /utm|tbs|tracking|origem/i.test(p.name + ' ' + p.label));
  console.log('\n=== ' + obj + ': ' + utm.length + ' props de UTM/TBS/origem ===');
  for (const p of utm.sort((a,b)=>a.name.localeCompare(b.name))) console.log('  ' + p.name + '  |  "' + p.label + '"  |  ' + p.type);
}
