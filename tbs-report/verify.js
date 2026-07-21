const fs = require('fs'), zlib = require('zlib');
const buf = fs.readFileSync('C:/Users/Usuário/Desktop/Claude Code/TBS_2026_Relatorio_Gerencial.pdf');
const s = buf.toString('latin1');
const re = /stream\r?\n([\s\S]*?)endstream/g;
let m, n = 0, inflated = 0, txt = '';
while ((m = re.exec(s))) {
  n++;
  let raw = m[1].replace(/\r?\n$/, '');
  try { txt += zlib.inflateSync(Buffer.from(raw, 'latin1')).toString('latin1'); inflated++; } catch (e) {}
}
console.log('streams:', n, 'inflated:', inflated, 'textlen:', txt.length);
const matches = txt.match(/\(((?:[^()\\]|\\.)*)\)/g) || [];
const letters = matches.map(x => x.slice(1, -1).replace(/\\(.)/g, '$1')).join('');
console.log('amostra:', JSON.stringify(letters.slice(0, 300)));
const checks = ['SPEAKER', 'Relat', 'Resumo', '653', 'Vendas', 'Funil', 'Acessaram', 'Convers', 'Pesquisa', '3,4%', 'PLANO DE A', 'Ativa', 'ROAS', '278 mil', 'Checkout', 'SEO'];
checks.forEach(c => console.log((letters.includes(c) ? 'OK   ' : 'FALTA') + ' | ' + c));
