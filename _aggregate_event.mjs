import fs from 'node:fs';

const p = String.raw`C:\Users\Usuário\.claude\projects\C--Users-Usu-rio-Desktop-Claude-Code\a14f97ea-3bd3-46c4-87f1-d1ae62d0d30b\tool-results\mcp-2d891e17-b0ee-45ce-b159-c5e47ec9500f-search_crm_objects-1779390730808.txt`;
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const deals = data.results;

const micros = {};
const macros = {};
for (const d of deals) {
  const mt = d.properties.micro_tema;
  if (mt) {
    if (!micros[mt]) micros[mt] = { count: 0, sumAmount: 0 };
    micros[mt].count++;
    micros[mt].sumAmount += parseFloat(d.properties.amount || 0);
  }
  const mac = d.properties.macro_tema || '(sem macro)';
  if (!macros[mac]) macros[mac] = { count: 0, sumAmount: 0 };
  macros[mac].count++;
  macros[mac].sumAmount += parseFloat(d.properties.amount || 0);
}
const microByCount = Object.entries(micros).map(([t,v])=>({tema:t,...v})).sort((a,b)=>b.count-a.count || b.sumAmount-a.sumAmount);
const microByAmount = [...microByCount].sort((a,b)=>b.sumAmount-a.sumAmount);
const macroByCount = Object.entries(macros).map(([t,v])=>({tema:t,...v})).sort((a,b)=>b.count-a.count);

const out = {
  windowStart: '2025-06-01',
  windowEnd: '2025-08-31',
  totalDeals: deals.length,
  totalRevenue: deals.reduce((s,d) => s + parseFloat(d.properties.amount||0), 0),
  microByCount: microByCount.slice(0, 20),
  microByAmount: microByAmount.slice(0, 20),
  macroByCount,
  uniqueMicros: Object.keys(micros).length,
};
fs.writeFileSync(new URL('./_agg_event.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('saved _agg_event.json — deals:', deals.length, 'micros únicos:', Object.keys(micros).length);
