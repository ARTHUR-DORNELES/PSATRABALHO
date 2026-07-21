import fs from 'fs';

const all = JSON.parse(fs.readFileSync('_deals_3y_all.json','utf8'));

const cleanCNPJ = (s) => (s||'').replace(/\D/g,'').replace(/^0+/,'') || '_NOID';
const isSP = (addr, razao, empresa) => {
  const text = `${addr||''} ${razao||''} ${empresa||''}`.toUpperCase();
  const patterns = [
    /\/SP\b/, /\bSP\s*[-\/]/, /-\s*SP\b/, /\bUF:\s*SP\b/, /\bSP\s*CEP/,
    / SP[ ,.\-]/, /,\s*SP\b/, /SAO PAULO[\s,\-\/]*SP/, /S[AÃ]O PAULO/,
  ];
  return patterns.some(re => re.test(text));
};

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

const SP_CONFIRMED = new Set([
  '9287895000161',   // Thermo Fisher Scientific (SP) — confirmed prior
  '58160789000128',  // Banco Safra (SP) — confirmed prior
]);

// Pass-through / billing-only entities (not real "clients")
const EXCLUDE = new Set([
  '11324248000124',  // PSA own CNPJ (billing pass-through)
]);

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

const sp = results.filter(r => r.sp_detected && !EXCLUDE.has(r.cnpj)).sort((a,b) => b.deals_count - a.deals_count || b.sum_amount - a.sum_amount);

console.log('Total deals:', all.length);
console.log('Unique CNPJs:', results.length);
console.log('SP companies:', sp.length);

const top = sp.slice(0, 50);
console.log('\n=== TOP 50 B2B SP (3 anos) — qtd deals closedwon ===\n');
console.log('Rank | Deals |    R$ Total      | Empresa');
console.log('-----|-------|------------------|-------------------------------');
top.forEach((r, i) => {
  const rank = String(i+1).padStart(4);
  const cnt = String(r.deals_count).padStart(5);
  const amt = r.sum_amount.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}).padStart(16);
  console.log(`${rank} | ${cnt} | R$ ${amt} | ${r.razao.substring(0,60)}`);
});

// Build map with deal ids for downstream contact lookup
const groupsMap = new Map();
for (const d of all) {
  const key = cleanCNPJ(d.cnpj);
  if (!groupsMap.has(key)) groupsMap.set(key, []);
  groupsMap.get(key).push(d.id);
}
const topWithDealIds = top.map(t => ({
  cnpj: t.cnpj,
  razao: t.razao,
  nomes: t.nomes,
  deals_count: t.deals_count,
  sum_amount: t.sum_amount,
  deal_ids: groupsMap.get(t.cnpj) || [],
}));

fs.writeFileSync('_top50_3y_sp.json', JSON.stringify(top, null, 2));
fs.writeFileSync('_top50_3y_sp_with_dealids.json', JSON.stringify(topWithDealIds, null, 2));
console.log('\nSaved _top50_3y_sp.json and _top50_3y_sp_with_dealids.json');
