import fs from 'node:fs';

const page1Path = String.raw`C:\Users\Usuário\.claude\projects\C--Users-Usu-rio-Desktop-Claude-Code\a14f97ea-3bd3-46c4-87f1-d1ae62d0d30b\tool-results\mcp-2d891e17-b0ee-45ce-b159-c5e47ec9500f-search_crm_objects-1779370364091.txt`;
const page1 = JSON.parse(fs.readFileSync(page1Path, 'utf8'));

const page2Inline = JSON.parse(fs.readFileSync(new URL('./_page2.json', import.meta.url), 'utf8'));

const all = [...page1.results, ...page2Inline.results];
console.log('total deals merged:', all.length, 'expected:', page1.total);

const withTheme = all.filter(d => d.properties?.macro_tema);
const withoutTheme = all.length - withTheme.length;
console.log('with macro_tema:', withTheme.length, '| without:', withoutTheme);

// also bucket by dealstage to confirm hypothesis (palestrante-signup pipeline vs event-booking pipeline)
const byStage = {};
for (const d of all) {
  const s = d.properties.dealstage || '(none)';
  if (!byStage[s]) byStage[s] = { count: 0, withTheme: 0, sumAmount: 0 };
  byStage[s].count++;
  if (d.properties.macro_tema) byStage[s].withTheme++;
  byStage[s].sumAmount += parseFloat(d.properties.amount || 0);
}
console.log('\nBy dealstage:');
for (const [s, v] of Object.entries(byStage)) {
  console.log(`  ${s}: ${v.count} deals (with theme: ${v.withTheme}) sum=R$${v.sumAmount.toFixed(2)}`);
}

// Aggregate by macro_tema
const themes = {};
for (const d of withTheme) {
  const t = d.properties.macro_tema;
  if (!themes[t]) themes[t] = { count: 0, sumAmount: 0, zeroOrTiny: 0 };
  themes[t].count++;
  const amt = parseFloat(d.properties.amount || 0);
  themes[t].sumAmount += amt;
  if (amt < 100) themes[t].zeroOrTiny++;
}

const ranked = Object.entries(themes)
  .map(([t, v]) => ({ tema: t, ...v }))
  .sort((a, b) => b.count - a.count);

console.log('\n=== Macro temas (deals com closedate jun-ago/2025, closed-won) ===');
console.log('rank | tema | count | sumAmount | (deals com amount<R$100)');
ranked.forEach((r, i) => {
  console.log(`${i + 1}. ${r.tema} — ${r.count} deals — R$${r.sumAmount.toFixed(2)} (tiny:${r.zeroOrTiny})`);
});

const rankedByAmount = [...ranked].sort((a, b) => b.sumAmount - a.sumAmount);
console.log('\n=== Mesmo set, ranqueado por receita ===');
rankedByAmount.forEach((r, i) => {
  console.log(`${i + 1}. ${r.tema} — R$${r.sumAmount.toFixed(2)} — ${r.count} deals`);
});
