const fs = require('fs');
const XLSX = require('xlsx'); // só pra reusar nada; vamos parsear CSV na mão
const path = process.argv[2];
function parseCSV(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cur+='"';i++;}else if(c==='"')q=false;else cur+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
const rows = parseCSV(fs.readFileSync(path,'utf8'));
const H = rows[0].map(h=>h.trim());
const idx = (n) => H.indexOf(n);
const num = (s)=>parseFloat(String(s||'0').replace(',','.'))||0;
const cStatus = idx('Status');
const cols = ['Valor líquido','Taxas','Preço base do produto','Total com acréscimo','Comissão do afiliado','Valor da compra em moeda da conta','Imposto'];
const colIdx = Object.fromEntries(cols.map(c=>[c, idx(c)]));
const paid = rows.slice(1).filter(r=>r.length>5 && r[cStatus]==='paid');
console.log(`\nLinhas pagas: ${paid.length}\n── Soma de cada coluna (pagos) ──`);
for (const c of cols){ const i=colIdx[c]; if(i<0){console.log(`  ${c}: (coluna não existe)`);continue;} const s=paid.reduce((a,r)=>a+num(r[i]),0); console.log(`  ${c.padEnd(34)} R$ ${s.toFixed(2)}`); }
// quantos pagos têm afiliado
const cAfil = idx('Nome do afiliado');
if (cAfil>=0){ const comAfil = paid.filter(r=>r[cAfil] && r[cAfil].trim()); console.log(`\n  vendas pagas COM afiliado: ${comAfil.length}`); }
