import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('./_page_micro.json', import.meta.url), 'utf8'));
const deals = data.results;
console.log('deals com micro_tema:', deals.length);

// MICRO
const micros = {};
for (const d of deals) {
  const mt = d.properties.micro_tema;
  if (!micros[mt]) micros[mt] = { count: 0, sumAmount: 0 };
  micros[mt].count++;
  micros[mt].sumAmount += parseFloat(d.properties.amount || 0);
}
const microByCount = Object.entries(micros).map(([t, v]) => ({ tema: t, ...v })).sort((a,b) => b.count - a.count || b.sumAmount - a.sumAmount);
const microByAmount = [...microByCount].sort((a,b) => b.sumAmount - a.sumAmount);

console.log('\n=== TOP 20 MICRO TEMAS POR COUNT ===');
microByCount.slice(0, 20).forEach((r, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${r.tema.padEnd(48)} ${r.count.toString().padStart(3)} deals  R$ ${r.sumAmount.toFixed(2).padStart(12)}`);
});

console.log('\n=== TOP 20 MICRO TEMAS POR RECEITA ===');
microByAmount.slice(0, 20).forEach((r, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${r.tema.padEnd(48)} R$ ${r.sumAmount.toFixed(2).padStart(12)}  ${r.count.toString().padStart(3)} deals`);
});

console.log(`\nTotal micro temas únicos: ${Object.keys(micros).length}`);
console.log(`Total deals: ${deals.length}`);
console.log(`Receita total: R$ ${deals.reduce((s,d) => s + parseFloat(d.properties.amount||0), 0).toFixed(2)}`);

// MACRO recompute from this 79-set (since some had micro but not macro? Let me check)
const macros = {};
for (const d of deals) {
  const t = d.properties.macro_tema || '(sem macro)';
  if (!macros[t]) macros[t] = { count: 0, sumAmount: 0 };
  macros[t].count++;
  macros[t].sumAmount += parseFloat(d.properties.amount || 0);
}
const macroRanked = Object.entries(macros).map(([t,v]) => ({tema:t, ...v})).sort((a,b) => b.count-a.count);
console.log('\n=== MACRO (recomputed on micro-populated set) ===');
macroRanked.forEach((r,i) => console.log(`${i+1}. ${r.tema} — ${r.count} deals — R$${r.sumAmount.toFixed(2)}`));

// Cross-tab: micro→macro alignment (counts where micro family number matches macro)
let aligned = 0, misaligned = 0;
const misalignments = [];
for (const d of deals) {
  const mac = d.properties.macro_tema || '';
  const mic = d.properties.micro_tema || '';
  const macNum = mac.split('.')[0];
  const micNum = mic.split('.')[0];
  if (macNum && micNum) {
    if (macNum === micNum) aligned++;
    else { misaligned++; misalignments.push({macro: mac, micro: mic, amount: d.properties.amount}); }
  }
}
console.log(`\nAlinhamento macro↔micro: ${aligned} alinhados / ${misaligned} desalinhados`);
console.log('Amostras de desalinhamento:');
misalignments.slice(0, 10).forEach(m => console.log(`  ${m.macro}  →  ${m.micro}`));

// Save aggregated JSON for PDF generator
const out = {
  windowStart: '2025-06-01',
  windowEnd: '2025-08-31',
  totalDealsWithMicro: deals.length,
  totalRevenue: deals.reduce((s,d) => s + parseFloat(d.properties.amount||0), 0),
  microByCount: microByCount.slice(0, 20),
  microByAmount: microByAmount.slice(0, 20),
  macroByCount: macroRanked,
  alignedCount: aligned,
  misalignedCount: misaligned,
  misalignments
};
fs.writeFileSync(new URL('./_agg.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('\nSaved _agg.json');
