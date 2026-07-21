import fs from 'fs';

const p1 = JSON.parse(fs.readFileSync('_deals_b2b_p1.json','utf8'));
const p2 = JSON.parse(fs.readFileSync('_page2_slim.json','utf8'));
const all = [...p1, ...p2];

const cleanCNPJ = (s) => (s||'').replace(/\D/g,'').replace(/^0+/,'') || '_NOID';
// Match SP at end of address or as UF token
const isSP = (addr, razao, empresa) => {
  const text = `${addr||''} ${razao||''} ${empresa||''}`.toUpperCase();
  // strict SP UF patterns
  const patterns = [
    /\/SP\b/, /\bSP\s*[-\/]/, /-\s*SP\b/, /\bUF:\s*SP\b/, /\bSP\s*CEP/,
    / SP[ ,.\-]/, /,\s*SP\b/, /SAO PAULO[\s,\-\/]*SP/, /S[AÃ]O PAULO/,
  ];
  return patterns.some(re => re.test(text));
};

// Group by CNPJ
const groups = new Map();
for (const d of all) {
  const key = cleanCNPJ(d.cnpj);
  if (key === '_NOID') continue;
  if (!groups.has(key)) groups.set(key, { cnpj_raw: d.cnpj, deals: [], names: new Set(), razoes: new Set(), enderecos: new Set() });
  const g = groups.get(key);
  g.deals.push(d);
  if (d.empresa) g.names.add(d.empresa.trim());
  if (d.razao) g.razoes.add(d.razao.trim());
  if (d.endereco) g.enderecos.add(d.endereco.trim());
}

// CNPJs confirmed SP via HubSpot company lookup (where deal had no address)
const SP_CONFIRMED = new Set([
  '9287895000161',   // Thermo Fisher Scientific (SP)
  '58160789000128',  // Banco Safra (SP)
]);

// Detect SP per group
const results = [];
for (const [key, g] of groups) {
  const anyAddr = [...g.enderecos].join(' | ');
  const anyRazao = [...g.razoes].join(' | ');
  const anyEmp = [...g.names].join(' | ');
  const sp = isSP(anyAddr, anyRazao, anyEmp) || SP_CONFIRMED.has(key);
  const sumAmount = g.deals.reduce((s, d) => s + (parseFloat(d.amount)||0), 0);
  results.push({
    cnpj: key,
    cnpj_raw: g.cnpj_raw,
    razao: [...g.razoes][0] || [...g.names][0] || '(sem nome)',
    nomes: [...g.names].join(' | '),
    enderecos: anyAddr,
    deals_count: g.deals.length,
    sum_amount: sumAmount,
    sp_detected: sp,
  });
}

// SP only, top 50 by deal count
const sp = results.filter(r => r.sp_detected).sort((a,b) => b.deals_count - a.deals_count || b.sum_amount - a.sum_amount);

console.log('Total deals:', all.length);
console.log('Unique CNPJs:', results.length);
console.log('SP-detected companies:', sp.length);
console.log('\n=== TOP 50 B2B SP — qtd deals closedwon (12m) ===\n');

const top = sp.slice(0, 50);
console.log('Rank | Deals | R$ Total       | Empresa / Razão Social');
console.log('-----|-------|----------------|----------------------------------');
top.forEach((r, i) => {
  const rank = String(i+1).padStart(4);
  const cnt = String(r.deals_count).padStart(5);
  const amt = r.sum_amount.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}).padStart(14);
  const name = r.razao.substring(0, 55);
  console.log(`${rank} | ${cnt} | R$ ${amt} | ${name}`);
});

fs.writeFileSync('_top50_b2b_sp.json', JSON.stringify(top, null, 2));
console.log('\nSaved _top50_b2b_sp.json');

// Also list candidates that have NO endereço (so we can't tell SP) — for cross-check
const noAddr = results.filter(r => !r.enderecos && !r.sp_detected);
console.log(`\nSEM endereço (não classificados): ${noAddr.length} CNPJs / ${noAddr.reduce((s,r)=>s+r.deals_count,0)} deals`);
fs.writeFileSync('_no_address.json', JSON.stringify(noAddr, null, 2));
