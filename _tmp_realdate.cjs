const fs=require('fs');
const env=fs.readFileSync('tbs-2026-dashboard/.env.local','utf8');
const TOKEN=(env.match(/^HUBSPOT_TOKEN=(.+)$/m)||[])[1].trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
const ymd=v=>{ if(!v)return '—'; const s=String(v); if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10); const n=Number(s); if(!isNaN(n)&&n>1e11)return new Date(n).toISOString().slice(0,16).replace('T',' '); return s; };
const deals=['61459750448','61432801567','61432801568'];
(async()=>{
 for(const id of deals){
   const d=await(await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}?properties=dealname,createdate,amount`,{headers:H})).json();
   const aj=await(await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}/associations/contacts`,{headers:H})).json();
   const cid=(aj.results||[])[0]?.id || (aj.results||[])[0]?.toObjectId;
   let cprops={};
   if(cid){const c=await(await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${cid}?properties=email,recent_conversion_date,tbschool__data_do_pagamento,createdate`,{headers:H})).json();cprops=c.properties||{};}
   console.log(`\n${id} · "${(d.properties.dealname||'').slice(0,30)}" · R$${d.properties.amount}`);
   console.log(`  deal.createdate: ${ymd(d.properties.createdate)}`);
   console.log(`  contato ${cid||'?'} <${cprops.email||'?'}>`);
   console.log(`    recent_conversion_date: ${ymd(cprops.recent_conversion_date)}`);
   console.log(`    tbschool__data_do_pagamento: ${ymd(cprops.tbschool__data_do_pagamento)}`);
   console.log(`    contato.createdate: ${ymd(cprops.createdate)}`);
 }
}) ().catch(e=>console.log('ERRO',e.message));
