const XLSX=require('xlsx'),fs=require('fs');
const CSV="C:/Users/Usuário/Downloads/hubspot-csv-export-historico-do-fluxo-de-trabalho-2026-06-29.csv";
const env=fs.readFileSync('tbs-2026-dashboard/.env.local','utf8');
const TOKEN=(env.match(/^HUBSPOT_TOKEN=(.+)$/m)||[])[1].trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
const PIPE='904543067',FECHADO='1372708683';
const isUp=s=>String(s||'').toLowerCase().includes('formato de aulas');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const wb=XLSX.read(fs.readFileSync(CSV,'utf8'),{type:'string'});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
 // contato -> data de entrada mais antiga
 const enroll=new Map();
 for(const r of rows){const id=String(r['ID do registro de gatilho']||'');const dt=String(r['Data do gatilho (BRT)']||'');if(!id)continue;if(!enroll.has(id)||dt<enroll.get(id))enroll.set(id,dt);}
 const ids=[...enroll.keys()];
 const dates=[...enroll.values()].sort();
 console.log(`Linhas: ${rows.length} · contatos ÚNICOS inscritos: ${ids.length}`);
 console.log(`Entrada: de ${dates[0]} até ${dates[dates.length-1]}`);
 // associações contato -> deals
 const c2d=new Map();
 for(let i=0;i<ids.length;i+=100){const aj=await(await fetch('https://api.hubapi.com/crm/v3/associations/contacts/deals/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:ids.slice(i,i+100).map(id=>({id}))})})).json();for(const r of aj.results||[]){c2d.set(String(r.from.id),(r.to||[]).map(t=>String(t.toObjectId||t.id)));}await sleep(120);}
 const allDeals=[...new Set([].concat(...[...c2d.values()]))];
 // lê deals
 const dealById=new Map();
 for(let i=0;i<allDeals.length;i+=100){const bj=await(await fetch('https://api.hubapi.com/crm/v3/objects/deals/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:allDeals.slice(i,i+100).map(id=>({id})),properties:['dealname','dealstage','pipeline','amount','createdate']})})).json();for(const d of bj.results||[])dealById.set(String(d.id),d.properties);await sleep(120);}
 // por contato: comprou (fechado TBSchool) DEPOIS de entrar?
 let comprou=0,compLive=0,compUp=0,receita=0,jaTinhaAntes=0;
 const numBR=v=>parseFloat(String(v||'0').replace(',','.'))||0;
 for(const id of ids){
   const enr=enroll.get(id); const enrISO=enr.length>=10?enr:'';
   const deals=(c2d.get(id)||[]).map(did=>dealById.get(did)).filter(p=>p&&p.pipeline===PIPE&&p.dealstage===FECHADO);
   if(!deals.length)continue;
   const after=deals.filter(p=>{const cd=(p.createdate||'');const cdISO=cd.length>=10?new Date(cd).toISOString():'';return cdISO && cdISO.slice(0,19)>=enrISO.slice(0,19);});
   const before=deals.filter(p=>!after.includes(p));
   if(before.length)jaTinhaAntes++;
   if(after.length){comprou++;for(const p of after){if(isUp(p.dealname))compUp++;else compLive++;receita+=numBR(p.amount);}}
 }
 console.log(`\n=== ATRIBUIÇÃO ===`);
 console.log(`Inscritos no fluxo: ${ids.length}`);
 console.log(`Compraram DEPOIS de entrar: ${comprou} (${(comprou/ids.length*100).toFixed(1)}%)`);
 console.log(`  → live: ${compLive} · gravação: ${compUp}`);
 console.log(`  → receita desses negócios: R$${receita.toFixed(2)}`);
 console.log(`(contatos que já tinham negócio fechado ANTES de entrar: ${jaTinhaAntes})`);
}) ().catch(e=>console.log('ERRO',e.message));
