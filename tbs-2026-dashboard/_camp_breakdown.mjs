import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const f of ['kiwify-credenciais.txt', '.env.local']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const PIPELINE='904543067', FECHADO='1372708683';
const num = (s)=>parseFloat(String(s||'0').replace(',','.'))||0;
const hs = async (url,opts={})=>{ const r=await fetch(url,{...opts,headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json',...(opts.headers||{})}}); if(!r.ok) throw new Error(r.status+' '+await r.text()); return r.json(); };
const deals=[]; let after;
do { const body={ filterGroups:[{filters:[{propertyName:'pipeline',operator:'EQ',value:PIPELINE}]}], properties:['dealstage','amount','amount_in_home_currency'], limit:100, ...(after?{after}:{}) };
  const j=await hs('https://api.hubapi.com/crm/v3/objects/deals/search',{method:'POST',body:JSON.stringify(body)}); deals.push(...j.results); after=j.paging?.next?.after; } while(after);
const assoc=new Map();
for (let i=0;i<deals.length;i+=100){ const j=await hs('https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read',{method:'POST',body:JSON.stringify({inputs:deals.slice(i,i+100).map(d=>({id:d.id}))})}); for (const r of j.results||[]) assoc.set(String(r.from.id),(r.to||[]).map(t=>String(t.toObjectId))); }
const cids=[...new Set([...assoc.values()].flat())];
const cprops=new Map();
for (let i=0;i<cids.length;i+=100){ const j=await hs('https://api.hubapi.com/crm/v3/objects/contacts/batch/read',{method:'POST',body:JSON.stringify({properties:['utm_source_tbs','utm_campaign_tbs'],inputs:cids.slice(i,i+100).map(id=>({id}))})}); for (const c of j.results||[]) cprops.set(String(c.id),c.properties); }
const cv=(d,f)=>{ for (const cid of assoc.get(d.id)||[]){ const p=cprops.get(cid); if(p&&p[f]&&String(p[f]).trim()) return String(p[f]).trim(); } return ''; };
const g={}; let filled=0;
for (const d of deals){ const camp=cv(d,'utm_campaign_tbs')||'(vazio)'; if(camp!=='(vazio)') filled++; const src=cv(d,'utm_source_tbs')||'?'; (g[camp]??={n:0,won:0,rev:0,src:{}}); g[camp].n++; g[camp].src[src]=(g[camp].src[src]||0)+1; if(d.properties.dealstage===FECHADO){g[camp].won++; g[camp].rev+=num(d.properties.amount_in_home_currency||d.properties.amount);} }
console.log('utm_campaign_tbs preenchido '+filled+'/'+deals.length+' ('+(100*filled/deals.length).toFixed(0)+'%)\n');
console.log('  campanha'.padEnd(40)+'fonte'.padEnd(11)+'deals'.padStart(6)+'fech'.padStart(6)+'conv'.padStart(6)+'      receita');
for (const [k,v] of Object.entries(g).sort((a,b)=>b[1].rev-a[1].rev).slice(0,20)){ const topSrc=Object.entries(v.src).sort((a,b)=>b[1]-a[1])[0][0]; console.log('  '+k.slice(0,38).padEnd(40)+topSrc.slice(0,9).padEnd(11)+String(v.n).padStart(6)+String(v.won).padStart(6)+((v.n?(100*v.won/v.n).toFixed(0):'0')+'%').padStart(6)+('   R$ '+v.rev.toFixed(0)).padStart(14)); }
