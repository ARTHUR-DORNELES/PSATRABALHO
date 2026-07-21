import { unstable_cache } from 'next/cache';

// Custo dos disparos de WhatsApp (Max + Maria) via Graph API — modelo NOVO (cobrança por mensagem).
// Fonte de custo: pricing_analytics (custo real por categoria/dia). Volume por template: template_analytics.
// Câmbio USD→BRL: awesomeapi (do dia, registrado com data). Liga com WHATSAPP_MGMT_TOKEN no .env.
// O token precisa de whatsapp_business_management + as WABAs Max/Maria no escopo.

const API = 'v20.0';
const SINCE = process.env.WA_COSTS_SINCE || '2026-06-01';
const WABAS: { key: string; id: string }[] = [
  { key: 'Max', id: process.env.WA_WABA_MAX || '3038720469666710' },
  { key: 'Maria', id: process.env.WA_WABA_MARIA || '1535261661304352' },
];

export type Disparo = {
  id: string;
  name: string;
  waba: string;
  category: string;
  sent: number;
  costUsd: number; // rateado do custo de marketing da conta pela fatia de envios
  costBrl: number;
  isTbs: boolean; // nome bate com padrão TBS (tbs_* / b_* / palestr / live)
};
export type WabaCost = {
  waba: string;
  id: string;
  marketingUsd: number;
  marketingVol: number;
  otherUsd: number; // autenticação + utilidade
  sent: number; // envios de marketing detalhados por template (template_analytics)
  attributedUsd: number; // custo já atribuído a templates (resto = sem analytics por template)
  ratePerMsgUsd: number; // custo real por mensagem de marketing (custo ÷ volume)
  daily: { date: string; usd: number }[]; // custo de marketing por dia
};
export type WhatsappCosts = {
  configured: boolean;
  error?: string;
  fxUsdBrl: number;
  fxDate: string;
  fxSource: string;
  periodSince: string;
  periodUntil: string;
  accounts: WabaCost[];
  disparos: Disparo[];
  totalMarketingUsd: number;
  totalMarketingBrl: number;
};

const EMPTY: WhatsappCosts = {
  configured: false, fxUsdBrl: 0, fxDate: '', fxSource: '', periodSince: SINCE, periodUntil: '',
  accounts: [], disparos: [], totalMarketingUsd: 0, totalMarketingBrl: 0,
};

const isTbsName = (n: string) => /^b_|^tbs_|tbs|palestr|live|inscri/i.test(n || '');

async function fetchFx(): Promise<{ rate: number; date: string; source: string }> {
  try {
    const j = await (await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { cache: 'no-store' })).json();
    const u = j.USDBRL;
    const bid = parseFloat(u.bid), ask = parseFloat(u.ask);
    const rate = ask && bid ? (bid + ask) / 2 : bid || ask;
    return { rate: Number(rate.toFixed(4)), date: u.create_date || '', source: 'awesomeapi USD-BRL (média bid/ask)' };
  } catch (e) {
    // fallback: câmbio fixo aproximado (marcado como estimado)
    return { rate: 5.2, date: '', source: 'fallback fixo (awesomeapi indisponível)' };
  }
}

async function gGet(url: string): Promise<Record<string, unknown>> {
  const token = process.env.WHATSAPP_MGMT_TOKEN as string;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return r.json();
}

