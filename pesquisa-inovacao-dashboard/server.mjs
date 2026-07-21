import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = Number(process.env.PORT || 4173);
const TOKEN = process.env.HUBSPOT_TOKEN;
const EMAIL_IDS = (process.env.EMAIL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const NAME_PREFIX = process.env.HUBSPOT_EMAIL_NAME_PREFIX || process.env.EMAIL_NAME_PREFIX || '[PSA] Pesquisa - Inovação';
const FORM_NAME_PREFIX = process.env.FORM_NAME_PREFIX || 'Inovação |';
const EXTRA_FORM_NAMES = (process.env.EXTRA_FORM_NAMES || 'Formulário - The Best School').split(',').map(s => s.trim()).filter(Boolean);
const BENCHMARK = {
  openRate: Number(process.env.BENCHMARK_OPEN_RATE || 22),
  clickRate: Number(process.env.BENCHMARK_CLICK_RATE || 2.5),
  formConversion: Number(process.env.BENCHMARK_FORM_CONVERSION || 15),
};

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/data', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    res.type('application/json').send(raw);
  } catch (e) {
    res.status(500).json({ error: 'Não foi possível ler data.json: ' + e.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  if (!TOKEN) {
    return res.status(400).json({
      error: 'HUBSPOT_TOKEN não configurado em .env. Copie .env.example para .env e preencha o token.',
    });
  }

  try {
    const emails = await resolveEmails();
    if (emails.length === 0) {
      return res.status(404).json({
        error: `Nenhum e-mail encontrado. Verifique EMAIL_IDS ou EMAIL_NAME_PREFIX (atual: "${NAME_PREFIX}").`,
      });
    }

    let prev = null;
    try { prev = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch {}
    const prevByRawName = {};
    if (prev?.segments) for (const s of prev.segments) prevByRawName[s.rawName] = s;

    const statsMap = await fetchAllEmailStats(emails.map(e => e.id));
    const segments = emails.map(email => {
      const live = buildSegment(email, statsMap[email.id] || null);
      const existing = prevByRawName[email.name];
      if (existing) {
        if (existing.name && existing.name !== live.rawName) live.name = existing.name;
        if (existing.description) live.description = existing.description;
        if (existing.badge) live.badge = existing.badge;
        if (existing.form) live.form = existing.form;
      }
      return live;
    });

    const warnings = [];
    let forms = [];
    try {
      forms = await fetchForms();
    } catch (e) {
      const msg = e.message.includes('403')
        ? 'Forms não puxados: Private App sem scope `forms`. Adicione em HubSpot > Settings > Private Apps > Scopes.'
        : `Forms não puxados: ${e.message}`;
      warnings.push(msg);
    }
    if (forms.length > 0) attachFormsToSegments(segments, forms);

    segments.sort((a, b) => b.delivered - a.delivered);

    const payload = {
      lastUpdated: new Date().toISOString(),
      source: 'hubspot-live',
      benchmark: BENCHMARK,
      segments,
      warnings,
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2));
    res.json(payload);
  } catch (e) {
    console.error('[refresh] erro:', e);
    res.status(500).json({ error: e.message });
  }
});

async function hubspotGet(urlPath) {
  const url = urlPath.startsWith('http') ? urlPath : `https://api.hubapi.com${urlPath}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HubSpot ${r.status} em ${urlPath}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

async function fetchEmailsByIds(ids) {
  const results = await Promise.all(ids.map(id =>
    hubspotGet(`/marketing/v3/emails/${id}`).catch(e => {
      console.warn(`[resolve] falha ao buscar email ${id}: ${e.message}`);
      return null;
    })
  ));
  return results.filter(Boolean);
}

async function resolveEmails() {
  if (EMAIL_IDS.length > 0) return fetchEmailsByIds(EMAIL_IDS);

  try {
    const prev = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    const cached = (prev.segments || []).map(s => s.id).filter(id => /^\d+$/.test(String(id)));
    if (cached.length > 0) {
      const emails = await fetchEmailsByIds(cached);
      if (emails.length === cached.length) {
        console.log('[resolve] usando cache de IDs:', cached);
        return emails;
      }
    }
  } catch {}

  let after = null;
  const all = [];
  do {
    const url = new URL('https://api.hubapi.com/marketing/v3/emails');
    url.searchParams.set('limit', '100');
    url.searchParams.set('archived', 'false');
    if (after) url.searchParams.set('after', after);
    const data = await hubspotGet(url.toString());
    all.push(...(data.results || []));
    after = data?.paging?.next?.after || null;
  } while (after && all.length < 1000);

  const prefix = NAME_PREFIX.toLowerCase();
  return all.filter(e => (e.name || '').toLowerCase().startsWith(prefix));
}

async function fetchAllEmailStats(emailIds) {
  const start = '2026-01-01T00:00:00Z';
  const end = new Date().toISOString();
  const results = await Promise.all(emailIds.map(async (id) => {
    const url = new URL('https://api.hubapi.com/marketing/v3/emails/statistics/list');
    url.searchParams.set('startTimestamp', start);
    url.searchParams.set('endTimestamp', end);
    url.searchParams.append('emailIds', id);
    try {
      const data = await hubspotGet(url.toString());
      return [id, data.aggregate || null];
    } catch (e) {
      console.warn(`[stats] email ${id} failed:`, e.message);
      return [id, null];
    }
  }));
  const map = Object.fromEntries(results.filter(([, v]) => v));
  console.log('[stats] fetched ids:', Object.keys(map));
  return map;
}

function buildSegment(email, stats) {
  const rawName = email.name || `Email ${email.id}`;
  const cleanName = rawName.replace(/^\[PSA\]\s*Pesquisa\s*-\s*Inova[cç]ão\s*-\s*/i, '').trim();

  const counters = stats?.counters || {};
  const ratios = stats?.ratios || {};

  const delivered = num(counters.delivered ?? counters.sent ?? 0);
  const opens = num(counters.open ?? counters.opens ?? 0);
  const clicks = num(counters.click ?? counters.clicks ?? 0);

  const openRateRaw = ratios.openratio ?? ratios.openRatio;
  const clickRateRaw = ratios.clickratio ?? ratios.clickRatio;
  const openRate = openRateRaw != null
    ? num(openRateRaw)
    : (delivered > 0 ? (opens / delivered) * 100 : 0);
  const clickRate = clickRateRaw != null
    ? num(clickRateRaw)
    : (delivered > 0 ? (clicks / delivered) * 100 : 0);

  return {
    id: String(email.id),
    name: cleanName || rawName,
    rawName,
    delivered,
    opens,
    clicks,
    openRate: round(openRate, 2),
    clickRate: round(clickRate, 2),
    publishedAt: email.publishDate || email.publishedAt || null,
    updatedAt: email.updatedAt || null,
  };
}

async function fetchForms() {
  const prefix = FORM_NAME_PREFIX.toLowerCase();
  const all = [];
  let after = null;
  do {
    const url = new URL('https://api.hubapi.com/marketing/v3/forms');
    url.searchParams.set('limit', '50');
    if (after) url.searchParams.set('after', after);
    const data = await hubspotGet(url.toString());
    all.push(...(data.results || []));
    after = data?.paging?.next?.after || null;
  } while (after && all.length < 500);

  const extraLower = EXTRA_FORM_NAMES.map(n => n.toLowerCase());
  const matched = all.filter(f => {
    const name = (f.name || '').toLowerCase();
    if (name.startsWith(prefix)) return true;
    return extraLower.some(n => name.includes(n));
  });
  const enriched = [];
  for (const f of matched) {
    const analytics = await fetchFormAnalytics(f.id || f.guid);
    const locations = f.locations || f.pageLocations || [];
    enriched.push({
      id: f.id || f.guid,
      name: f.name,
      views: analytics.views,
      submissions: analytics.submissions,
      spam: analytics.spam,
      pageLocations: locations,
      pageLocationsCount: Array.isArray(locations) ? locations.length : (typeof locations === 'number' ? locations : 0),
      updatedAt: f.updatedAt || null,
    });
  }
  return enriched;
}

async function fetchFormAnalytics(formId) {
  const today = new Date();
  const end = formatDate(today);
  const start = formatDate(new Date(today.getTime() - 90 * 24 * 3600 * 1000));

  const tries = [
    `/analytics/v2/reports/forms/total?start=${start}&end=${end}&breakdownBy=forms&f=formId:${formId}`,
    `/analytics/v2/reports/forms/total?d1=${start}&d2=${end}&f=forms:${formId}`,
  ];

  let views = 0, submissions = 0, spam = 0;
  for (const path of tries) {
    try {
      const data = await hubspotGet(path);
      const bd = (data.breakdowns || [])[0] || data.total || data;
      views = num(bd.pageViews ?? bd.views ?? bd.formViews ?? 0);
      submissions = num(bd.submissions ?? bd.formSubmissions ?? 0);
      spam = num(bd.spamSubmissions ?? bd.spam ?? 0);
      if (views || submissions) break;
    } catch {}
  }

  if (submissions === 0) {
    try {
      const subs = await hubspotGet(`/marketing/v3/forms/${formId}/submissions?limit=50`);
      submissions = (subs.results || []).length;
    } catch {}
  }

  return { views, submissions, spam };
}

function attachFormsToSegments(segments, forms) {
  const sharedAssignments = {};
  for (const seg of segments) {
    const matches = forms.filter(f => matchFormToSegment(f.name, seg.name));
    if (matches.length > 0) {
      sharedAssignments[matches[0].id] = (sharedAssignments[matches[0].id] || 0) + 1;
      seg.form = matches[0];
    }
  }
  for (const seg of segments) {
    if (seg.form && sharedAssignments[seg.form.id] > 1) {
      seg.form = { ...seg.form, shared: true };
    }
  }
}

function matchFormToSegment(formName, segmentName) {
  const fn = formName.toLowerCase();
  const sn = segmentName.toLowerCase();
  if (fn.includes('the best school') && (sn.includes('ex-tbw') || sn.includes('ex tbw') || sn.includes('tbw'))) return true;
  const after = fn.split('|').slice(1).join('|').trim();
  if (!after) return false;
  if (sn.includes(after)) return true;
  if (after.includes('cdl') && sn.includes('cdl')) return true;
  if (after.includes('agência') && sn.includes('agência')) return true;
  if (after.includes('agencia') && sn.includes('agência')) return true;
  if (after === 'outros' && sn === 'outros') return true;
  return false;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function round(v, dp) { const f = 10 ** dp; return Math.round(v * f) / f; }

app.listen(PORT, () => {
  console.log(`\n  Pesquisa Inovação Dashboard`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → POST http://localhost:${PORT}/api/refresh para atualizar do HubSpot\n`);
});
