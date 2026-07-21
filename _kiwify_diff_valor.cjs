const fs = require('fs');
const path = process.argv[2];
function parseCSV(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cur+='"';i++;}else if(c==='"')q=false;else cur+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
const rows = parseCSV(fs.readFileSync(path,'utf8'));
const H = rows[0].map(h=>h.trim());
const i = (n)=>H.indexOf(n);
const num=(s)=>parseFloat(String(s||'0').replace(',','.'))||0;
const cS=i('Status'),cL=i('Valor líquido'),cP=i('Produto'),cPag=i('Pagamento'),cParc=i('Parcelas'),cTotal=i('Total com acréscimo'),cTax=i('Taxas'),cCli=i('Cliente');
const paid = rows.slice(1).filter(r=>r.length>5 && r[cS]==='paid');
const STD = new Set([16.86,26.26,185.20]);
// distribuição por valor líquido
const dist={};
for(const r of paid){const v=num(r[cL]);dist[v]=(dist[v]||0)+1;}
console.log('── Distribuição do Valor líquido (pagos) ──');
for(const [v,n] of Object.entries(dist).sort((a,b)=>b[1]-a[1])) console.log(`  R$ ${Number(v).toFixed(2).padStart(8)} × ${n}${STD.has(Number(v))?'':'   <== NÃO padrão'}`);
// anomalias (líquido fora do padrão) — detalhe
console.log('\n── Vendas com Valor líquido NÃO padrão (candidatas à diferença) ──');
let shortfall=0;
for(const r of paid){const v=num(r[cL]); if(STD.has(v)) continue;
  const isUp=/formato de aulas/i.test(r[cP]); const esperado=isUp?185.20:(num(r[cTotal])<=21?16.86:26.26);
  shortfall += (esperado - v);
  console.log(`  ${r[cCli].slice(0,28).padEnd(28)} líq R$ ${v.toFixed(2).padStart(8)} | esperado ${esperado.toFixed(2)} | dif ${(esperado-v).toFixed(2)} | ${r[cPag]}/${r[cParc]}x | total ${r[cTotal]} | taxa ${r[cTax]} | ${isUp?'UPSELL':'live'}`);
}
console.log(`\n  Soma das diferenças (esperado − líquido) nas não-padrão: R$ ${shortfall.toFixed(2)}`);
