import { getClient, storageConfigured } from './registros-store';

// Cliente da API pública do Kiwify — puxa as vendas PAGAS automaticamente (substitui o export manual de CSV).
// Auth OAuth: POST /v1/oauth/token (client_id + client_secret → bearer, expira 96h; cacheado no Redis).
// Vendas: GET /v1/sales?status=paid&start_date&end_date (máx 90 dias por chamada), paginado.
// Env: KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID.
const BASE = 'https://public-api.kiwify.com/v1';
const TOKEN_KEY = 'tbs:kiwify:token';

export type KiwifySale = {
  orderId: string;
  email: string;
  cliente: string;
  produto: string;
  status: string;
  netAmount: number; // valor líquido
  createdAt: string; // ISO
  paymentMethod: string;
  isUpsell: boolean; // "formato de aulas" = gravação/upsell
};

export function kiwifyConfigured(): boolean {
  return !!(process.env.KIWIFY_CLIENT_ID && process.env.KIWIFY_CLIENT_SECRET && process.env.KIWIFY_ACCOUNT_ID);
}

// Gera (ou reusa do Redis) o bearer token. O Kiwify avisa pra NÃO gerar a cada chamada (expira 96h).
async function getToken(): Promise<string> {
  if (storageConfigured()) {
    try {
      const cached = await getClient().get(TOKEN_KEY);
      if (cached) return cached;
    } catch { /* segue e gera novo */ }
  }
  const body = new URLSearchParams({
    client_id: process.env.KIWIFY_CLIENT_ID as string,
    client_secret: process.env.KIWIFY_CLIENT_SECRET as string,
  });
  const r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`Kiwify oauth falhou: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  const token = j.access_token as string;
  // cacheia por ~90h (margem antes das 96h)
  if (storageConfigured()) { try { await getClient().set(TOKEN_KEY, token, 'EX', 90 * 3600); } catch { /* ok */ } }
  return token;
}

const isUpsellName = (s: string) => /formato de aulas/i.test(s || '');

// Puxa TODAS as vendas pagas no período (paginado). Datas em YYYY-MM-DD (intervalo ≤ 90 dias).
export async function fetchKiwifyPaidSales(startDate: string, endDate: string): Promise<KiwifySale[]> {
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}`, 'x-kiwify-account-id': process.env.KIWIFY_ACCOUNT_ID as string };
  const out: KiwifySale[] = [];
  let page = 1;
  for (let guard = 0; guard < 200; guard++) {
    const qs = new URLSearchParams({ status: 'paid', start_date: startDate, end_date: endDate, page_size: '100', page_number: String(page) });
    const r = await fetch(`${BASE}/sales?${qs}`, { headers, cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(`Kiwify sales falhou: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    const rows = (j.data || []) as Record<string, unknown>[];
    for (const s of rows) {
      const cust = (s.customer || {}) as Record<string, unknown>;
      const prod = (s.product || {}) as Record<string, unknown>;
      const produto = String(prod.name || '');
      out.push({
        orderId: String(s.id || s.reference || ''),
        email: String(cust.email || '').trim().toLowerCase(),
        cliente: String(cust.name || ''),
        produto,
        status: String(s.status || ''),
        netAmount: Number(s.net_amount || 0) / 100 || Number(s.net_amount || 0), // Kiwify costuma vir em centavos
        createdAt: String(s.created_at || ''),
        paymentMethod: String(s.payment_method || ''),
        isUpsell: isUpsellName(produto),
      });
    }
    const totalPages = Number((j.pagination as Record<string, unknown>)?.total_pages ?? (rows.length < 100 ? page : page + 1));
    if (rows.length < 100 || page >= totalPages) break;
    page++;
  }
  return out;
}
