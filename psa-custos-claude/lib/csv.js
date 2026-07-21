import { normalizeModel, equivCost } from "./pricing";

// --- Parser CSV robusto (aspas, vírgulas em campo, \r\n) ---
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  text = text.replace(/^﻿/, ""); // BOM
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\n") { pushField(); pushRow(); i++; continue; }
    if (c === "\r") { i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ""));
}

// --- Auto-detecção de colunas ---
const MATCHERS = {
  user:      [/e-?mail/i, /\buser\b/i, /member/i, /usu[aá]rio/i, /\bname\b/i, /pessoa/i],
  date:      [/date/i, /\bday\b/i, /timestamp/i, /data/i, /dia/i],
  model:     [/model/i, /modelo/i],
  inTok:     [/input.*token/i, /prompt.*token/i, /tokens?_?in/i, /entrada.*token/i],
  outTok:    [/output.*token/i, /completion.*token/i, /tokens?_?out/i, /sa[ií]da.*token/i],
  cacheRead: [/cache.*read/i, /read.*cache/i, /cache.*leitura/i],
  cacheWrite:[/cache.*creat/i, /cache.*writ/i, /write.*cache/i, /cache.*escrita/i],
  totalTok:  [/total.*token/i, /^tokens$/i, /tokens?_?total/i],
  cost:      [/cost/i, /spend/i, /\bamount\b/i, /\busd\b/i, /price/i, /gasto/i, /custo/i, /valor/i],
};

export function autoMap(headers) {
  const map = {};
  const used = new Set();
  for (const [field, pats] of Object.entries(MATCHERS)) {
    for (let h = 0; h < headers.length; h++) {
      if (used.has(h)) continue;
      const hd = String(headers[h] || "");
      if (pats.some(p => p.test(hd))) { map[field] = h; used.add(h); break; }
    }
  }
  return map;
}

const toNum = v => {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

// --- Normaliza linhas cruas -> registros + agrega ---
export function buildDataset(rows, map) {
  if (!rows.length) return null;
  const body = rows.slice(1);
  const get = (r, f) => (map[f] != null ? r[map[f]] : undefined);

  const records = body.map(r => {
    const modelKey = normalizeModel(get(r, "model"));
    const inTok = toNum(get(r, "inTok"));
    const outTok = toNum(get(r, "outTok"));
    const cacheRead = toNum(get(r, "cacheRead"));
    const cacheWrite = toNum(get(r, "cacheWrite"));
    let totalTok = toNum(get(r, "totalTok"));
    if (!totalTok) totalTok = inTok + outTok + cacheRead + cacheWrite;
    const csvCost = map.cost != null ? toNum(get(r, "cost")) : null;
    const equiv = equivCost(modelKey, { inTok, outTok, cacheRead, cacheWrite });
    let day = String(get(r, "date") || "").trim();
    const m = day.match(/(\d{4})[-/](\d{2})[-/](\d{2})/) || day.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (m) day = m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`;
    return {
      user: String(get(r, "user") || "—").trim() || "—",
      day, model: modelKey,
      inTok, outTok, cacheRead, cacheWrite, totalTok,
      csvCost, equiv,
    };
  }).filter(x => x.totalTok > 0 || x.csvCost);

  return aggregate(records);
}

function mk() { return { inTok: 0, outTok: 0, cacheRead: 0, cacheWrite: 0, totalTok: 0, csvCost: 0, equiv: 0, hasCsvCost: false, rows: 0 }; }
function add(acc, r) {
  acc.inTok += r.inTok; acc.outTok += r.outTok; acc.cacheRead += r.cacheRead;
  acc.cacheWrite += r.cacheWrite; acc.totalTok += r.totalTok; acc.equiv += r.equiv;
  if (r.csvCost != null) { acc.csvCost += r.csvCost; acc.hasCsvCost = true; }
  acc.rows++;
}

export function aggregate(records) {
  const totals = mk();
  const byUser = {}, byModel = {}, byDay = {};
  const userDays = {};
  for (const r of records) {
    add(totals, r);
    (byModel[r.model] ||= mk()); add(byModel[r.model], r);
    if (r.user) { (byUser[r.user] ||= mk()); add(byUser[r.user], r);
      (userDays[r.user] ||= new Set()); if (r.day) userDays[r.user].add(r.day); }
    if (r.day) { (byDay[r.day] ||= mk()); add(byDay[r.day], r); }
  }
  const days = Object.keys(byDay).sort();
  const activeDaysByUser = {}, activeDaySetByUser = {};
  for (const u in userDays) { activeDaysByUser[u] = userDays[u].size; activeDaySetByUser[u] = [...userDays[u]]; }
  return {
    records, totals, byUser, byModel, byDay, days,
    activeDaysByUser, activeDaySetByUser,
    hasCsvCost: totals.hasCsvCost,
    range: days.length ? { first: days[0], last: days[days.length - 1], activeDays: days.length } : null,
  };
}

// converte o sample-local.json (formato do agregador de logs) para o mesmo shape,
// emitindo registros POR DIA e POR MODELO (distribui os tokens de cada dia
// entre os modelos conforme a participação de cada tipo de token) — assim o
// filtro por data re-agrega igual ao caminho de CSV.
export function fromLocalSample(d) {
  const modelMap = {
    "claude-opus-4-8": "opus-4-8", "claude-opus-4-7": "opus-4-7", "claude-sonnet-5": "sonnet-5",
    "claude-sonnet-4-6": "sonnet-4-6", "claude-haiku-4-5-20251001": "haiku-4-5", "claude-fable-5": "fable-5",
  };
  const mc = d.modelCost || d.byModel || {};
  const sumType = (k) => Object.values(mc).reduce((s, v) => s + (v[k] || 0), 0);
  const tot = { in: sumType("in"), out: sumType("out"), cacheR: sumType("cacheR"), cacheW: sumType("cacheW") };
  const shares = {};
  for (const [m, v] of Object.entries(mc)) {
    const key = modelMap[m]; if (!key) continue;
    shares[key] = {
      in: tot.in ? v.in / tot.in : 0, out: tot.out ? v.out / tot.out : 0,
      cr: tot.cacheR ? v.cacheR / tot.cacheR : 0, cw: tot.cacheW ? v.cacheW / tot.cacheW : 0,
    };
  }
  const records = [];
  for (const [day, u] of Object.entries(d.byDay || {})) {
    for (const key of Object.keys(shares)) {
      const s = shares[key];
      const inTok = (u.in || 0) * s.in, outTok = (u.out || 0) * s.out;
      const cacheRead = (u.cacheR || 0) * s.cr, cacheWrite = (u.cacheW || 0) * s.cw;
      const totalTok = inTok + outTok + cacheRead + cacheWrite;
      if (totalTok <= 0) continue;
      records.push({
        user: "esta-maquina@local", day, model: key,
        inTok, outTok, cacheRead, cacheWrite, totalTok, csvCost: null,
        equiv: equivCost(key, { inTok, outTok, cacheRead, cacheWrite }),
      });
    }
  }
  const agg = aggregate(records);
  if (d.range) agg.range = { first: d.range.first, last: d.range.last, activeDays: agg.days.length };
  return agg;
}