async function fetchWhatsapp(): Promise<WhatsappCosts> {
  const token = process.env.WHATSAPP_MGMT_TOKEN;
  if (!token) return EMPTY;
  const since = Math.floor(new Date(SINCE + 'T00:00:00Z').getTime() / 1000);
  const until = Math.floor(Date.now() / 1000);
  const untilDate = new Date(Date.now()).toISOString().slice(0, 10);

  try {
    const fx = await fetchFx();
    const accounts: WabaCost[] = [];
    const disparos: Disparo[] = [];

    for (const w of WABAS) {
      // 1) custo real por categoria/dia
      const pf = `pricing_analytics.start(${since}).end(${until}).granularity(DAILY).metric_types(["COST","VOLUME"]).dimensions(["PRICING_CATEGORY"])`;
      const pj = await gGet(`https://graph.facebook.com/${API}/${w.id}?fields=${encodeURIComponent(pf)}`);
      const pdps = (((pj.pricing_analytics as Record<string, unknown>)?.data as Record<string, unknown>[])?.[0]?.data_points as Record<string, unknown>[]) || [];
      let marketingUsd = 0, marketingVol = 0, otherUsd = 0;
      const dailyMap: Record<string, number> = {};
      for (const d of pdps) {
        const cat = String(d.pricing_category || '');
        const cost = Number(d.cost || 0);
        if (cat === 'MARKETING') {
          marketingUsd += cost; marketingVol += Number(d.volume || 0);
          const day = new Date(Number(d.start) * 1000).toISOString().slice(0, 10);
          dailyMap[day] = (dailyMap[day] || 0) + cost;
        } else { otherUsd += cost; }
      }
      const daily = Object.entries(dailyMap).map(([date, usd]) => ({ date, usd })).sort((a, b) => a.date.localeCompare(b.date));

      // 2) templates da conta (nome + categoria)
      const tj = await gGet(`https://graph.facebook.com/${API}/${w.id}/message_templates?fields=id,name,category,status&limit=250`);
      const tpls = ((tj.data as Record<string, unknown>[]) || []).map((t) => ({ id: String(t.id), name: String(t.name), category: String(t.category || ''), status: String(t.status || '') }));
      const mkt = tpls.filter((t) => t.category === 'MARKETING');

      // 3) envios por template (template_analytics em lotes de 10)
      const sentById: Record<string, number> = {};
      for (let i = 0; i < mkt.length; i += 10) {
        const ids = mkt.slice(i, i + 10).map((t) => t.id);
        const url = `https://graph.facebook.com/${API}/${w.id}/template_analytics?start=${since}&end=${until}&granularity=DAILY&metric_types=SENT&template_ids=${encodeURIComponent(JSON.stringify(ids))}`;
        const aj = await gGet(url);
        const adps = (((aj.data as Record<string, unknown>[]) || [])[0]?.data_points as Record<string, unknown>[]) || [];
        for (const d of adps) { const id = String(d.template_id); sentById[id] = (sentById[id] || 0) + Number(d.sent || 0); }
      }
      const totalSent = Object.values(sentById).reduce((a, b) => a + b, 0);
      // custo REAL por mensagem de marketing (custo total ÷ volume cobrado). Não normalizo pelos
      // envios captados — senão o custo de cada disparo fica inflado (o template_analytics só
      // detalha parte dos envios; o WhatsApp passou a registrar por template há pouco).
      const ratePerMsgUsd = marketingVol > 0 ? marketingUsd / marketingVol : 0;

      let attributedUsd = 0;
      for (const t of mkt) {
        const sent = sentById[t.id] || 0;
        if (sent === 0) continue;
        const costUsd = ratePerMsgUsd * sent;
        attributedUsd += costUsd;
        disparos.push({ id: t.id, name: t.name, waba: w.key, category: t.category, sent, costUsd, costBrl: costUsd * fx.rate, isTbs: isTbsName(t.name) });
      }
      accounts.push({ waba: w.key, id: w.id, marketingUsd, marketingVol, otherUsd, sent: totalSent, attributedUsd, ratePerMsgUsd, daily });
    }

    disparos.sort((a, b) => b.costUsd - a.costUsd);
    const totalMarketingUsd = accounts.reduce((a, b) => a + b.marketingUsd, 0);
    return {
      configured: true,
      fxUsdBrl: fx.rate, fxDate: fx.date, fxSource: fx.source,
      periodSince: SINCE, periodUntil: untilDate,
      accounts, disparos,
      totalMarketingUsd, totalMarketingBrl: totalMarketingUsd * fx.rate,
    };
  } catch (e) {
    return { ...EMPTY, error: e instanceof Error ? e.message : String(e) };
  }
}

// Cache 10 min (custo/câmbio mudam devagar). Invalida junto com o "Atualizar" (tag dashboard).
export const getWhatsappCosts = unstable_cache(fetchWhatsapp, ['whatsapp-costs'], { tags: ['dashboard'], revalidate: 600 });
