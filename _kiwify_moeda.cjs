const fs = require('fs');
const path = process.argv[2];
function parseCSV(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cur+='"';i++;}else if(c==='"')q=false;else cur+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
const rows = parseCSV(fs.readFileSync(path,'utf8'));
const H = rows[0].map(h=>h.trim());
const i=(n)=>H.indexOf(n);
const num=(s)=>parseFloat(String(s||'0').replace(/\./g,'').replace(',', '.'))||parseFloat(String(s||'0').replace(',', '.'))||0;
const cS=i('Status'),cL=i('Valor líquido'),cMoeda=i('Moeda'),cCli=i('Cliente'),cConta=i('Valor da compra em moeda da conta'),cTotal=i('Total com acréscimo'),cProd=i('Produto');
console.log('Colunas-chave:', {Moeda:cMoeda, ValorLiquido:cL, ContaBRL:cConta});
const paid = rows.slice(1).filter(r=>r.length>5 && r[cS]==='paid');
// agrupa por moeda
const porMoeda={};
for(const r of paid){const m=r[cMoeda]||'?'; porMoeda[m]=(porMoeda[m]||{n:0,liq:0,conta:0}); porMoeda[m].n++; porMoeda[m].liq+=num(r[cL]); porMoeda[m].conta+=num(r[cConta]);}
console.log('\n── Pagos por MOEDA (Valor líquido na moeda original × Valor em moeda da conta=BRL) ──');
for(const [m,v] of Object.entries(porMoeda)) console.log(`  ${m.padEnd(6)} ${String(v.n).padStart(4)} vendas | líquido(orig) ${v.liq.toFixed(2)} | em conta(BRL) ${v.conta.toFixed(2)}`);
// lista as não-BRL
console.log('\n── Vendas NÃO-BRL (detalhe) ──');
for(const r of paid){ if((r[cMoeda]||'')==='BRL') continue; console.log(`  ${(r[cCli]||'').slice(0,26).padEnd(26)} | moeda ${r[cMoeda]} | líquido ${r[cL]} | total ${r[cTotal]} | em conta(BRL) ${r[cConta]} | ${r[cProd].slice(0,30)}`);}
