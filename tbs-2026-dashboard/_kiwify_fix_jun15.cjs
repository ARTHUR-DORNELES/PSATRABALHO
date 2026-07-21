// Limpeza pontual (15/jun): move 3 vendas genuinamente presas → Fechado; arquiva 13 órfãos
// (abandono/aguardando que já têm um Fechado gêmeo, criados pela fragmentação da chave order_id).
//   node _kiwify_fix_jun15.cjs          → dry-run
//   node _kiwify_fix_jun15.cjs --apply  → efetiva
const fs = require('fs'), path = require('path');
for (const f of ['.env.local', 'kiwify-credenciais.txt']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] = process.env[m[1]] || m[2].replace(/^["']|["']$/g, ''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const APPLY = process.argv.includes('--apply');
const FECHADO = '1372708683';
const hs = async (u, o = {}) => { const r = await fetch(u, { ...o, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(o.headers || {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : {}; };

// 3 vendas pagas no Kiwify, presas em abandono, SEM fechado gêmeo → mover p/ Fechado (R$ 26,26 cada).
const MOVE = [
  { id: '61060835607', amount: '26.26', nome: 'Ruy Schneider' },
  { id: '61092589396', amount: '26.26', nome: 'Romário De Azeredo' },
  { id: '61038723721', amount: '26.26', nome: 'ALCI CIRO KEMMERICH' },
];
// 13 órfãos (abandono/aguardando) cujo contato JÁ tem um Fechado → arquivar (lixeira, recuperável 90d).
const ARCHIVE = ['61096547113','61094015121','61088704380','60980323629','61090799801','61089870987','61034954817','61060897157','61059067274','60941165168','61058131040','60992622996','61015170919'];

(async () => {
  console.log(`${APPLY ? 'APLICANDO' : 'DRY-RUN'}\n`);
  console.log(`mover ${MOVE.length} → Fechado:`); MOVE.forEach((m) => console.log(`  ${m.id}  R$ ${m.amount}  ${m.nome}`));
  console.log(`\narquivar ${ARCHIVE.length} órfãos: ${ARCHIVE.join(', ')}`);
  if (!APPLY) { console.log('\n(rode com --apply)\n'); return; }
  await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/update', { method: 'POST', body: JSON.stringify({ inputs: MOVE.map((m) => ({ id: m.id, properties: { dealstage: FECHADO, amount: m.amount } })) }) });
  console.log(`\n✓ ${MOVE.length} movidos p/ Fechado.`);
  await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/archive', { method: 'POST', body: JSON.stringify({ inputs: ARCHIVE.map((id) => ({ id })) }) });
  console.log(`✓ ${ARCHIVE.length} órfãos arquivados.\n`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
