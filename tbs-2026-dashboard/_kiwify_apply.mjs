// Aplica correções no HubSpot. ESCRITA — só age sobre os IDs/linhas dos CSVs gerados pelo diff.
//   node _kiwify_apply.mjs moves          → (dry-run) mostra os 31 que iria mover pra Fechado
//   node _kiwify_apply.mjs moves --apply  → move de verdade (stage Fechado + amount)
//   node _kiwify_apply.mjs create         → (dry-run) mostra os 11 que iria criar
//   node _kiwify_apply.mjs create --apply → cria os negócios faltantes (upsert por kiwify_chave + contato + associação)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const f of ['kiwify-credenciais.txt', '.env.local']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, ''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const APPLY = process.argv.includes('--apply');
const MODE = process.argv[2];
const PIPELINE = '904543067', STAGE_FECHADO = '1372708683';
const PROD_TRIPWIRE = '0831ef90-5b8e-11f1-8224-13e0b2554faa', PROD_UPSELL = 'a6e42810-5b8e-11f1-bcec-81ce96602d5b';
const prodId = (n) => /formato de aulas/i.test(n || '') ? PROD_UPSELL : PROD_TRIPWIRE;
const low = (s) => String(s || '').trim().toLowerCase();
const normTel = (raw) => { let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, ''); if (!d) return null; if (d.length >= 12 && d.startsWith('55')) return '+' + d; if (d.length === 10 || d.length === 11) return '+55' + d; if (d.length === 12 || d.length === 13) return '+' + d; return null; };
const fixEmail = (raw) => {
  let e = low(raw).replace(/\s+/g, '');
  const at = e.lastIndexOf('@'); if (at < 1) return e;
  let u = e.slice(0, at), dom = e.slice(at + 1);
  dom = dom.replace(/^(gmial|gmai|gmaill)\./, 'gmail.'); // erro no nome do provedor
  // provedores que são SEMPRE .com → corrige qualquer TLD errado (.vom .comi .con .co .cm .com.br ...)
  dom = dom.replace(/^(gmail|hotmail|outlook|live|icloud)\.[a-z.]+$/, '$1.com');
  // typos genéricos de ".com" no fim do domínio
  dom = dom.replace(/\.(con|vom|comi|copm|cmo|ocm|c0m|om|cim)$/, '.com');
  // yahoo tem .com.br — corrige só os erros óbvios
  dom = dom.replace(/^yahoo\.(con|cm|vom)$/, 'yahoo.com');
  return u + '@' + dom;
};
const hs = async (url, opts = {}) => { const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t}`); return t ? JSON.parse(t) : {}; };

function parseCSV(text) { const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else { if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } } if (cur !== '' || row.length) { row.push(cur); rows.push(row); } return rows; }
const readCsv = (file) => { const rows = parseCSV(fs.readFileSync(path.join(__dirname, file), 'utf8')); const h = rows[0]; return rows.slice(1).filter((r) => r.length > 1 && r[0]).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };

async function moves() {
  const rows = readCsv('_kiwify_mover_para_fechado.csv');
  console.log(`\n${APPLY ? 'APLICANDO' : 'DRY-RUN'} · mover ${rows.length} negócios → Fechado (stage + amount)\n`);
  for (const r of rows) console.log(`  ${r.deal_id}  ${r.stage_atual.padEnd(10)} R$ ${r.valor_liquido}  ${r.nome}`);
  if (!APPLY) { console.log('\n(rode com --apply pra efetivar)\n'); return; }
  const inputs = rows.map((r) => ({ id: r.deal_id, properties: { dealstage: STAGE_FECHADO, amount: String(r.valor_liquido) } }));
  for (let i = 0; i < inputs.length; i += 100) {
    await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/update', { method: 'POST', body: JSON.stringify({ inputs: inputs.slice(i, i + 100) }) });
  }
  console.log(`\n✓ ${inputs.length} negócios movidos pra Fechado.\n`);
}

async function create() {
  const rows = readCsv('_kiwify_missing.csv');
  console.log(`\n${APPLY ? 'APLICANDO' : 'DRY-RUN'} · criar ${rows.length} negócios faltantes\n`);
  for (const r of rows) console.log(`  R$ ${r.valor_liquido}  ${r.nome}  <${fixEmail(r.email)}>  ${/formato/i.test(r.produto) ? 'upsell' : 'live'}`);
  if (!APPLY) { console.log('\n(rode com --apply pra efetivar)\n'); return; }
  for (const r of rows) {
    const email = fixEmail(r.email);
    const pid = prodId(r.produto);
    const chave = email + '_' + pid;
    const tel = normTel(r.celular);
    const cprops = { email, firstname: r.nome };
    if (tel && /^\+55\d{11}$/.test(tel)) cprops.phone = tel; // só celular BR válido (+55 + DDD + 9 díg); senão omite
    if (r.cpf) cprops.cpf = r.cpf;
    const cRes = await hs('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', { method: 'POST', body: JSON.stringify({ inputs: [{ idProperty: 'email', id: email, properties: cprops }] }) });
    const contactId = cRes.results?.[0]?.id;
    const dRes = await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/upsert', { method: 'POST', body: JSON.stringify({ inputs: [{ idProperty: 'kiwify_chave', id: chave, properties: { kiwify_chave: chave, dealname: `${r.nome} - ${r.produto}`, pipeline: PIPELINE, dealstage: STAGE_FECHADO, amount: String(r.valor_liquido), tbschool__produto_de_interesse: r.produto } }] }) });
    const dealId = dRes.results?.[0]?.id;
    if (contactId && dealId) await hs(`https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`, { method: 'PUT' });
    console.log(`  ✓ ${r.nome} → contato ${contactId} · negócio ${dealId}`);
  }
  console.log(`\n✓ ${rows.length} negócios faltantes criados (idempotente por kiwify_chave).\n`);
}

const STAGE_PERDIDO = '1372708684';
async function perdidos() {
  const rows = readCsv('_kiwify_extras.csv'); // reembolsados ainda como Fechado
  console.log(`\n${APPLY ? 'APLICANDO' : 'DRY-RUN'} · mover ${rows.length} reembolsados → Perdido\n`);
  for (const r of rows) console.log(`  ${r.deal_id}  ${r.motivo}  ${r.dealname}`);
  if (!APPLY) { console.log('\n(rode com --apply)\n'); return; }
  const inputs = rows.map((r) => ({ id: r.deal_id, properties: { dealstage: STAGE_PERDIDO } }));
  for (let i = 0; i < inputs.length; i += 100) {
    await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/update', { method: 'POST', body: JSON.stringify({ inputs: inputs.slice(i, i + 100) }) });
  }
  console.log(`\n✓ ${inputs.length} negócios movidos pra Perdido.\n`);
}

async function dedupe() {
  const rows = readCsv('_kiwify_duplicados.csv'); // mantém manter_deal_id, arquiva remover_deal_ids
  const remover = rows.flatMap((r) => String(r.remover_deal_ids || '').split(';').map((s) => s.trim()).filter(Boolean));
  console.log(`\n${APPLY ? 'APLICANDO' : 'DRY-RUN'} · arquivar ${remover.length} negócios duplicados\n`);
  for (const r of rows) console.log(`  manter ${r.manter_deal_id} · remover ${r.remover_deal_ids} · ${r.produto}`);
  if (!APPLY) { console.log('\n(rode com --apply)\n'); return; }
  for (let i = 0; i < remover.length; i += 100) {
    await hs('https://api.hubapi.com/crm/v3/objects/deals/batch/archive', { method: 'POST', body: JSON.stringify({ inputs: remover.slice(i, i + 100).map((id) => ({ id })) }) });
  }
  console.log(`\n✓ ${remover.length} duplicados arquivados (lixeira do HubSpot · recuperável 90 dias).\n`);
}

(async () => {
  if (MODE === 'moves') await moves();
  else if (MODE === 'create') await create();
  else if (MODE === 'perdidos') await perdidos();
  else if (MODE === 'dedupe') await dedupe();
  else console.log('uso: node _kiwify_apply.mjs moves|create|perdidos|dedupe [--apply]');
})().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
