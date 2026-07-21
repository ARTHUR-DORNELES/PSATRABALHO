// Reconciliação geral Kiwify→HubSpot: acha TODO negócio do TBSchool preso em "abandono"/"aguardando"
// que consta PAID no CSV do Kiwify (por e-mail+tipo) e promove pra "Fechado".
// uso: node _reconciliar_kiwify.cjs "<csv>" [--apply]
const XLSX = require('xlsx');
const fs = require('fs');
const { hsFetch, hsSearchAllPaged } = require('./_kiwify_http.cjs');
const CSV = process.argv[2];
const APPLY = process.argv.includes('--apply');
const env = fs.readFileSync('tbs-2026-dashboard/.env.local', 'utf8');
const TOKEN = (env.match(/^HUBSPOT_TOKEN=(.+)$/m) || [])[1].trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const PIPELINE = '904543067', ABANDONO = '1372708678', AGUARDANDO = '1372708679', FECHADO = '1372708683';
const UUID_TRIP = '0831ef90-5b8e-11f1-8224-13e0b2554faa', UUID_UP = 'a6e42810-5b8e-11f1-bcec-81ce96602d5b';
const lc = (s) => String(s || '').trim().toLowerCase();
const normNome = (s) => lc(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const isUp = (s) => lc(s).includes('formato de aulas');
const emailFromChave = (c) => lc(String(c || '').replace(new RegExp(`_(${UUID_TRIP}|${UUID_UP})$`, 'i'), ''));

(async () => {
  const wb = XLSX.read(fs.readFileSync(CSV, 'utf8'), { type: 'string' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const paid = rows.filter((r) => lc(r.Status) === 'paid');
  const paidKeys = new Set(paid.map((r) => `${lc(r.Email)}|${isUp(r.Produto) ? 'up' : 'live'}`));
  const paidCount = {}; for (const r of paid) { const k = `${lc(r.Email)}|${isUp(r.Produto) ? 'up' : 'live'}`; paidCount[k] = (paidCount[k] || 0) + 1; }
  console.log(`Kiwify PAID: ${paid.length}`);

  // negócios presos (abandono + aguardando) no pipeline TBSchool
  const stuck = await hsSearchAllPaged(H, 'deals', [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPELINE }, { propertyName: 'dealstage', operator: 'IN', values: [ABANDONO, AGUARDANDO] }] }], ['dealname', 'dealstage', 'kiwify_chave']);
  console.log(`Negócios em abandono/aguardando: ${stuck.length}`);

  // e-mail de cada negócio: da chave, senão do contato associado
  const semChave = stuck.filter((d) => !d.properties.kiwify_chave);
  const assocEmail = new Map();
  if (semChave.length) {
    const aj = await hsFetch('https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: semChave.map((d) => ({ id: d.id })) }) });
    const d2c = new Map(); for (const r of aj.results || []) if (r.to?.length) d2c.set(r.from.id, r.to[0].id);
    const cids = [...new Set([...d2c.values()])];
    const emailByC = new Map();
    for (let i = 0; i < cids.length; i += 100) { const j = await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: cids.slice(i, i + 100).map((id) => ({ id })), properties: ['email'] }) }); for (const c of j.results || []) emailByC.set(c.id, lc(c.properties.email)); }
    for (const d of semChave) { const cid = d2c.get(d.id); if (cid) assocEmail.set(d.id, emailByC.get(cid)); }
  }

  // TRAVA anti-duplicata: monta as chaves dos negócios JÁ fechados (e-mail+tipo). Um preso só é promovido
  // se NÃO existe um fechado gêmeo — senão viraria venda duplicada.
  const fechados = await hsSearchAllPaged(H, 'deals', [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPELINE }, { propertyName: 'dealstage', operator: 'EQ', value: FECHADO }] }], ['dealname', 'kiwify_chave']);
  const fSemChave = fechados.filter((d) => !d.properties.kiwify_chave);
  const fAssocEmail = new Map();
  if (fSemChave.length) {
    const aj = await hsFetch('https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: fSemChave.map((d) => ({ id: d.id })) }) });
    const d2c = new Map(); for (const r of aj.results || []) if (r.to?.length) d2c.set(r.from.id, r.to[0].id);
    const cids = [...new Set([...d2c.values()])];
    const emailByC = new Map();
    for (let i = 0; i < cids.length; i += 100) { const j = await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: cids.slice(i, i + 100).map((id) => ({ id })), properties: ['email'] }) }); for (const c of j.results || []) emailByC.set(c.id, lc(c.properties.email)); }
    for (const d of fSemChave) { const cid = d2c.get(d.id); if (cid) fAssocEmail.set(d.id, emailByC.get(cid)); }
  }
  const fechadoKeys = new Set(), fechadoNomeKeys = new Set(), fechadoCount = {};
  for (const d of fechados) {
    const t = isUp(d.properties.dealname) ? 'up' : 'live';
    const e = emailFromChave(d.properties.kiwify_chave) || fAssocEmail.get(d.id) || '';
    if (e) { fechadoKeys.add(`${e}|${t}`); fechadoCount[`${e}|${t}`] = (fechadoCount[`${e}|${t}`] || 0) + 1; }
    const nome = normNome((d.properties.dealname || '').split(' - ')[0]);
    if (nome) fechadoNomeKeys.add(`${nome}|${t}`);
  }

  const promover = [], pulados = [], promovidoCount = {};
  for (const d of stuck) {
    const email = emailFromChave(d.properties.kiwify_chave) || assocEmail.get(d.id) || '';
    const up = isUp(d.properties.dealname);
    const tipo = up ? 'up' : 'live';
    const key = `${email}|${tipo}`;
    if (!email || !paidKeys.has(key)) continue;
    const nomeKey = `${normNome((d.properties.dealname || '').split(' - ')[0])}|${tipo}`;
    // já tem Fechado gêmeo POR NOME → sobra órfã, NÃO promover (duplicaria)
    if (fechadoNomeKeys.has(nomeKey)) { pulados.push({ d, email, up }); continue; }
    // só promove até o nº de vendas PAGAS daquela pessoa+tipo ainda descoberto (paid − fechados existentes − já
    // promovidos neste lote). Evita duplicar quando há 2+ presos pro mesmo 1 pagamento (ex.: Josilene: 2 abandonos/1 pago).
    const jaCobertos = (fechadoCount[key] || 0) + (promovidoCount[key] || 0);
    if (jaCobertos >= (paidCount[key] || 0)) { pulados.push({ d, email, up }); continue; }
    promovidoCount[key] = (promovidoCount[key] || 0) + 1;
    promover.push({ d, email, up });
  }
  console.log(`\nPulados (já têm Fechado gêmeo por e-mail/nome — sobra órfã, NÃO promover): ${pulados.length}`);
  console.log(`\n=== PRESOS QUE CONSTAM PAGOS NO KIWIFY (${promover.length}) → promover pra Fechado ===`);
  for (const p of promover) console.log(`  ${p.d.id} · ${p.email} · ${p.up ? 'UPSELL' : 'live'} · ${p.d.properties.dealstage === ABANDONO ? 'abandono' : 'aguardando'} · "${(p.d.properties.dealname || '').slice(0, 30)}"`);

  if (APPLY) {
    let ok = 0;
    for (const p of promover) { try { await hsFetch(`https://api.hubapi.com/crm/v3/objects/deals/${p.d.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ properties: { dealstage: FECHADO } }) }); ok++; } catch (e) { console.log(`   FALHOU ${p.d.id}: ${e.message.slice(0, 150)}`); } }
    console.log(`\nPromovidos: ${ok}/${promover.length} ✓`);
  } else { console.log('\n(dry-run — rode com --apply)'); }
})();
