const XLSX=require('xlsx'),fs=require('fs');
const {hsFetch,hsSearchAllPaged}=require('./_kiwify_http.cjs');
const CSV=process.argv[2]; const APPLY=process.argv.includes('--apply');
const env=fs.readFileSync('tbs-2026-dashboard/.env.local','utf8');
const TOKEN=(env.match(/^HUBSPOT_TOKEN=(.+)$/m)||[])[1].trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
const PIPELINE='904543067',FECHADO='1372708683';
const UUID_TRIP='0831ef90-5b8e-11f1-8224-13e0b2554faa',UUID_UP='a6e42810-5b8e-11f1-bcec-81ce96602d5b';
const lc=s=>String(s||'').trim().toLowerCase();
const normNome=s=>lc(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ');
const isUp=s=>lc(s).includes('formato de aulas');
const emailFromChave=c=>lc(String(c||'').replace(new RegExp(`_(${UUID_TRIP}|${UUID_UP})$`,'i'),''));
const numBR=v=>{const s=String(v).replace(/[^\d,.-]/g,'');if(s.includes(',')&&s.includes('.'))return parseFloat(s.replace(/\./g,'').replace(',','.'));return parseFloat(s.replace(',','.'))||0;};
const toMs=v=>{ if(v instanceof Date) return v.getTime(); const s=String(v); let m=s.match(/(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{2}):(\d{2})/); if(m)return Date.UTC(+m[3],+m[2]-1,+m[1],+m[4]+3,+m[5]); m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/); if(m)return Date.UTC(+m[3],+m[2]-1,+m[1],15); const n=parseFloat(s); if(!isNaN(n)&&n>40000)return Math.round((n-25569)*86400*1000); return Date.now(); };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 // raw:true — impede o XLSX de "adivinhar" datas no CSV (dd/mm vira mm/dd e a venda cai no mês errado)
 const wb=XLSX.read(fs.readFileSync(CSV,'utf8'),{type:'string',raw:true});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
 const paid=rows.filter(r=>lc(r.Status)==='paid');
 // todos os negócios atuais (todos estágios) → chaves existentes (email|tipo, nome|tipo)
 const deals=await hsSearchAllPaged(H,'deals',[{filters:[{propertyName:'pipeline',operator:'EQ',value:PIPELINE}]}],['dealname','kiwify_chave']);
 const semCh=deals.filter(d=>!d.properties.kiwify_chave);const d2c=new Map();
 for(let i=0;i<semCh.length;i+=100){const aj=await hsFetch('https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:semCh.slice(i,i+100).map(d=>({id:d.id}))})});for(const r of aj.results||[])if(r.to?.length)d2c.set(r.from.id,r.to[0].id);}
 const cids0=[...new Set([...d2c.values()])];const emailByC=new Map();
 for(let i=0;i<cids0.length;i+=100){const j=await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:cids0.slice(i,i+100).map(id=>({id})),properties:['email']})});for(const c of j.results||[])emailByC.set(c.id,lc(c.properties.email));}
 const exist=new Set();
 for(const d of deals){const t=isUp(d.properties.dealname)?'up':'live';const e=emailFromChave(d.properties.kiwify_chave)||emailByC.get(d2c.get(d.id))||'';if(e)exist.add(`${e}|${t}`);const nm=normNome((d.properties.dealname||'').split(' - ')[0]);if(nm)exist.add(`N:${nm}|${t}`);}
 // a criar: pagas sem chave existente (por e-mail OU nome)
 const seenKey=new Set();const toCreate=[];
 for(const r of paid){const t=isUp(r.Produto)?'up':'live';const e=lc(r.Email);const nm=normNome(r.Cliente);
   const k=`${e}|${t}`;if(exist.has(k)||exist.has(`N:${nm}|${t}`))continue;if(seenKey.has(k))continue;seenKey.add(k);
   toCreate.push({r,t,e,nm});}
 console.log(`Pagas: ${paid.length} · negócios atuais: ${deals.length} · A CRIAR: ${toCreate.length}`);
 // casa contato por e-mail (search em lotes)
 const emails=[...new Set(toCreate.map(x=>x.e).filter(Boolean))];const cByEmail=new Map();
 for(let i=0;i<emails.length;i+=100){const j=await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/search',{method:'POST',headers:H,body:JSON.stringify({filterGroups:[{filters:[{propertyName:'email',operator:'IN',values:emails.slice(i,i+100)}]}],properties:['email'],limit:100})});for(const c of j.results||[])cByEmail.set(lc(c.properties.email),c.id);}
 const semContato=toCreate.filter(x=>!cByEmail.get(x.e));
 console.log(`Casados a contato: ${toCreate.length-semContato.length} · SEM contato: ${semContato.length}`);
 console.log('Amostra (5):');toCreate.slice(0,5).forEach(x=>console.log(`  ${x.e} · ${x.t} · R$${numBR(x.r['Valor líquido'])} · ${cByEmail.get(x.e)?'contato '+cByEmail.get(x.e):'SEM contato'} · "${x.r.Cliente} - ${x.r.Produto}".slice`));
 if(!APPLY){console.log('\n(dry-run — rode com --apply)');return;}
 // cria em lotes de 100 com associação inline
 let ok=0,fail=0;
 for(let i=0;i<toCreate.length;i+=100){
   const inputs=toCreate.slice(i,i+100).map(x=>{const amt=numBR(x.r['Valor líquido']);const obj={properties:{dealname:`${x.r.Cliente} - ${x.r.Produto}`.slice(0,250),amount:String(amt),pipeline:PIPELINE,dealstage:FECHADO,kiwify_chave:`${x.e}_${x.t==='up'?UUID_UP:UUID_TRIP}`,createdate:String(toMs(x.r['Data de Criação']))}};const cid=cByEmail.get(x.e);if(cid)obj.associations=[{to:{id:cid},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:3}]}];return obj;});
   try{const j=await hsFetch('https://api.hubapi.com/crm/v3/objects/deals/batch/create',{method:'POST',headers:H,body:JSON.stringify({inputs})});ok+=(j.results||[]).length;}
   catch(e){fail+=inputs.length;console.log('  FALHOU lote:',e.message.slice(0,200));}
 }
 console.log(`\nCriados: ${ok} · falhas: ${fail}`);
})();
