// Backfill tbschool__data_do_pagamento (contato) com a data REAL do Kiwify (Data de Criação, BRT),
// pra o gráfico "vendas por dia · data do pagamento" bater com o relatório do Kiwify.
//   node _fix_data_pagamento.cjs "C:\\...\\sales.csv"            → dry-run (mostra dist. atual × CSV × resultante)
//   node _fix_data_pagamento.cjs "C:\\...\\sales.csv" --apply    → grava nos contatos
const fs = require('fs'), path = require('path');
for (const f of ['.env.local', 'kiwify-credenciais.txt']) { const p = path.join(__dirname, f); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] = process.env[m[1]] || m[2].replace(/^["']|["']$/g, ''); } }
const TOKEN = process.env.HUBSPOT_TOKEN;
const CSV = process.argv[2];
const APPLY = process.argv.includes('--apply');
const PIPE = '904543067', FECHADO = '1372708683';
const hs = async (u, o = {}) => { const r = await fetch(u, { ...o, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(o.headers || {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : {}; };
const digits = (s) => String(s || '').replace(/\D/g, '');
const low = (s) => String(s || '').trim().toLowerCase();
const brtDay = (iso) => { const d = new Date(iso); return isNaN(d) ? null : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); };
function parseCSV(t) { const R = []; let r = [], c = '', q = false; for (let i = 0; i < t.length; i++) { const x = t[i]; if (q) { if (x === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (x === '"') q = false; else c += x; } else { if (x === '"') q = true; else if (x === ',') { r.push(c); c = ''; } else if (x === '\n') { r.push(c); R.push(r); r = []; c = ''; } else if (x !== '\r') c += x; } } if (c !== '' || r.length) { r.push(c); R.push(r); } return R; }
// "02/06/2026 23:09:21" (BRT) → "2026-06-02T23:09:21-03:00"
const toIso = (s) => { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-03:00` : null; };

(async () => {
  // 1) CSV → data de pagamento (Criação) por contato (cpf e email). Mantém a 1ª compra do contato.
  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
  const H = rows[0].map((h) => h.trim()); const idx = (n) => H.indexOf(n);
  const cS = idx('Status'), cCr = idx('Data de Criação'), cE = idx('Email'), cCpf = idx('CPF / CNPJ');
  const paid = rows.slice(1).filter((r) => r.length > 5 && r[cS] === 'paid');
  const byCpf = new Map(), byEmail = new Map();
  const csvDist = {};
  for (const r of paid) { const iso = toIso(r[cCr]); if (!iso) continue; const day = brtDay(iso); csvDist[day] = (csvDist[day] || 0) + 1; const cpf = digits(r[cCpf]), em = low(r[cE]); if (cpf && (!byCpf.has(cpf) || iso < byCpf.get(cpf))) byCpf.set(cpf, iso); if (em && (!byEmail.has(em) || iso < byEmail.get(em))) byEmail.set(em, iso); }

  // 2) negócios FECHADOS + contato (cpf, email, data_do_pagamento atual, createdate)
  let after, deals = [];
  do { const j = await hs('https://api.hubapi.com/crm/v3/objects/deals/search', { method: 'POST', body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPE }, { propertyName: 'dealstage', operator: 'EQ', value: FECHADO }] }], properties: ['createdate'], limit: 100, after }) }); deals.push(...j.results); after = j.paging?.next?.after; } while (after);
  // associações deal→contato
  const dealIds = deals.map((d) => d.id);
  const assoc = new Map();
  for (let i = 0; i < dealIds.length; i += 100) { const j = await hs('https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read', { method: 'POST', body: JSON.stringify({ inputs: dealIds.slice(i, i + 100).map((id) => ({ id })) }) }); for (const r of j.results || []) assoc.set(String(r.from.id), r.to?.[0]?.toObjectId != null ? String(r.to[0].toObjectId) : null); }
  const contactIds = [...new Set([...assoc.values()].filter(Boolean))];
  const cInfo = new Map();
  for (let i = 0; i < contactIds.length; i += 100) { const j = await hs('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', { method: 'POST', body: JSON.stringify({ idProperty: 'hs_object_id', inputs: contactIds.slice(i, i + 100).map((id) => ({ id })), properties: ['cpf', 'email', 'tbschool__data_do_pagamento'] }) }); for (const c of j.results || []) cInfo.set(c.id, c.properties); }

  // 3) data-alvo por contato (CSV cpf → email), e dist atual × resultante
  const curDist = {}, newDist = {}, updates = new Map(); let semData = 0, matched = 0, unmatched = 0;
  for (const d of deals) {
    const cid = assoc.get(d.id); const ci = cid ? cInfo.get(cid) : null;
    const atual = ci?.tbschool__data_do_pagamento || null;
    const csvIso = ci ? (byCpf.get(digits(ci.cpf)) || byEmail.get(low(ci.email))) : null;
    // atual (lógica de hoje): data_do_pagamento || createdate
    const curIso = atual || d.properties.createdate; const cday = curIso ? brtDay(curIso) : null; if (cday) curDist[cday] = (curDist[cday] || 0) + 1;
    if (!atual) semData++;
    // resultante (o certo): data real do Kiwify || atual || createdate
    const newIso = csvIso || atual || d.properties.createdate; const nday = newIso ? brtDay(newIso) : null; if (nday) newDist[nday] = (newDist[nday] || 0) + 1;
    if (cid && csvIso) { matched++; updates.set(cid, csvIso); } else if (cid) unmatched++;
  }

  const days = [...new Set([...Object.keys(csvDist), ...Object.keys(curDist), ...Object.keys(newDist)])].sort();
  console.log(`\nFechados: ${deals.length} · contatos: ${contactIds.length} · sem data_do_pagamento hoje: ${semData}`);
  console.log(`Match com CSV: ${matched} negócios · sem match: ${unmatched} · contatos a atualizar: ${updates.size}\n`);
  console.log('  dia        | Kiwify(CSV) | dash HOJE | dash DEPOIS');
  for (const d of days) console.log('  ' + d + ' | ' + String(csvDist[d] || 0).padStart(8) + '    | ' + String(curDist[d] || 0).padStart(7) + '   | ' + String(newDist[d] || 0).padStart(8));
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  console.log('  TOTAL      | ' + String(sum(csvDist)).padStart(8) + '    | ' + String(sum(curDist)).padStart(7) + '   | ' + String(sum(newDist)).padStart(8));

  if (!APPLY) { console.log('\n(dry-run — rode com --apply pra gravar)\n'); return; }
  const inputs = [...updates.entries()].map(([id, iso]) => ({ id, properties: { tbschool__data_do_pagamento: iso } }));
  for (let i = 0; i < inputs.length; i += 100) await hs('https://api.hubapi.com/crm/v3/objects/contacts/batch/update', { method: 'POST', body: JSON.stringify({ inputs: inputs.slice(i, i + 100) }) });
  console.log(`\n✓ ${inputs.length} contatos atualizados com a data real do Kiwify.\n`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
