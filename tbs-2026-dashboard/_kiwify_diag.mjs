// Diagnóstico Kiwify × HubSpot — SOMENTE LEITURA.
// Lê credenciais de .env.local (gitignored), busca todas as vendas do Kiwify no período,
// e grava _kiwify_sales.json + imprime quebra por status/produto. Não escreve nada no Kiwify nem no HubSpot.
//
// Uso:  node _kiwify_diag.mjs
// Requer em kiwify-credenciais.txt (ou .env.local):
//   KIWIFY_CLIENT_ID=...
//   KIWIFY_CLIENT_SECRET=...
//   KIWIFY_ACCOUNT_ID=...
// Opcional:
//   KIWIFY_START_DATE=2026-06-01   (default 2026-06-01)
//   KIWIFY_END_DATE=2026-06-11     (default = amanhã, pra pegar o dia todo de hoje)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- carrega credenciais (kiwify-credenciais.txt ou .env.local) — parser simples, sem dependência ---
function loadEnv() {
  const candidates = ['kiwify-credenciais.txt', '.env.local'];
  const p = candidates.map((f) => path.join(__dirname, f)).find((f) => fs.existsSync(f));
  if (!p) {
    console.error('✗ Não achei kiwify-credenciais.txt (nem .env.local) em', __dirname);
    console.error('  Crie com KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID.');
    process.exit(1);
  }
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const CLIENT_ID = process.env.KIWIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.KIWIFY_CLIENT_SECRET;
const ACCOUNT_ID = process.env.KIWIFY_ACCOUNT_ID;
const START = process.env.KIWIFY_START_DATE || '2026-06-01';
const END = process.env.KIWIFY_END_DATE || (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

if (!CLIENT_ID || !CLIENT_SECRET || !ACCOUNT_ID) {
  console.error('✗ Faltando KIWIFY_CLIENT_ID / KIWIFY_CLIENT_SECRET / KIWIFY_ACCOUNT_ID no .env.local');
  process.exit(1);
}

const BRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function getToken() {
  const body = new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
  const r = await fetch('https://public-api.kiwify.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`OAuth falhou: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token;
}

async function listAllSales(token) {
  const all = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const qs = new URLSearchParams({
      start_date: new Date(START + 'T00:00:00Z').toISOString(),
      end_date: new Date(END + 'T00:00:00Z').toISOString(),
      page_number: String(page),
      page_size: String(pageSize),
    });
    const r = await fetch(`https://public-api.kiwify.com/v1/sales?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'x-kiwify-account-id': ACCOUNT_ID },
    });
    if (!r.ok) throw new Error(`Listar vendas falhou (página ${page}): ${r.status} ${await r.text()}`);
    const j = await r.json();
    const data = j.data || [];
    all.push(...data);
    process.stderr.write(`\r  página ${page} · acumulado ${all.length} vendas`);
    if (data.length < pageSize) break;
    page++;
  }
  process.stderr.write('\n');
  return all;
}

(async () => {
  console.log(`\nKiwify · período ${START} → ${END} (todas as vendas, todos os status)\n`);
  const token = await getToken();
  console.log('✓ token OK');
  const sales = await listAllSales(token);
  console.log(`✓ ${sales.length} vendas no total\n`);

  // grava bruto pra cruzar com HubSpot
  const out = sales.map((s) => ({
    id: s.id,
    reference: s.reference,
    status: s.status,
    product: s.product?.name,
    product_id: s.product?.id,
    net_amount: s.net_amount,
    payment_method: s.payment_method,
    approved_date: s.approved_date,
    created_at: s.created_at,
    email: s.customer?.email,
    name: s.customer?.name,
    cpf: s.customer?.cpf || s.customer?.cnpj,
    mobile: s.customer?.mobile,
  }));
  fs.writeFileSync(path.join(__dirname, '_kiwify_sales.json'), JSON.stringify(out, null, 2));
  console.log('✓ gravado _kiwify_sales.json\n');

  // quebra por status
  const byStatus = {};
  for (const s of out) {
    byStatus[s.status] ??= { count: 0, net: 0 };
    byStatus[s.status].count++;
    byStatus[s.status].net += Number(s.net_amount) || 0;
  }
  console.log('── Por status ──');
  for (const [st, v] of Object.entries(byStatus).sort((a, b) => b[1].net - a[1].net)) {
    console.log(`  ${st.padEnd(18)} ${String(v.count).padStart(4)} vendas · ${BRL(v.net / 100)}`);
  }

  // quebra por produto (só status pagos: paid + approved)
  const PAID = new Set(['paid', 'approved']);
  const paid = out.filter((s) => PAID.has(s.status));
  const byProd = {};
  for (const s of paid) {
    const k = s.product || '(sem nome)';
    byProd[k] ??= { count: 0, net: 0, product_id: s.product_id };
    byProd[k].count++;
    byProd[k].net += Number(s.net_amount) || 0;
  }
  console.log('\n── Pagos (paid+approved) por produto ──');
  for (const [name, v] of Object.entries(byProd).sort((a, b) => b[1].net - a[1].net)) {
    console.log(`  ${String(v.count).padStart(4)} · ${BRL(v.net / 100)} · ${name}  [${v.product_id}]`);
  }
  const totPaid = paid.reduce((s, x) => s + (Number(x.net_amount) || 0), 0);
  console.log(`\n  TOTAL pagos: ${paid.length} vendas · ${BRL(totPaid / 100)}`);
  console.log('\n(valores assumindo net_amount em centavos; confiro contra o HubSpot no próximo passo)\n');
})().catch((e) => { console.error('\n✗', e.message); process.exit(1); });
