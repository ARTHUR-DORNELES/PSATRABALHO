// Cruza o export do Kiwify (CSV) com os negócios FECHADOS do HubSpot. v2: UTF-8, e-mail correto da chave,
// e matching multichave (e-mail OU CPF OU nome, por tipo live/upsell) com atribuição gulosa.
const XLSX = require('xlsx');
const fs = require('fs');
const { hsFetch, hsSearchAllPaged } = require('./_kiwify_http.cjs');

const CSV = process.argv[2] || 'C:/Users/Usuário/Downloads/sales_t4lsxq_1781708464258.csv';
const env = fs.readFileSync('tbs-2026-dashboard/.env.local', 'utf8');
const TOKEN = (env.match(/^HUBSPOT_TOKEN=(.+)$/m) || [])[1].trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const PIPELINE = '904543067', STAGE_FECHADO = '1372708683';
const UUID_TRIP = '0831ef90-5b8e-11f1-8224-13e0b2554faa', UUID_UP = 'a6e42810-5b8e-11f1-bcec-81ce96602d5b';

const lc = (s) => String(s || '').trim().toLowerCase();
const normNome = (s) => lc(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
const isUpName = (s) => lc(s).includes('formato de aulas');
const emailFromChave = (chave) => lc(String(chave || '').replace(new RegExp(`_(${UUID_TRIP}|${UUID_UP})$`, 'i'), ''));

(async () => {
  const wb = XLSX.read(fs.readFileSync(CSV, 'utf8'), { type: 'string' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const statusTally = {};
  for (const r of rows) statusTally[r.Status] = (statusTally[r.Status] || 0) + 1;
  const paid = rows.filter((r) => lc(r.Status) === 'paid');
  console.log('CSV linhas:', rows.length, '· status:', JSON.stringify(statusTally));
  console.log('PAID:', paid.length, '· live:', paid.filter((r) => !isUpName(r.Produto)).length, '· upsell:', paid.filter((r) => isUpName(r.Produto)).length);

  // ── HubSpot fechados ──
  const deals = await hsSearchAllPaged(H, 'deals', [{ filters: [{ propertyName: 'pipeline', operator: 'EQ', value: PIPELINE }, { propertyName: 'dealstage', operator: 'EQ', value: STAGE_FECHADO }] }], ['dealname', 'amount', 'createdate', 'kiwify_chave']);

  const ids = deals.map((d) => d.id);
  const dealToContact = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const j = await hsFetch('https://api.hubapi.com/crm/v3/associations/deals/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: ids.slice(i, i + 100).map((id) => ({ id })) }) });
    for (const r of j.results || []) if (r.to?.length) dealToContact.set(r.from.id, r.to[0].id);
  }
  const cids = [...new Set([...dealToContact.values()])];
  const emailByC = new Map(), cpfByC = new Map();
  for (let i = 0; i < cids.length; i += 100) {
    const j = await hsFetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', { method: 'POST', headers: H, body: JSON.stringify({ inputs: cids.slice(i, i + 100).map((id) => ({ id })), properties: ['email', 'cpf'] }) });
    for (const c of j.results || []) { emailByC.set(c.id, lc(c.properties.email)); if (c.properties.cpf) cpfByC.set(c.id, onlyDigits(c.properties.cpf)); }
  }

  // índice HubSpot: cada negócio vira {up, emails:Set, cpf, nome}
  const hub = deals.map((d) => {
    const cid = dealToContact.get(d.id);
    const emails = new Set();
    const cEmail = cid ? emailByC.get(cid) : '';
    if (cEmail) emails.add(cEmail);
    const chEmail = emailFromChave(d.properties.kiwify_chave);
    if (chEmail) emails.add(chEmail);
    return { d, up: isUpName(d.properties.dealname), emails, cpf: cid ? cpfByC.get(cid) : '', nome: normNome((d.properties.dealname || '').split(' - ')[0]), used: false };
  });
  console.log('HubSpot fechados:', deals.length, '· live:', hub.filter((h) => !h.up).length, '· upsell:', hub.filter((h) => h.up).length);

  // ── matching guloso: cada Kiwify paid tenta achar um negócio do MESMO tipo, não usado, por e-mail/CPF/nome ──
  const faltam = [];
  for (const r of paid) {
    const up = isUpName(r.Produto);
    const email = lc(r.Email), cpf = onlyDigits(r['CPF / CNPJ']), nome = normNome(r.Cliente);
    const hit = hub.find((h) => !h.used && h.up === up && (
      (email && h.emails.has(email)) || (cpf && h.cpf && h.cpf === cpf) || (nome && h.nome === nome)
    ));
    if (hit) hit.used = true; else faltam.push(r);
  }
  const extra = hub.filter((h) => !h.used);

  console.log('\n=== KIWIFY PAID SEM NEGÓCIO NO HUBSPOT (', faltam.length, ') ===');
  for (const r of faltam) console.log(`  ${r['ID da venda']} · ${r.Cliente} · ${r.Email} · ${isUpName(r.Produto) ? 'UPSELL' : 'live'} · ${r.Pagamento} · R$${r['Valor líquido']} · criado ${r['Data de Criação']} · receb:${r['Status do recebimento']}`);

  console.log('\n=== NEGÓCIO NO HUBSPOT SEM PAID NO KIWIFY (', extra.length, ') ===');
  for (const h of extra) console.log(`  ${h.d.id} · "${(h.d.properties.dealname || '').slice(0, 45)}" · ${[...h.emails].join('/') || '(s/email)'} · ${h.up ? 'UPSELL' : 'live'} · R$${h.d.properties.amount} · criado ${(h.d.properties.createdate || '').slice(0, 10)}`);
})();
