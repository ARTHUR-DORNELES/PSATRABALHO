// Move p/ Perdido os negócios FECHADOS do TBSchool que NÃO têm venda 'paid' no Kiwify.
// Set-based (e-mail|tipo OU nome|tipo): protege quem está pago; só pega reembolsado/recusado/aguardando/sem-registro.
const XLSX=require('xlsx'),fs=require('fs');
const {hsFetch,hsSearchAllPaged}=require('./_kiwify_http.cjs');
const CSV=process.argv[2]; const APPLY=process.argv.includes('--apply');
const env=fs.readFileSync('tbs-2026-dashboard/.env.local','utf8');
const TOKEN=(env.match(/^HUBSPOT_TOKEN=(.+)$/m)||[])[1].trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
const PIPELINE='904543067',FECHADO='1372708683',PERDIDO='1372708684';
const UUID_TRIP='0831ef90-5b8e-11f1-8224-13e0b2554faa',UUID_UP='a6e42810-5b8e-11f1-bcec-81ce96602d5b';
const lc=s=>String(s||'').trim().toLowerCase();
const normNome=s=>lc(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ');
const isUp=s=>lc(s).includes('formato de aulas');
const emailFromChave=c=>lc(String(c||'').replace(new RegExp(`_(${UUID_TRIP}|${UUID_UP})$`,'i'),''));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const wb=XLSX.read(fs.readFileSync(CSV,'utf8'),{type:'string'});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
 const paid=rows.filter(r=>lc(r.Status)==='paid');
 const paidKeys=new Set();
 for(const r of paid){const t=isUp(r.Produto)?'up':'live';const e=lc(r.Email);const nm=normNome(r.Cliente);if(e)paidKeys.add(`${e}|${t}`);if(nm)paidKeys.add(`N:${nm}|${t}`);}
 // status de cada pessoa (qualquer produto) p/ explicar o motivo
 const stByEmail=new Map(),stByName=new Map();
 for(const r of rows){const e=lc(r.Email),nm=normNome(r.Cliente),st=lc(r.Status);if(e){(stByEmail.get(e)||stByEmail.set(e,new Set()).get(e)).add(st);}if(nm){(stByName.get(nm)||stByName.set(nm,new Set()).get(nm)).add(st);}}
 // FECHADOS
 const deals=await hsSearchAllPaged(H,'deals',[{filters:[{propertyName:'pipeline',operator:'EQ',value:PIPELINE},{propertyName:'dealstage',operator:'EQ',value:FECHADO}]}],['dealname','kiwify_chave','amount']);
 // e-mail de contato p/ os sem chave
 const semCh=deals.filter(d=>!d.properties.kiwify_chave);const d2c=new Map();
 for(let i=0;i<semCh.length;i+=100){const aj=await hsFetch('https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:semCh.slice(i,i+100).map(d=>({id:d.id}))})});for(const r of aj.results||[])if(r.to?.length)d2c.set(r.from.id,r.to[0].id);}
 const cids=[...new Set([...d2c.values()])];const emailByC=new Map();
 for(let i=0;i<cids.length;i+=100){const j=await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read',{method:'POST',headers:H,body:JSON.stringify({inputs:cids.slice(i,i+100).map(id=>({id})),properties:['email']})});for(const c of j.results||[])emailByC.set(c.id,lc(c.properties.email));}
 const toPerdido=[];
 for(const d of deals){
   const t=isUp(d.properties.dealname)?'up':'live';
   const e=emailFromChave(d.properties.kiwify_chave)||emailByC.get(d2c.get(d.id))||'';
   const nm=normNome((d.properties.dealname||'').split(' - ')[0]);
   if((e&&paidKeys.has(`${e}|${t}`))||(nm&&paidKeys.has(`N:${nm}|${t}`)))continue; // tem paid -> mantém
   const sts=new Set([...(stByEmail.get(e)||[]),...(stByName.get(nm)||[])]);
   let reason='SEM registro no Kiwify';
   if(sts.has('refunded'))reason='reembolsado';
   else if(sts.has('chargedback'))reason='estorno (chargeback)';
   else if(sts.has('waiting_payment'))reason='aguardando pagamento';
   else if(sts.has('refused'))reason='recusado';
   // blindagem lag-de-export: "sem registro" MAS com kiwify_chave = venda real criada pelo n8n
   // que ainda não entrou neste CSV. NÃO demover (foi o erro da Laura/Mariana).
   if(reason==='SEM registro no Kiwify'&&d.properties.kiwify_chave){continue;}
   toPerdido.push({d,t,e:e||nm,reason});
 }
 console.log(`Fechados: ${deals.length} · A MOVER p/ Perdido: ${toPerdido.length}`);
 toPerdido.forEach(x=>console.log(`  ${x.d.id} · "${(x.d.properties.dealname||'').slice(0,42)}" · ${x.e} · ${x.t} · R$${x.d.properties.amount} · ${x.reason}`));
 if(!APPLY){console.log('\n(dry-run — rode com --apply)');return;}
 let ok=0,fail=0;
 for(let i=0;i<toPerdido.length;i+=100){
   const inputs=toPerdido.slice(i,i+100).map(x=>({id:x.d.id,properties:{dealstage:PERDIDO}}));
   try{const j=await hsFetch('https://api.hubapi.com/crm/v3/objects/deals/batch/update',{method:'POST',headers:H,body:JSON.stringify({inputs})});ok+=(j.results||[]).length;}
   catch(e){fail+=inputs.length;console.log('FALHOU:',e.message.slice(0,200));}
 }
 console.log(`\nMovidos p/ Perdido: ${ok} · falhas: ${fail}`);
})();
