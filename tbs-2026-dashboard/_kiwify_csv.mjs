// Analisa o CSV de vendas do Kiwify (somente leitura). Sem token.
// Uso: node _kiwify_csv.mjs "C:\\caminho\\sales.csv"
import fs from 'node:fs';

const path = process.argv[2];
if (!path || !fs.existsSync(path)) { console.error('✗ passe o caminho do CSV'); process.exit(1); }

// Parser CSV simples com suporte a aspas.
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* ignora */ }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const PROD = {
  tripwire: '0831ef90-5b8e-11f1-8224-13e0b2554faa',
  upsell: 'a6e42810-5b8e-11f1-bcec-81ce96602d5b',
};
const prodId = (name) => /formato de aulas/i.test(name) ? PROD.upsell : PROD.tripwire;

const raw = fs.readFileSync(path, 'utf8');
const rows = parseCSV(raw);
const header = rows[0];
const idx = (name) => header.findIndex((h) => h.trim() === name);
const iId = idx('ID da venda'), iStatus = idx('Status'), iProd = idx('Produto'),
  iEmail = idx('Email'), iCpf = idx('CPF / CNPJ'), iCel = idx('Celular'),
  iLiq = idx('Valor líquido'), iCliente = idx('Cliente');

const data = rows.slice(1).filter((r) => r.length > 5 && r[iId]);
const num = (s) => parseFloat(String(s || '0').replace(',', '.')) || 0;

// Por status
const byStatus = {};
for (const r of data) {
  const s = r[iStatus] || '(vazio)';
  byStatus[s] ??= { n: 0, liq: 0 };
  byStatus[s].n++; byStatus[s].liq += num(r[iLiq]);
}
console.log('\n── Por status (todas as linhas) ──');
for (const [s, v] of Object.entries(byStatus).sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${s.padEnd(18)} ${String(v.n).padStart(4)} · R$ ${v.liq.toFixed(2)}`);

// Pagos por produto
const pagos = data.filter((r) => r[iStatus] === 'paid');
const byProd = {};
for (const r of pagos) {
  const k = r[iProd] || '(sem nome)';
  byProd[k] ??= { n: 0, liq: 0 };
  byProd[k].n++; byProd[k].liq += num(r[iLiq]);
}
console.log('\n── PAGOS por produto ──');
for (const [p, v] of Object.entries(byProd).sort((a, b) => b[1].liq - a[1].liq))
  console.log(`  ${String(v.n).padStart(4)} · R$ ${v.liq.toFixed(2)} · ${p}`);
const totLiq = pagos.reduce((s, r) => s + num(r[iLiq]), 0);
console.log(`\n  TOTAL pagos: ${pagos.length} vendas · R$ ${totLiq.toFixed(2)}`);

// Chaves únicas (email_productid) entre os pagos — é a granularidade do HubSpot (1 deal por email+produto).
const chaves = new Map();
for (const r of pagos) {
  const email = String(r[iEmail] || '').trim().toLowerCase();
  const chave = email + '_' + prodId(r[iProd]);
  if (!chaves.has(chave)) chaves.set(chave, { email, nome: r[iCliente], cpf: r[iCpf], cel: r[iCel], produto: r[iProd], liq: num(r[iLiq]), idVenda: r[iId] });
}
console.log(`  Chaves únicas (email+produto) entre pagos: ${chaves.size}`);

// Grava pra etapa do diff
fs.writeFileSync('_kiwify_paid.json', JSON.stringify([...chaves.values()].map((v, i) => ({ ...v, chave: [...chaves.keys()][i] })), null, 2));
console.log('\n✓ gravado _kiwify_paid.json (pagos, deduplicados por email+produto)\n');
