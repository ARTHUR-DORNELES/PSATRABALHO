// Diff Kiwify (CSV) × HubSpot — identifica vendas pagas que NÃO viraram negócio no HubSpot.
// SOMENTE LEITURA (não cria nada). Casa por CPF+produto (robusto), com fallback e-mail+produto e kiwify_chave.
//
// Uso: node _kiwify_diff.mjs "C:\\caminho\\sales.csv"
// Requer em kiwify-credenciais.txt (ou .env.local): HUBSPOT_TOKEN=...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// credenciais
for (const f of ['kiwify-credenciais.txt', '.env.local']) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
}
const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) { console.error('✗ Falta HUBSPOT_TOKEN em kiwify-credenciais.txt'); process.exit(1); }
const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) { console.error('✗ passe o caminho do CSV'); process.exit(1); }

const PIPELINE = '904543067';
const PROD_TRIPWIRE = '0831ef90-5b8e-11f1-8224-13e0b2554faa';
const PROD_UPSELL = 'a6e42810-5b8e-11f1-bcec-81ce96602d5b';
const prodIdFromName = (name) => /formato de aulas/i.test(name || '') ? PROD_UPSELL : PROD_TRIPWIRE;
const digits = (s) => String(s || '').replace(/\D/g, '');
const low = (s) => String(s || '').trim().toLowerCase();
const num = (s) => parseFloat(String(s || '0').replace(',', '.')) || 0;

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (inQ) { if (c === '"' && text[i+1] === '"') { cur += '"'; i++; } else if (c === '"') inQ = false; else cur += c; }
    else { if (c === '"') inQ = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const H = rows[0].map((h) => h.trim());
const col = (n) => H.indexOf(n);
const cId = col('ID da venda'), cStatus = col('Status'), cProd = col('Produto'), cEmail = col('Email'), cCpf = col('CPF / CNPJ'), cCel = col('Celular'), cLiq = col('Valor líquido'), cNome = col('Cliente');
const pagos = rows.slice(1).filter((r) => r.length > 5 && r[cId] && r[cStatus] === 'paid');

// ---------- HubSpot ----------
const hs = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers||{}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};
async function allDeals() {
  const out = []; let after;
  do {
    const body = { filterGroups: [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPELINE }] }], properties: ['dealname', 'kiwify_chave', 'dealstage', 'amount', 'amount_in_home_currency'], limit: 100, ...(after ? { after } : {}) };
    const j = await hs('https://api.hubapi.com/crm/v3/objects/deals/search', { method: 'POST', body: JSON.stringify(body) });
    out.push(...j.results); after = j.paging?.next?.after;
  } while (after);
  return out;
}
async function assocContacts(dealIds) {
  const map = new Map();
  for (let i = 0; i < dealIds.length; i += 100) {
    const j = await hs('https://api.hubapi.com/crm/v4/associations/deals/contacts/batch/read', { method: 'POST', body: JSON.stringify({ inputs: dealIds.slice(i, i+100).map((id) => ({ id })) }) });
    for (const r of j.results || []) map.set(String(r.from.id), (r.to || []).map((t) => String(t.toObjectId)));
  }
  return map;
}
async function contactsCpfEmail(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const j = await hs('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', { method: 'POST', body: JSON.stringify({ properties: ['cpf', 'email'], inputs: ids.slice(i, i+100).map((id) => ({ id: String(id) })) }) });
    for (const c of j.results || []) map.set(String(c.id), { cpf: digits(c.properties.cpf), email: low(c.properties.email) });
  }
  return map;
}

