import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const f of ['kiwify-credenciais.txt', '.env.local']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) { console.error('x sem HUBSPOT_TOKEN'); process.exit(1); }
const PIPELINE = '904543067';
const STAGE = { '1372708683':'fechado','1372708679':'aguardando','1372708678':'abandono','1372708684':'perdido' };
const num = (s) => parseFloat(String(s||'0').replace(',','.'))||0;
const hs = async (url,opts={}) => { const r = await fetch(url,{...opts,headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json',...(opts.headers||{})}}); if(!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
const out=[]; let after;
do { const body={ filterGroups:[{filters:[{propertyName:'pipeline',operator:'EQ',value:PIPELINE}]}], properties:['dealstage','amount','amount_in_home_currency'], limit:100, ...(after?{after}:{}) };
  const j = await hs('https://api.hubapi.com/crm/v3/objects/deals/search',{method:'POST',body:JSON.stringify(body)}); out.push(...j.results); after=j.paging?.next?.after; } while(after);
const by={};
for (const d of out){ const s=STAGE[d.properties.dealstage]||('stage:'+d.properties.dealstage); by[s]??={n:0,amt:0}; by[s].n++; by[s].amt+=num(d.properties.amount_in_home_currency||d.properties.amount); }
console.log('\nPipeline TBSchool (904543067) -- ' + out.length + ' negocios\n');
console.log('  stage         qtd      R$');
for (const [s,v] of Object.entries(by).sort((a,b)=>b[1].amt-a[1].amt)) console.log('  ' + s.padEnd(12) + ' ' + String(v.n).padStart(4) + '  R$ ' + v.amt.toFixed(2));
const stuck=(by.abandono?.n||0)+(by.aguardando?.n||0);
const stuckV=(by.abandono?.amt||0)+(by.aguardando?.amt||0);
console.log('\n  PRESOS (abandono+aguardando): ' + stuck + ' negocios · R$ ' + stuckV.toFixed(2) + ' -- candidatos a venda paga nao promovida (confirmar vs Kiwify)');
