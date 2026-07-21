const fs=require('fs');
const env=fs.readFileSync('tbs-2026-dashboard/.env.local','utf8');
const TOKEN=(env.match(/^HUBSPOT_TOKEN=(.+)$/m)||[])[1].trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
const flows=['1842773326','1842419242','1843104673'];
const get=async u=>{const r=await fetch(u,{headers:H});const t=await r.text();return {status:r.status,body:t};};
(async()=>{
 for(const id of flows){
   console.log(`\n===== FLOW ${id} =====`);
   // v4 flows
   let r=await get(`https://api.hubapi.com/automation/v4/flows/${id}`);
   if(r.status===200){const j=JSON.parse(r.body);console.log(`  v4: nome="${j.name}" · type=${j.type} · isEnabled=${j.isEnabled} · createdAt=${j.createdAt} · updatedAt=${j.updatedAt}`);}
   else console.log(`  v4 flows: HTTP ${r.status} · ${r.body.slice(0,160)}`);
 }
 // probe endpoints de inscritos num flow
 console.log('\n===== PROBE enrollment endpoints (flow 1842773326) =====');
 for(const u of [
   'https://api.hubapi.com/automation/v4/flows/1842773326/enrollments',
   'https://api.hubapi.com/automation/v3/workflows/1842773326',
   'https://api.hubapi.com/automation/v3/workflows/1842773326/enrollments/contacts',
 ]){const r=await get(u);console.log(`  ${u.replace('https://api.hubapi.com','')} → HTTP ${r.status} ${r.body.slice(0,120)}`);}
}) ().catch(e=>console.log('ERRO',e.message));