(async () => {
  console.log('\nBuscando negócios no HubSpot...');
  const deals = await allDeals();
  console.log(`✓ ${deals.length} negócios no pipeline`);
  const assoc = await assocContacts(deals.map((d) => d.id));
  const contactIds = [...new Set([...assoc.values()].flat())];
  const cInfo = await contactsCpfEmail(contactIds);
  const dealsComAssoc = [...assoc.values()].filter((v) => v.length).length;
  const comCpf = [...cInfo.values()].filter((c) => c.cpf).length;
  const comEmail = [...cInfo.values()].filter((c) => c.email).length;
  console.log(`  debug: ${dealsComAssoc}/${deals.length} negócios com contato associado · contatos ${cInfo.size} (cpf ${comCpf}, email ${comEmail})`);

  // Mapa chave → situação do negócio no HubSpot (stage + valor). Cobre cpf_prod, email_prod e kiwify_chave.
  const STAGE = { '1372708683': 'fechado', '1372708679': 'aguardando', '1372708678': 'abandono', '1372708684': 'perdido' };
  const keyInfo = new Map();
  const setKey = (k, info) => { if (!keyInfo.has(k)) keyInfo.set(k, info); };
  let hubFechadoTotal = 0, hubFechadoN = 0;
  for (const d of deals) {
    const pid = prodIdFromName(d.properties.dealname);
    const stage = d.properties.dealstage;
    const amt = num(d.properties.amount_in_home_currency || d.properties.amount);
    if (stage === '1372708683') { hubFechadoTotal += amt; hubFechadoN++; }
    const info = { stage, amt, dealId: d.id, dealname: d.properties.dealname };
    if (d.properties.kiwify_chave) setKey('k:' + low(d.properties.kiwify_chave), info);
    for (const cid of assoc.get(d.id) || []) {
      const ci = cInfo.get(cid); if (!ci) continue;
      if (ci.cpf) setKey('c:' + ci.cpf + '_' + pid, info);
      if (ci.email) setKey('e:' + ci.email + '_' + pid, info);
    }
  }

  // Classifica cada venda PAGA do Kiwify pela situação no HubSpot (dedup por cpf/email+produto).
  const seen = new Set();
  const bucket = { fechado: { n: 0, liq: 0 }, aguardando: { n: 0, liq: 0 }, abandono: { n: 0, liq: 0 }, perdido: { n: 0, liq: 0 }, faltante: { n: 0, liq: 0 } };
  const missing = [];
  const stageErrado = []; // negócios pagos no Kiwify mas NÃO em "fechado" no HubSpot
  let kiwiPagoTotal = 0;
  for (const r of pagos) {
    const pid = prodIdFromName(r[cProd]);
    const cpf = digits(r[cCpf]); const email = low(r[cEmail]); const liq = num(r[cLiq]);
    const dedup = (cpf || email) + '_' + pid;
    if (seen.has(dedup)) continue; seen.add(dedup);
    kiwiPagoTotal += liq;
    const info = (cpf && keyInfo.get('c:' + cpf + '_' + pid)) || (email && keyInfo.get('e:' + email + '_' + pid)) || (email && keyInfo.get('k:' + email + '_' + pid)) || null;
    const b = info ? (STAGE[info.stage] || 'fechado') : 'faltante';
    bucket[b].n++; bucket[b].liq += liq;
    if (b === 'faltante') missing.push({ idVenda: r[cId], nome: r[cNome], email, cpf, celular: r[cCel], produto: r[cProd], valor_liquido: liq });
    else if (b !== 'fechado') stageErrado.push({ dealId: info.dealId, dealname: info.dealname, stageAtual: b, nome: r[cNome], email, valor_liquido: liq });
  }
  // dedup por dealId (várias chaves apontam pro mesmo negócio)
  const vistos = new Set();
  const stageErradoUniq = stageErrado.filter((x) => !vistos.has(x.dealId) && vistos.add(x.dealId));

  // ── EXTRAS: negócios FECHADO no HubSpot que NÃO batem com nenhuma venda paga do Kiwify (sobra no Hub) ──
  const csvPaidKeys = new Set();
  for (const r of pagos) { const pid = prodIdFromName(r[cProd]); const cpf = digits(r[cCpf]); const email = low(r[cEmail]); if (cpf) csvPaidKeys.add(cpf + '_' + pid); if (email) csvPaidKeys.add(email + '_' + pid); }
  const csvOther = new Map(); // key → status (linhas não-pagas: refunded/refused/waiting)
  for (const r of rows.slice(1)) { if (!r[cId] || r[cStatus] === 'paid') continue; const pid = prodIdFromName(r[cProd]); const cpf = digits(r[cCpf]); const email = low(r[cEmail]); if (cpf) csvOther.set(cpf + '_' + pid, r[cStatus]); if (email) csvOther.set(email + '_' + pid, r[cStatus]); }
  const extras = [];
  for (const d of deals) {
    if (d.properties.dealstage !== '1372708683') continue;
    const pid = prodIdFromName(d.properties.dealname);
    let cpf = '', email = '';
    for (const cid of assoc.get(d.id) || []) { const ci = cInfo.get(cid); if (ci) { if (!cpf) cpf = ci.cpf; if (!email) email = ci.email; } }
    const keys = [];
    if (cpf) keys.push(cpf + '_' + pid);
    if (email) keys.push(email + '_' + pid);
    if (d.properties.kiwify_chave) keys.push(low(d.properties.kiwify_chave));
    if (keys.some((k) => csvPaidKeys.has(k))) continue; // bate com venda paga → ok
    const mk = keys.find((k) => csvOther.has(k));
    const motivo = mk ? `Kiwify: ${csvOther.get(mk)}` : 'não está no export (edição antiga / outro)';
    extras.push({ dealId: d.id, dealname: d.properties.dealname, amount: num(d.properties.amount_in_home_currency || d.properties.amount), motivo });
  }

  const f = (n) => 'R$ ' + n.toFixed(2);
  console.log(`\n════════ RECONCILIAÇÃO · ${seen.size} vendas pagas únicas (email+produto) ════════`);
  console.log(`  Kiwify pago (líquido)        ${f(kiwiPagoTotal)}\n`);
  console.log(`  Situação no HubSpot          vendas      líquido (Kiwify)`);
  for (const [k, v] of Object.entries(bucket))
    console.log(`   ${k.padEnd(12)}              ${String(v.n).padStart(4)}     ${f(v.liq)}`);
  console.log(`\n  → No dashboard (fechados) HubSpot soma: ${f(hubFechadoTotal)} (${hubFechadoN} negócios)`);
  console.log(`  → Gap p/ o Kiwify = aguardando + abandono + perdido + faltante\n`);

  fs.writeFileSync('_kiwify_missing.json', JSON.stringify(missing, null, 2));
  const csvOut = ['nome,email,cpf,celular,produto,valor_liquido,id_venda', ...missing.map((m) => `"${m.nome}",${m.email},${m.cpf},${m.celular},"${m.produto}",${m.valor_liquido.toFixed(2)},${m.idVenda}`)].join('\n');
  fs.writeFileSync('_kiwify_missing.csv', csvOut);
  console.log(`✓ faltantes (sem negócio): ${missing.length} · ${f(bucket.faltante.liq)} → _kiwify_missing.csv`);

  // Negócios PAGOS no Kiwify mas em stage errado no HubSpot (mover pra "fechado" / investigar perdido).
  const mover = stageErradoUniq.filter((x) => x.stageAtual === 'aguardando' || x.stageAtual === 'abandono');
  const perdidos = stageErradoUniq.filter((x) => x.stageAtual === 'perdido');
  fs.writeFileSync('_kiwify_mover_para_fechado.csv', ['deal_id,stage_atual,dealname,nome,email,valor_liquido', ...mover.map((x) => `${x.dealId},${x.stageAtual},"${x.dealname}","${x.nome}",${x.email},${x.valor_liquido.toFixed(2)}`)].join('\n'));
  fs.writeFileSync('_kiwify_perdido_investigar.csv', ['deal_id,dealname,nome,email,valor_liquido', ...perdidos.map((x) => `${x.dealId},"${x.dealname}","${x.nome}",${x.email},${x.valor_liquido.toFixed(2)}`)].join('\n'));
  console.log(`✓ mover p/ fechado: ${mover.length} · ${f(mover.reduce((s, x) => s + x.valor_liquido, 0))} → _kiwify_mover_para_fechado.csv`);
  console.log(`✓ perdido (investigar): ${perdidos.length} · ${f(perdidos.reduce((s, x) => s + x.valor_liquido, 0))} → _kiwify_perdido_investigar.csv`);

  // ── DUPLICADOS: 2+ negócios FECHADO pro mesmo contato + mesmo produto (duplicata da integração) ──
  const fechadoByKey = new Map();
  for (const d of deals) {
    if (d.properties.dealstage !== '1372708683') continue;
    const pid = prodIdFromName(d.properties.dealname);
    const cid = (assoc.get(d.id) || [])[0];
    if (!cid) continue;
    const k = cid + '|' + pid;
    if (!fechadoByKey.has(k)) fechadoByKey.set(k, []);
    fechadoByKey.get(k).push({ id: d.id, amt: num(d.properties.amount_in_home_currency || d.properties.amount), chave: d.properties.kiwify_chave || '', name: d.properties.dealname });
  }
  const dups = [...fechadoByKey.values()].filter((g) => g.length > 1);
  const dupExtraN = dups.reduce((s, g) => s + (g.length - 1), 0);
  const dupExtraV = dups.reduce((s, g) => s + g.slice(1).reduce((a, x) => a + x.amt, 0), 0);
  console.log(`\n── DUPLICADOS (mesmo contato+produto, 2+ fechados): ${dups.length} grupos · ${dupExtraN} negócios a mais · R$ ${dupExtraV.toFixed(2)} ──`);
  // mantém o que tem kiwify_chave (mais novo/confiável); marca os outros pra remover
  const dupCsv = ['grupo,manter_deal_id,remover_deal_ids,valor_extra,produto'];
  dups.forEach((g, i) => { const manter = g.find((x) => x.chave) || g[0]; const remover = g.filter((x) => x.id !== manter.id); dupCsv.push(`${i + 1},${manter.id},"${remover.map((x) => x.id).join(';')}",${remover.reduce((a, x) => a + x.amt, 0).toFixed(2)},"${manter.name}"`); });
  fs.writeFileSync('_kiwify_duplicados.csv', dupCsv.join('\n'));
  console.log('   → _kiwify_duplicados.csv\n');

  const extrasTot = extras.reduce((s, x) => s + x.amount, 0);
  const porMotivo = {};
  for (const x of extras) porMotivo[x.motivo] = (porMotivo[x.motivo] || 0) + 1;
  console.log(`\n── EXTRAS no HubSpot (fechado SEM venda paga no Kiwify): ${extras.length} · ${f(extrasTot)} ──`);
  for (const [m, n] of Object.entries(porMotivo)) console.log(`   ${String(n).padStart(3)} · ${m}`);
  fs.writeFileSync('_kiwify_extras.csv', ['deal_id,amount,motivo,dealname', ...extras.map((x) => `${x.dealId},${x.amount.toFixed(2)},"${x.motivo}","${x.dealname}"`)].join('\n'));
  console.log('   → _kiwify_extras.csv\n');
})().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
