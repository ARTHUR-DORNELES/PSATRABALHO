import fs from 'fs';
import path from 'path';

const DIR = 'C:/Users/Usuário/.claude/projects/C--Users-Usu-rio-Desktop-Claude-Code/10277a11-f65d-4e7b-878f-e77d6b093400/tool-results/';

const files = fs.readdirSync(DIR)
  .filter(f => f.includes('search_crm_objects'))
  .map(f => path.join(DIR, f));

const agg = new Map(); // slug -> {count, wonCount, totalAmount, wonAmount}

let totalRecords = 0;
const WON_STAGES = new Set(['closedwon']);

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const wrapper = JSON.parse(raw);          // [{type, text}]
  const inner = JSON.parse(wrapper[0].text); // {results, total, ...}

  for (const r of inner.results) {
    totalRecords++;
    const slug = r.properties.palestrante_principal_correta;
    if (!slug) continue;

    const amount = parseFloat(r.properties.amount || '0') || 0;
    const stage = r.properties.dealstage || '';
    const won = WON_STAGES.has(stage);

    if (!agg.has(slug)) agg.set(slug, { count: 0, wonCount: 0, totalAmount: 0, wonAmount: 0 });
    const a = agg.get(slug);
    a.count++;
    a.totalAmount += amount;
    if (won) {
      a.wonCount++;
      a.wonAmount += amount;
    }
  }
}

console.log(`Files processed: ${files.length}`);
console.log(`Total records aggregated: ${totalRecords}`);
console.log(`Unique palestrantes: ${agg.size}`);
console.log();

// Sort top 30 by count
const sortedByCount = [...agg.entries()]
  .map(([slug, v]) => ({ slug, ...v }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 30);

console.log('== TOP 30 BY DEAL COUNT ==');
console.log('rank\tslug\tdeals\twon\ttotal_BRL\twon_BRL');
sortedByCount.forEach((p, i) => {
  console.log(`${i+1}\t${p.slug}\t${p.count}\t${p.wonCount}\t${p.totalAmount.toFixed(0)}\t${p.wonAmount.toFixed(0)}`);
});

// Also top 30 by won_amount (revenue)
const sortedByRevenue = [...agg.entries()]
  .map(([slug, v]) => ({ slug, ...v }))
  .sort((a, b) => b.wonAmount - a.wonAmount)
  .slice(0, 30);

console.log();
console.log('== TOP 30 BY WON REVENUE (BRL) ==');
console.log('rank\tslug\tdeals\twon\twon_BRL');
sortedByRevenue.forEach((p, i) => {
  console.log(`${i+1}\t${p.slug}\t${p.count}\t${p.wonCount}\t${p.wonAmount.toFixed(0)}`);
});

// Save to JSON for next step
fs.writeFileSync(
  'C:/Users/Usuário/Desktop/Claude Code/top-palestrantes.json',
  JSON.stringify({ totalRecords, uniqueCount: agg.size, topByCount: sortedByCount, topByRevenue: sortedByRevenue }, null, 2)
);
console.log('\nSaved to top-palestrantes.json');
