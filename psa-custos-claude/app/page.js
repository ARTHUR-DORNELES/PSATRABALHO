"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { parseCSV, autoMap, buildDataset, aggregate, fromLocalSample } from "../lib/csv";
import { MODEL_LABEL } from "../lib/pricing";

// conta dias ÚTEIS (seg–sex) no intervalo [first,last] que NÃO estão no conjunto de dias ativos
function weekdayIdle(first, last, activeSet) {
  if (!first || !last) return { idle: 0, weekdays: 0 };
  let idle = 0, weekdays = 0;
  const cur = new Date(first + "T00:00:00Z");
  const end = new Date(last + "T00:00:00Z");
  while (cur <= end) {
    const dow = cur.getUTCDay(); // 0=dom, 6=sáb
    if (dow >= 1 && dow <= 5) {
      weekdays++;
      if (!activeSet.has(cur.toISOString().slice(0, 10))) idle++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return { idle, weekdays };
}

const FIELDS = [
  ["user", "Usuário / e-mail"], ["date", "Data"], ["model", "Modelo"],
  ["inTok", "Tokens entrada"], ["outTok", "Tokens saída"],
  ["cacheRead", "Cache leitura"], ["cacheWrite", "Cache escrita"],
  ["totalTok", "Tokens total"], ["cost", "Custo / gasto (US$)"],
];
const LS_KEY = "psa-custos-claude-v1";

export default function Page() {
  const [data, setData] = useState(null);
  const [source, setSource] = useState(null); // 'csv' | 'sample'
  const [headers, setHeaders] = useState(null);
  const [rawRows, setRawRows] = useState(null);
  const [map, setMap] = useState({});
  const [fx, setFx] = useState(5.4);
  const [seatPrice, setSeatPrice] = useState(30);
  const [seats, setSeats] = useState(1);
  const [hot, setHot] = useState(false);
  const [theme, setTheme] = useState(null);
  const [err, setErr] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [tab, setTab] = useState("resumo");
  const fileRef = useRef(null);

  // ao carregar/trocar dataset, reseta o período pro intervalo completo
  useEffect(() => {
    if (data?.range) { setFrom(data.range.first); setTo(data.range.last); }
  }, [data]);

  // restore
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (s) {
        if (s.fx) setFx(s.fx);
        if (s.seatPrice) setSeatPrice(s.seatPrice);
        if (s.seats) setSeats(s.seats);
        if (s.source === "csv" && s.records) { setData(aggregate(s.records)); setSource("csv"); }
        else if (s.source === "sample") loadSample();
      }
    } catch {}
  }, []); // eslint-disable-line

  const persist = useCallback((patch) => {
    try {
      const cur = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch {}
  }, []);

  useEffect(() => { persist({ fx, seatPrice, seats }); }, [fx, seatPrice, seats, persist]);

  async function loadSample() {
    setErr(null);
    try {
      const d = await fetch("/sample-local.json").then(r => r.json());
      setData(fromLocalSample(d)); setSource("sample"); setHeaders(null);
      persist({ source: "sample", records: null });
    } catch (e) { setErr("Falha ao carregar a amostra: " + (e?.message || e)); }
  }

  function ingest(text) {
    setErr(null);
    try {
      const rows = parseCSV(text);
      if (rows.length < 2) { setErr("CSV vazio ou sem linhas de dados."); return; }
      const hdr = rows[0];
      const m = autoMap(hdr);
      const ds = buildDataset(rows, m);
      if (!ds || !ds.records.length) { setErr("Não consegui ler linhas úteis. Confira o mapeamento de colunas."); }
      setHeaders(hdr); setRawRows(rows); setMap(m); setSource("csv"); setData(ds);
      persist({ source: "csv", records: ds ? ds.records : [] });
    } catch (e) { setErr("Erro ao processar o CSV: " + (e?.message || e)); }
  }

  function onFile(f) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => ingest(String(r.result));
    r.readAsText(f);
  }
  function remap(field, idx) {
    const m = { ...map, [field]: idx === "" ? undefined : Number(idx) };
    setMap(m);
    const ds = buildDataset(rawRows, m);
    setData(ds); persist({ source: "csv", records: ds.records });
  }
  function reset() {
    setData(null); setSource(null); setHeaders(null); setRawRows(null);
    localStorage.removeItem(LS_KEY);
  }

  function toggleTheme() {
    const sysDark = window.matchMedia("(prefers-color-scheme:dark)").matches;
    const next = theme ? (theme === "dark" ? "light" : "dark") : (sysDark ? "light" : "dark");
    setTheme(next); document.documentElement.setAttribute("data-theme", next);
  }

  // ---- formatters ----
  const brl = (usd) => "R$ " + (usd * fx).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const brl2 = (usd) => "R$ " + (usd * fx).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdF = (v) => "US$ " + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const int = (n) => Math.round(n).toLocaleString("pt-BR");
  const tok = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "k" : "" + Math.round(n);
  const dfmt = (s) => { const p = String(s).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : s; };

  // ---- dataset filtrado pelo período selecionado ----
  const view = useMemo(() => {
    if (!data) return null;
    if (!from && !to) return data;
    const recs = (data.records || []).filter(r => r.day && (!from || r.day >= from) && (!to || r.day <= to));
    return aggregate(recs);
  }, [data, from, to]);

  function setPreset(kind) {
    if (!data?.range) return;
    const first = data.range.first, last = data.range.last;
    if (kind === "all") { setFrom(first); setTo(last); return; }
    if (kind === "mtd") { const s = last.slice(0, 8) + "01"; setFrom(s < first ? first : s); setTo(last); return; }
    const back = { "7": 6, "30": 29, "90": 89 }[kind] || 0;
    const dt = new Date(last + "T00:00:00"); dt.setDate(dt.getDate() - back);
    const s = dt.toISOString().slice(0, 10);
    setFrom(s < first ? first : s); setTo(last);
  }

  // ---- derived ----
  const D = useMemo(() => {
    if (!view) return null;
    const t = view.totals;
    const equiv = t.equiv;
    const csvCost = view.hasCsvCost ? t.csvCost : null;
    const first = from || view.range?.first;
    const last = to || view.range?.last;
    const spanDays = (first && last) ? Math.round((new Date(last) - new Date(first)) / 86400000) + 1 : (view.range?.activeDays || 1);
    const activeDays = view.range?.activeDays || 0;
    // ociosidade considera só dias úteis (seg–sex) sem nenhuma sessão
    const activeSet = new Set(Object.keys(view.byDay));
    const { idle: idleDays, weekdays } = weekdayIdle(first, last, activeSet);
    const months = spanDays / 30.44;
    const planPeriod = seats * seatPrice * months;
    const roi = planPeriod > 0 ? equiv / planPeriod : 0;
    return { t, equiv, csvCost, range: { first, last, activeDays }, spanDays, activeDays, idleDays, weekdays, months, planPeriod, roi };
  }, [view, from, to, seats, seatPrice]);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="brandmark"><span className="dot" />PSA · Custos & Uso Claude</div>
          <h1>Custos e utilização reais de Claude no grupo PSA</h1>
          <p className="sub">Alimentado pelo <b>CSV de Analytics do claude.ai</b> (por usuário · modelo · tokens · gasto). Custo real do plano × valor-equivalente de API × ROI, em reais.</p>
          {view && D && <Chips D={D} source={source} data={view} int={int} tok={tok} dfmt={dfmt} />}
        </div>
        <div className="rightctrl">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="themebtn" onClick={toggleTheme}>◐ tema</button>
            <button className="themebtn" onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }}>sair</button>
          </div>
          <div className="fxbox"><label>US$→R$</label>
            <input className="num" type="number" step="0.01" value={fx} onChange={e => setFx(parseFloat(e.target.value) || 0)} /></div>
        </div>
      </header>

      <nav className="tabs">
        <button className={"tab" + (tab === "resumo" ? " on" : "")} onClick={() => setTab("resumo")}>Resumo</button>
        <button className={"tab" + (tab === "painel" ? " on" : "")} onClick={() => setTab("painel")}>Painel (CSV)</button>
        <button className={"tab" + (tab === "iniciativas" ? " on" : "")} onClick={() => setTab("iniciativas")}>Iniciativas</button>
        <button className={"tab" + (tab === "ia" ? " on" : "")} onClick={() => setTab("ia")}>Custos por IA</button>
        <button className={"tab" + (tab === "benchmark" ? " on" : "")} onClick={() => setTab("benchmark")}>Benchmark de mercado</button>
        <button className={"tab" + (tab === "assentos" ? " on" : "")} onClick={() => setTab("assentos")}>Right-sizing de assentos</button>
        <button className={"tab" + (tab === "docs" ? " on" : "")} onClick={() => setTab("docs")}>Como funcionam os custos</button>
      </nav>

      {tab === "resumo" ? <Resumo />
        : tab === "docs" ? <Methodology brl={brl} fx={fx} />
        : tab === "benchmark" ? <Benchmark />
        : tab === "ia" ? <AICosts />
        : tab === "assentos" ? <RightSizing brl={brl} fx={fx} />
        : tab === "iniciativas" ? <Initiatives />
        : (<>

      {err && (
        <div className="banner idle" style={{ background: "var(--spend-soft)", borderColor: "color-mix(in srgb,var(--spend) 40%,transparent)" }}>
          <span className="ic" style={{ color: "var(--spend)" }}>!</span>
          <div>{err}</div>
        </div>
      )}

      {!data && (
        <>
          <div className={"drop" + (hot ? " hot" : "")}
            onDragOver={e => { e.preventDefault(); setHot(true); }}
            onDragLeave={() => setHot(false)}
            onDrop={e => { e.preventDefault(); setHot(false); onFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}>
            <h3>Solte aqui o CSV de Analytics do claude.ai</h3>
            <p>Owner → claude.ai → iniciais (canto inf. esq.) → <b>Analytics → Claude Code → Export CSV</b>. Reconhece as colunas automaticamente.</p>
            <div className="or" onClick={e => e.stopPropagation()}>
              <button className="btn primary" onClick={() => fileRef.current?.click()}>Escolher arquivo CSV</button>
              <button className="btn" onClick={loadSample}>Ver com amostra (esta máquina)</button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
              onChange={e => onFile(e.target.files?.[0])} />
          </div>
          <p className="fine">Colunas esperadas (nomes flexíveis): <code>usuário/email</code>, <code>data</code>, <code>modelo</code>, <code>tokens (entrada/saída/cache)</code> e, se houver, <code>custo/gasto US$</code>. Se não tiver custo, o painel calcula o <b>valor-equivalente</b> pelos preços de API. Tudo processado <b>localmente no navegador</b> — nada é enviado pra fora.</p>
        </>
      )}

      {view && D && (
        <>
          <div className="toolbar">
            <button className="btn" onClick={() => fileRef.current?.click()}>Trocar CSV</button>
            <button className="btn" onClick={reset}>Limpar</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => onFile(e.target.files?.[0])} />
            {source === "sample" &&
              <span className="chip src">amostra — só esta máquina, não é o grupo</span>}
          </div>

          {source === "sample" && (
            <div className="banner idle"><span className="ic">i</span>
              <div>Você está vendo a <b>amostra desta máquina</b> (dados reais de uma conta só). Para o <b>grupo PSA inteiro</b>, exporte o CSV do claude.ai Analytics e solte em “Trocar CSV”.</div></div>
          )}

          {headers && source === "csv" && (
            <details className="card" style={{ marginBottom: 16 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Mapeamento de colunas {Object.keys(map).length ? "(auto-detectado — ajuste se algo ficou errado)" : ""}</summary>
              <div className="mapping" style={{ marginTop: 14 }}>
                {FIELDS.map(([f, lbl]) => (
                  <div key={f}>
                    <label>{lbl}</label>
                    <select value={map[f] ?? ""} onChange={e => remap(f, e.target.value)}>
                      <option value="">— nenhuma —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h || `col ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="periodbar">
            <span className="pb-label">Período</span>
            <input type="date" className="dateinp" value={from || ""}
              min={data.range?.first} max={to || data.range?.last}
              onChange={e => setFrom(e.target.value)} />
            <span className="pb-sep">→</span>
            <input type="date" className="dateinp" value={to || ""}
              min={from || data.range?.first} max={data.range?.last}
              onChange={e => setTo(e.target.value)} />
            <span className="pb-count">{D.activeDays} dias com uso · {D.spanDays} no intervalo</span>
            <div className="pb-presets">
              {[["7d", "7"], ["30d", "30"], ["90d", "90"], ["Mês", "mtd"], ["Tudo", "all"]].map(([lbl, k]) => (
                <button key={k} className="chipbtn" onClick={() => setPreset(k)}>{lbl}</button>
              ))}
            </div>
          </div>

          <Hero D={D} brl={brl} usdF={usdF} seats={seats} setSeats={setSeats} />

          <PlanCard D={D} brl={brl} brl2={brl2} usdF={usdF} seats={seats} setSeats={setSeats}
            seatPrice={seatPrice} setSeatPrice={setSeatPrice} />

          <Models data={view} brl={brl} tok={tok} int={int} equivTotal={D.equiv} />

          <DailyChart data={view} brl={brl} theme={theme} from={D.range.first} to={D.range.last} />

          <Users data={view} D={D} brl={brl} brl2={brl2} tok={tok} int={int} seatPrice={seatPrice} />

          <footer>
            Fonte: {source === "csv" ? "CSV de Analytics do claude.ai (grupo)" : "logs locais desta máquina (amostra)"}.
            {" "}“Valor-equivalente” = custo dos tokens nos preços de API (US$), convertido a R$ pelo câmbio do topo.
            {" "}No plano Team o billing é por assento (flat) + eventual overage; ajuste assentos e preço no card de plano.
            {" "}Dados processados localmente no navegador.
          </footer>
        </>
      )}

      </>)}
    </div>
  );
}

function Chips({ D, source, data, int, tok, dfmt }) {
  const chips = [];
  if (D.range) chips.push(["período", `${dfmt(D.range.first)} – ${dfmt(D.range.last)}`]);
  chips.push(["dias corridos", int(D.spanDays)]);
  chips.push(["ativos", int(D.activeDays)]);
  chips.push(["usuários", int(Object.keys(data.byUser).length)]);
  chips.push(["tokens", tok(D.t.totalTok)]);
  return (
    <div className="meta-chips">
      <span className={"chip src"}>{source === "csv" ? "fonte: CSV do grupo" : "fonte: amostra local"}</span>
      {chips.map(([l, v], i) => <span className="chip" key={i}>{l} <b>{v}</b></span>)}
    </div>
  );
}

function Hero({ D, brl, usdF, seats }) {
  const good = D.roi >= 1;
  return (
    <div className="hero">
      <div className="k-primary">
        <div className="k-label"><span className="sw" style={{ background: "var(--accent)" }} />Valor-equivalente consumido</div>
        <div className="k-big">{brl(D.equiv)}</div>
        <div className="k-usd">{usdF(D.equiv)} · ≈ {brl(D.equiv / D.months)}/mês</div>
      </div>
      <div>
        <div className="k-label">{D.csvCost != null ? "Custo real (CSV)" : "Custo do plano no período"}</div>
        <div className="k-big sm">{brl(D.csvCost != null ? D.csvCost : D.planPeriod)}</div>
        <div className="k-note">{D.csvCost != null ? "gasto reportado no CSV" : `${seats} assento(s)`}</div>
      </div>
      <div>
        <div className="k-label">ROI vs plano</div>
        <div className="k-big sm" style={{ color: good ? "var(--value)" : "var(--idle)" }}>{D.roi.toFixed(1)}×</div>
        <div className="k-note">{good ? "plano se paga com folga" : "plano subaproveitado"}</div>
      </div>
      <div>
        <div className="k-label">Dias úteis ociosos</div>
        <div className="k-big sm" style={{ color: "var(--idle)" }}>{D.idleDays}</div>
        <div className="k-note">de {D.weekdays} dias úteis (seg–sex) sem nenhuma sessão</div>
      </div>
    </div>
  );
}

function PlanCard({ D, brl, brl2, usdF, seats, setSeats, seatPrice, setSeatPrice }) {
  const presets = [["Pro", 20], ["Team Std", 30], ["Team Premium", 150], ["Max 5×", 100], ["Max 20×", 200]];
  const dayCost = (seats * seatPrice) / 30.44;
  const idleCost = dayCost * D.idleDays;
  const good = D.roi >= 1;
  return (
    <section>
      <div className="sec-head"><span className="n">01</span><h2>Plano & ROI</h2>
        <span className="hint">ajuste assentos e preço do assento</span></div>
      <div className="card">
        <div className="plans">
          {presets.map(([n, p]) => (
            <div key={n} className={"plan" + (seatPrice === p ? " on" : "")} onClick={() => setSeatPrice(p)}>
              <div className="pn">{n}</div>
              <div className="pp">{usdF(p)}<small> /assento·mês</small></div>
              <div className="pd">= {brl(p)}/assento·mês</div>
            </div>
          ))}
        </div>
        <div className="seats">
          <span>Assentos no PSA:</span>
          <input className="num" type="number" min="1" value={seats} onChange={e => setSeats(Math.max(1, parseInt(e.target.value) || 1))} />
          <span>× preço/assento:</span>
          <input className="num" type="number" value={seatPrice} onChange={e => setSeatPrice(parseFloat(e.target.value) || 0)} />
          <span>US$/mês → total <b>{brl(seats * seatPrice)}/mês</b> ({usdF(seats * seatPrice)})</span>
        </div>
        <div className="verdict" style={{ background: good ? "var(--value-soft)" : "var(--idle-soft)", borderColor: good ? "color-mix(in srgb,var(--value) 35%,transparent)" : "color-mix(in srgb,var(--idle) 40%,transparent)" }}>
          <div className="big" style={{ color: good ? "var(--value)" : "var(--idle)" }}>ROI {D.roi.toFixed(1)}× — {good ? "o plano se paga com folga" : "plano subaproveitado"}</div>
          <div className="txt">Plano custaria <span className="num">{brl(D.planPeriod)}</span> no período de {D.spanDays} dias, contra <span className="num">{brl(D.equiv)}</span> de valor-equivalente consumido. Custo diário do plano ≈ <span className="num">{brl2(dayCost)}</span>; nos <b>{D.idleDays} dias úteis ociosos</b> (seg–sex sem uso) isso vira <span className="num">{brl2(idleCost)}</span> pagos à toa.</div>
        </div>
      </div>
    </section>
  );
}

function Models({ data, brl, tok, int, equivTotal }) {
  const rows = Object.entries(data.byModel).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.equiv - a.equiv);
  const max = rows[0]?.equiv || 1;
  return (
    <section>
      <div className="sec-head"><span className="n">02</span><h2>Consumo por modelo</h2><span className="hint">valor-equivalente de API</span></div>
      <div className="card">
        {rows.map(r => (
          <div className="mbar-row" key={r.k}>
            <div className="mbar-name">{MODEL_LABEL[r.k] || r.k}<span>{tok(r.totalTok)} tok</span></div>
            <div className="mbar-track"><div className="mbar-fill" style={{ width: Math.max(2, r.equiv / max * 100) + "%" }} /></div>
            <div className="mbar-val"><b>{brl(r.equiv)}</b><span>{(r.equiv / equivTotal * 100).toFixed(1)}%</span></div>
          </div>
        ))}
      </div>
      <p className="fine">Preços por 1M tokens: Opus <code>US$5/25</code> · Sonnet <code>US$3/15</code> · Haiku <code>US$1/5</code> · Fable <code>US$10/50</code>. Cache: leitura 0,1× / escrita 1,25× da entrada.</p>
    </section>
  );
}

function DailyChart({ data, brl, theme, from, to }) {
  const cvRef = useRef(null);
  const days = useMemo(() => {
    const keys = Object.keys(data.byDay).sort();
    if (!keys.length && !(from && to)) return [];
    const firstKey = from || keys[0];
    const lastKey = to || keys[keys.length - 1];
    const first = new Date(firstKey + "T00:00:00");
    const last = new Date(lastKey + "T00:00:00");
    const span = Math.round((last - first) / 86400000) + 1;
    const out = [];
    for (let i = 0; i < span; i++) {
      const dt = new Date(first); dt.setDate(dt.getDate() + i);
      const key = dt.toISOString().slice(0, 10);
      const d = data.byDay[key];
      out.push({ key, val: d ? (d.hasCsvCost ? d.csvCost : d.equiv) : 0, active: !!d });
    }
    return out;
  }, [data, from, to]);
  const maxDay = Math.max(...days.map(d => d.val), 1);

  useEffect(() => {
    const cv = cvRef.current; if (!cv || !days.length) return;
    const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 210;
      cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
      const padB = 26, padT = 10, padL = 4, padR = 4, plotH = H - padB - padT, plotW = W - padL - padR;
      const n = days.length, gap = n > 120 ? 1 : 2, bw = Math.max(1.5, (plotW - (n - 1) * gap) / n);
      const accent = css("--accent"), idle = css("--idle"), line = css("--line"), faint = css("--ink-faint");
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT + plotH + .5); ctx.lineTo(W - padR, padT + plotH + .5); ctx.stroke();
      days.forEach((d, i) => {
        const x = padL + i * (bw + gap);
        if (d.active) { const h = Math.max(2, d.val / maxDay * plotH); ctx.fillStyle = accent; ctx.fillRect(x, padT + plotH - h, bw, h); }
        else { ctx.fillStyle = idle; ctx.fillRect(x, padT + plotH - 3, bw, 3); }
      });
      ctx.fillStyle = faint; ctx.font = "11px ui-monospace,monospace"; ctx.textAlign = "center";
      const seen = {};
      days.forEach((d, i) => {
        const mo = d.key.slice(0, 7);
        if (!seen[mo]) { seen[mo] = 1; const x = padL + i * (bw + gap);
          const lb = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+d.key.slice(5, 7) - 1];
          ctx.fillText(lb, x + bw / 2, H - 8); }
      });
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [days, maxDay, theme]);

  const active = days.filter(d => d.active).length, idle = days.length - active;
  return (
    <section>
      <div className="sec-head"><span className="n">03</span><h2>Uso e ociosidade por dia</h2>
        <span className="hint">{active} dias com uso · {idle} ociosos · pico {brl(maxDay)}</span></div>
      <div className="card">
        <canvas id="dailyChart" ref={cvRef} />
        <div className="legend">
          <span><span className="sw" style={{ background: "var(--accent)" }} />valor consumido no dia</span>
          <span><span className="sw" style={{ background: "var(--idle)" }} />dia ocioso (plano pago, sem uso)</span>
        </div>
      </div>
    </section>
  );
}

function Users({ data, D, brl, brl2, tok, int, seatPrice }) {
  const rows = Object.entries(data.byUser).map(([u, v]) => {
    const active = data.activeDaysByUser[u] || 0;
    const activeSet = new Set(data.activeDaySetByUser?.[u] || []);
    const { idle } = weekdayIdle(D.range.first, D.range.last, activeSet);
    const perDay = active > 0 ? v.equiv / active : 0;
    const planPeriodUser = seatPrice * D.months;
    const roi = planPeriodUser > 0 ? v.equiv / planPeriodUser : 0;
    const idleCost = (seatPrice / 30.44) * idle;
    return { u, v, active, idle, perDay, roi, idleCost };
  }).sort((a, b) => b.v.equiv - a.v.equiv);

  return (
    <section>
      <div className="sec-head"><span className="n">04</span><h2>Por usuário — gasto e ociosidade</h2>
        <span className="hint">{rows.length} conta(s)</span></div>
      <div className="tbl-scroll">
        <table>
          <thead><tr>
            <th>Usuário</th><th className="num">Tokens</th><th className="num">Valor-equiv.</th>
            {data.hasCsvCost && <th className="num">Custo CSV</th>}
            <th className="num">Dias ativos</th><th className="num">Uso médio/dia</th>
            <th className="num">Dias úteis ociosos</th><th className="num">R$ pago s/ uso</th><th className="num">ROI/assento</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.u}>
                <td>{r.u}</td>
                <td className="num">{tok(r.v.totalTok)}</td>
                <td className="num">{brl(r.v.equiv)}</td>
                {data.hasCsvCost && <td className="num">{brl(r.v.csvCost)}</td>}
                <td className="num">{r.active}</td>
                <td className="num">{brl(r.perDay)}</td>
                <td className="num" style={{ color: "var(--idle)" }}>{r.idle}</td>
                <td className="num">{brl2(r.idleCost)}</td>
                <td className={"num " + (r.roi >= 1 ? "pos" : "neg")}>{r.roi.toFixed(1)}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine"><b>ROI/assento</b> = valor-equivalente do usuário ÷ (preço do assento × meses). <b>Dias úteis ociosos</b> = dias de semana (seg–sex) no período sem nenhuma sessão daquele usuário; <b>R$ pago s/ uso</b> = custo diário do assento × esses dias.</p>
    </section>
  );
}

// snapshot HubSpot (17/07/2026) — números crescem; re-consultar pra atualizar
const DOSSIE = {
  atualizadoEm: "17/07/2026",
  volume: 7809,
  impactados: 5296,
  jaClientesComDeal: 809,
  novosNeg: 10,
  novosNegJul: 5,
  valorNovosNeg: 127063,
  custoUnitDefault: 5,
};

const HS_PORTAL = "49656171";
const hsContact = (id) => `https://app.hubspot.com/contacts/${HS_PORTAL}/record/0-1/${id}`;
const hsContactsList = `https://app.hubspot.com/contacts/${HS_PORTAL}/objects/0-1/views/all/list`;
// negócios reais gerados pós-dossiê (contato no HubSpot · valor · data de fechamento)
const DOSSIE_DEALS = [
  { id: "221361431078", nome: "Julia Maluf", valor: 34200, data: "03/06" },
  { id: "174160510107", nome: "Aline Sulzbach", valor: 20500, data: "16/07" },
  { id: "119727998015", nome: "Lilian Grunwald", valor: 15500, data: "14/07" },
  { id: "225601779041", nome: "Flora Nicoteiro", valor: 11800, data: "16/07" },
  { id: "166322700721", nome: "Ernany S. de Almeida", valor: 10200, data: "05/07" },
  { id: "140227176343", nome: "Luciano Potter", valor: 9400, data: "18/06" },
  { id: "128556642448", nome: "Edilaine Ferreira", valor: 9000, data: "10/06" },
  { id: "122011475377", nome: "Tchelci A. Leipnitz", valor: 6063, data: "03/06" },
  { id: "119731405679", nome: "Leticia", valor: 5400, data: "15/07" },
  { id: "206967442817", nome: "Isabela V. de Andrade", valor: 5000, data: "17/06" },
];

// catálogo de ações de IA do PSA (custo unitário editável; seed com o que já sabemos)
const AI_SEED = [
  { nome: "Hunter Dossiê", faz: "Gera dossiê por contato (perfil + mapa de decisores)", vol: 7809, unit: 5, res: "R$127k em novos negócios (10 deals)" },
  { nome: "Disparo WhatsApp IA", faz: "Mensagens automáticas (boas-vindas / curadoria) via n8n", vol: 0, unit: 0, res: "" },
  { nome: "Curadoria Pocket Lead", faz: "Qualificação/curadoria de leads (n8n + IA)", vol: 0, unit: 0, res: "" },
  { nome: "Painéis (Claude Code)", faz: "Dashboards internos: TBS, UTM, Growth, Creative, Custos…", vol: 0, unit: 0, res: "rodam dentro da cota dos assentos" },
];

// benchmark PSA × mercado (fontes públicas 2026: Copilot/Claude Code/Cursor)
const BENCH = [
  { m: "Ativação de assentos", psa: "79% na semana · 88% em 30d", mkt: "~51% dos devs usam IA todo dia; ~81% ativam a licença no 1º dia", tom: "pos", nota: "acima da média" },
  { m: "Custo por assento / mês", psa: "~R$212 (~US$40) · overage R$0", mkt: "inline (Copilot/Cursor) US$20–60; agêntico (Claude Code por API) US$200–2.000+", tom: "pos", nota: "a assinatura evita o estouro de tokens do modelo agêntico" },
  { m: "Aceite de código", psa: "99,8% (linhas aceitas, modo agêntico)", mkt: "autocomplete 27–30%; Claude Code ~44%", tom: "neutral", nota: "⚠️ métricas diferentes — não comparar direto" },
  { m: "Tempo economizado / usuário", psa: "~2h/semana (52h/mês ÷ 26 ativos)", mkt: "3–5h/semana (mediana Claude Code)", tom: "idle", nota: "na faixa baixa — nossa medição é conservadora (só saídas verificadas)" },
  { m: "Ações por prompt (agêntico)", psa: "4,1", mkt: "sem padrão de mercado; >3 indica delegação agêntica madura", tom: "pos", nota: "uso agêntico maduro" },
  { m: "Adoção de IA no time", psa: "88% com atividade (30d); 52% usam Claude Code", mkt: "84% dos devs usam ou planejam usar IA; ~51% do código no GitHub é assistido por IA", tom: "pos", nota: "em linha / acima" },
];

function Benchmark() {
  const badge = (tom) => tom === "pos" ? { t: "Acima / bom", c: "var(--value)", b: "var(--value-soft)" }
    : tom === "idle" ? { t: "Abaixo / atenção", c: "var(--idle)", b: "var(--idle-soft)" }
    : { t: "Não comparável", c: "var(--ink-soft)", b: "var(--surface-2)" };
  return (
    <div>
      <div className="banner idle"><span className="ic">i</span>
        <div><b>Como o PSA se compara ao mercado (2026).</b> Números do PSA vêm do claude.ai/analytics + faturamento; as referências vêm de estudos públicos de assistentes de IA (GitHub Copilot, Claude Code, Cursor). Use como ordem de grandeza — metodologias variam entre fontes.</div>
      </div>
      <section style={{ marginTop: 8 }}>
        <div className="sec-head"><span className="n">◆</span><h2>PSA × mercado</h2><span className="hint">usabilidade e custo de tokens/IA</span></div>
        <div className="tbl-scroll">
          <table>
            <thead><tr><th>Métrica</th><th>PSA (real)</th><th>Referência de mercado</th><th>Leitura</th></tr></thead>
            <tbody>
              {BENCH.map((r, i) => { const bd = badge(r.tom); return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.m}</td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{r.psa}</td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 12.5, maxWidth: 320 }}>{r.mkt}</td>
                  <td><span style={{ display: "inline-block", fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: bd.c, background: bd.b, whiteSpace: "nowrap" }}>{bd.t}</span><div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4, maxWidth: 220 }}>{r.nota}</div></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="sec-head"><span className="n">▸</span><h2>Leitura executiva</h2></div>
        <div className="card"><div className="doc">
          <ul>
            <li><b>Custo:</b> por estar em <b>assinatura</b> (não API por token), o PSA paga ~US$40/assento — quando o uso agêntico no mercado por API vai de <b>US$200 a US$2.000+</b>/dev. É a maior vantagem de custo.</li>
            <li><b>Ativação e adoção acima da média</b> (79–88% vs ~51% de uso diário no mercado) — o time realmente usa.</li>
            <li><b>Cuidado com a "taxa de aceite" de 99,8%:</b> ela mede linhas aceitas no modo agêntico do Claude Code, <b>não</b> é a "suggestion accept rate" de autocomplete (27–30% no mercado). Não use esse número em comparação direta.</li>
            <li><b>Tempo economizado</b> aparece baixo (~2h/sem) porque é a medição conservadora da Anthropic (só saídas verificadas); o real tende a ser maior.</li>
          </ul>
          <p className="fine">Fontes (2026): benchmarks públicos de adoção/uso de assistentes de IA — GitHub Copilot (~27–30% aceite; US$20–60/mês), Claude Code (uso agêntico US$200–2.000+/dev, ~3–5h/sem economizadas, ~44% aceite), e estudos de adoção (84% dos devs usam IA; ~51% do código assistido). Ordens de grandeza; metodologias variam.</p>
        </div></div>
      </section>
    </div>
  );
}

function AICosts() {
  const rBR = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const [rows, setRows] = useState(AI_SEED);
  const upd = (i, campo, val) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [campo]: campo === "nome" || campo === "faz" || campo === "res" ? val : (parseFloat(val) || 0) } : r));
  const addRow = () => setRows(rs => [...rs, { nome: "Nova ação de IA", faz: "", vol: 0, unit: 0, res: "" }]);
  const totalMensal = rows.reduce((s, r) => s + r.vol * r.unit, 0);

  return (
    <div>
      <div className="banner idle"><span className="ic">i</span>
        <div><b>Catálogo de ações de IA do PSA.</b> O que já rodamos por IA e o custo de cada ação. <b>Custo unitário é editável</b> — preencha com o real (tokens do fluxo + Apify + outras APIs). Ações que rodam <b>nos assentos do Team</b> têm custo marginal de tokens ~R$0 (overage é R$0); o custo real vem de <b>APIs externas</b> (Apify) e <b>chaves de API próprias</b>.</div>
      </div>

      <div className="hero" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 8 }}>
        <div className="k-primary"><div className="k-label"><span className="sw" style={{ background: "var(--accent)" }} />Custo total das ações de IA</div><div className="k-big">{rBR(totalMensal)}</div><div className="k-usd">soma de volume × custo unitário</div></div>
        <div><div className="k-label">Ações catalogadas</div><div className="k-big sm">{rows.length}</div><div className="k-note">edite/adicione as suas</div></div>
        <div><div className="k-label">Assinatura (contexto)</div><div className="k-big sm">{rBR(GRUPO.custoMes)}</div><div className="k-note">/mês · Claude Code+Chat inclusos</div></div>
      </div>

      <section>
        <div className="sec-head"><span className="n">◆</span><h2>O que já fizemos por IA — e o custo de cada ação</h2><span className="hint">clique nos campos pra editar</span></div>
        <div className="tbl-scroll">
          <table>
            <thead><tr>
              <th>IA / Ação</th><th>O que faz</th><th className="num">Volume feito</th>
              <th className="num">Custo unit. (R$)</th><th className="num">Custo total</th><th>Resultado</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><span contentEditable suppressContentEditableWarning onBlur={e => upd(i, "nome", e.target.textContent.trim())} style={{ fontWeight: 600, borderBottom: "1px dashed var(--line)" }}>{r.nome}</span></td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 12.5, maxWidth: 260 }}><span contentEditable suppressContentEditableWarning onBlur={e => upd(i, "faz", e.target.textContent.trim())}>{r.faz}</span></td>
                  <td className="num"><input type="number" value={r.vol} onChange={e => upd(i, "vol", e.target.value)} style={{ width: 78, textAlign: "right", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 6, padding: "3px 7px", fontFamily: "var(--mono)" }} /></td>
                  <td className="num"><input type="number" value={r.unit} onChange={e => upd(i, "unit", e.target.value)} style={{ width: 70, textAlign: "right", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 6, padding: "3px 7px", fontFamily: "var(--mono)" }} /></td>
                  <td className="num"><b>{rBR(r.vol * r.unit)}</b></td>
                  <td style={{ color: "var(--value)", fontSize: 12.5 }}><span contentEditable suppressContentEditableWarning onBlur={e => upd(i, "res", e.target.textContent.trim())}>{r.res}</span></td>
                </tr>
              ))}
              <tr style={{ background: "var(--surface-2)" }}>
                <td colSpan={4} style={{ fontWeight: 600 }}>Total</td>
                <td className="num" style={{ fontWeight: 700 }}>{rBR(totalMensal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="addrow"><button className="addbtn" onClick={addRow}>+ adicionar ação de IA</button>
          <span className="fine" style={{ margin: 0 }}>Volume = quantas vezes a ação rodou; custo unit. = tokens + APIs por execução. Custo total = volume × unit.</span>
        </div>
        <p className="fine">Só o <b>Hunter Dossiê</b> tem custo estimado (R$5/dossiê, a validar com tokens reais do fluxo do Renato + Apify). As demais entram com custo a preencher. Ações puramente dentro do Claude Code/Chat dos assentos não geram cobrança extra (overage R$0) — o "custo" delas é a fatia da assinatura, medida na aba <b>Right-sizing</b>.</p>
      </section>
    </div>
  );
}

function Initiatives() {
  const [custoUnit, setCustoUnit] = useState(DOSSIE.custoUnitDefault);
  const rBR = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const pctV = (n) => (n / DOSSIE.volume * 100).toFixed(0) + "%";
  const naoImpact = DOSSIE.volume - DOSSIE.impactados;
  const custoTotal = custoUnit * DOSSIE.volume;
  const roi = custoTotal > 0 ? DOSSIE.valorNovosNeg / custoTotal : 0;
  const custoPorNovoNeg = DOSSIE.novosNeg > 0 ? custoTotal / DOSSIE.novosNeg : 0;
  const funnel = [
    ["Tem dossiê", DOSSIE.volume, "var(--accent)"],
    ["Impactados (contato logado)", DOSSIE.impactados, "var(--accent)"],
    ["Novo negócio pós-dossiê (desde jun)", DOSSIE.novosNeg, "var(--value)"],
  ];
  const max = DOSSIE.volume;
  return (
    <div>
      <div className="banner idle"><span className="ic">i</span>
        <div><b>Snapshot do HubSpot em {DOSSIE.atualizadoEm}.</b> Os números crescem (base viva) — dá pra automatizar a atualização depois. O <b>custo unitário é estimativa</b> (R$5); troca-se pelo real assim que plugarmos tokens do fluxo Hunter + Apify.</div>
      </div>

      <section style={{ marginTop: 8 }}>
        <div className="sec-head"><span className="n">◆</span><h2>Hunter Dossiê — economia unitária</h2>
          <span className="hint">custo × novo negócio gerado</span></div>
        <div className="hero" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
          <div className="k-primary">
            <div className="k-label"><span className="sw" style={{ background: "var(--accent)" }} />Custo estimado da iniciativa</div>
            <div className="k-big">{rBR(custoTotal)}</div>
            <div className="k-usd">{rBR(custoUnit)}/dossiê × {DOSSIE.volume.toLocaleString("pt-BR")}</div>
          </div>
          <div>
            <div className="k-label">Novo negócio gerado</div>
            <div className="k-big sm" style={{ color: "var(--value)" }}>{rBR(DOSSIE.valorNovosNeg)}</div>
            <div className="k-note">{DOSSIE.novosNeg} negócios fechados desde jun</div>
          </div>
          <div>
            <div className="k-label">ROI da iniciativa</div>
            <div className="k-big sm" style={{ color: roi >= 1 ? "var(--value)" : "var(--idle)" }}>{roi.toFixed(1)}×</div>
            <div className="k-note">novo negócio ÷ custo</div>
          </div>
          <div>
            <div className="k-label">Custo por novo negócio</div>
            <div className="k-big sm">{rBR(custoPorNovoNeg)}</div>
            <div className="k-note">custo total ÷ {DOSSIE.novosNeg}</div>
          </div>
        </div>
        <div className="periodbar" style={{ marginTop: 16 }}>
          <span className="pb-label">Custo por dossiê (R$)</span>
          <input type="number" className="dateinp" style={{ width: 90 }} value={custoUnit}
            onChange={e => setCustoUnit(parseFloat(e.target.value) || 0)} />
          <span className="pb-count">tokens do fluxo Hunter + Apify + outras APIs — edite quando tiver o número real</span>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">▸</span><h2>Funil de impacto</h2>
          <span className="hint">quem tem → quem foi tocado → quem converteu</span></div>
        <div className="kpigrid">
          <div className="kpi"><div className="kpi-l">Tem dossiê</div><div className="kpi-v">{DOSSIE.volume.toLocaleString("pt-BR")}</div><div className="kpi-d">base da iniciativa</div></div>
          <div className="kpi"><div className="kpi-l">Impactados</div><div className="kpi-v">{DOSSIE.impactados.toLocaleString("pt-BR")}</div><div className="kpi-d">{pctV(DOSSIE.impactados)} · contato logado</div></div>
          <div className="kpi"><div className="kpi-l">Ainda não impactados</div><div className="kpi-v" style={{ color: "var(--idle)" }}>{naoImpact.toLocaleString("pt-BR")}</div><div className="kpi-d">{pctV(naoImpact)} · lista de abordagem</div></div>
          <div className="kpi"><div className="kpi-l">Já eram clientes c/ deal</div><div className="kpi-v">{DOSSIE.jaClientesComDeal.toLocaleString("pt-BR")}</div><div className="kpi-d">{pctV(DOSSIE.jaClientesComDeal)} · base existente</div></div>
          <div className="kpi"><div className="kpi-l">Novo negócio (desde jun)</div><div className="kpi-v" style={{ color: "var(--value)" }}>{DOSSIE.novosNeg}</div><div className="kpi-d">{rBR(DOSSIE.valorNovosNeg)} gerado</div></div>
          <div className="kpi"><div className="kpi-l">Novo negócio (desde jul)</div><div className="kpi-v" style={{ color: "var(--value)" }}>{DOSSIE.novosNegJul}</div><div className="kpi-d">conversão incipiente (~2 sem)</div></div>
        </div>
        <p className="fine"><b>Definições:</b> impactado = tem contato logado (call/WhatsApp/e-mail); novo negócio = deal ganho com <code>recent_deal_close_date</code> após o início da iniciativa. <b>Atenção:</b> correlação temporal, não prova de causa — o dossiê pode não ser o único motivo da venda.</p>
      </section>

      <section>
        <div className="sec-head"><span className="n">↗</span><h2>Negócios gerados — clique para abrir no HubSpot</h2>
          <span className="hint">10 negócios · {rBR(DOSSIE.valorNovosNeg)}</span></div>
        <div className="tbl-scroll">
          <table>
            <thead><tr><th>Contato</th><th className="num">Valor</th><th className="num">Fechado em</th><th></th></tr></thead>
            <tbody>
              {DOSSIE_DEALS.map(d => (
                <tr key={d.id}>
                  <td><a href={hsContact(d.id)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>{d.nome}</a></td>
                  <td className="num">{rBR(d.valor)}</td>
                  <td className="num">{d.data}</td>
                  <td className="num"><a href={hsContact(d.id)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-soft)", textDecoration: "none", fontFamily: "var(--mono)", fontSize: 12 }}>abrir ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">Clicar abre o registro do contato no HubSpot (portal PSA). Os "leads" dos segmentos do funil (impactados, não impactados etc.) são milhares — dá pra transformar cada segmento numa <b>Lista do HubSpot</b> clicável; veja a nota abaixo.</p>
      </section>

      <section>
        <div className="sec-head"><span className="n">?</span><h2>Pendente pra virar 100% real</h2></div>
        <div className="card"><div className="doc">
          <ul>
            <li><b>Custo real por dossiê</b> — hoje é estimativa (R$5). Precisa dos <b>tokens do fluxo Hunter</b> (qual conta/chave roda o n8n do Renato?) + <b>custo Apify</b> (compute units por dossiê).</li>
            <li><b>Atualização automática</b> — este é um snapshot. Pra atualizar sozinho, dá pra ligar uma integração com o HubSpot (token de private-app + rota no servidor).</li>
            <li><b>Atribuição</b> — refinar "novo negócio" pra deal ganho estritamente após a data do dossiê de cada contato (hoje uso corte único da iniciativa).</li>
          </ul>
        </div></div>
      </section>
    </div>
  );
}

// dados reais claude.ai/analytics → Todos os membros (30d, jul/2026): chat = conversas, cod = sessões de código
const SEAT_SEED = [
  { nome: "mateus.mariano", nivel: "standard", chat: 152, cod: 0 },
  { nome: "bruna.eckhardt", nivel: "standard", chat: 80, cod: 0 },
  { nome: "leandro.bengochea", nivel: "standard", chat: 80, cod: 72 },
  { nome: "giovana.fontoura", nivel: "standard", chat: 65, cod: 53 },
  { nome: "dp (Shay)", nivel: "standard", chat: 48, cod: 0 },
  { nome: "leonardo.moreira", nivel: "standard", chat: 46, cod: 132 },
  { nome: "leonardo.kirsch", nivel: "standard", chat: 44, cod: 0 },
  { nome: "gustavo.fontanella", nivel: "standard", chat: 40, cod: 51 },
  { nome: "tercio.silva", nivel: "standard", chat: 38, cod: 3 },
  { nome: "eduardo.vince", nivel: "standard", chat: 36, cod: 0 },
  { nome: "camila.loss", nivel: "standard", chat: 32, cod: 0 },
  { nome: "roberto.santos", nivel: "premium", chat: 30, cod: 25 },
  { nome: "crm.psa (Arthur)", nivel: "premium", chat: 29, cod: 311 },
  { nome: "joao.marins", nivel: "standard", chat: 28, cod: 0 },
  { nome: "katyeli.madril", nivel: "standard", chat: 17, cod: 0 },
  { nome: "bernardo.haab", nivel: "standard", chat: 14, cod: 144 },
  { nome: "bruna.simoni", nivel: "standard", chat: 14, cod: 0 },
  { nome: "marcio.spagnolo", nivel: "standard", chat: 13, cod: 0 },
  { nome: "eduardo.freitas", nivel: "standard", chat: 11, cod: 0 },
  { nome: "eduardo.tavares", nivel: "standard", chat: 9, cod: 0 },
  { nome: "nicollas.lenuzza", nivel: "standard", chat: 7, cod: 0 },
  { nome: "mayda.quadros", nivel: "standard", chat: 5, cod: 0 },
  { nome: "renato.denck", nivel: "standard", chat: 4, cod: 186 },
  { nome: "priscila.beckel", nivel: "standard", chat: 4, cod: 0 },
  { nome: "cesar.filho", nivel: "standard", chat: 4, cod: 6 },
  { nome: "ti (PSA)", nivel: "standard", chat: 1, cod: 43 },
  { nome: "yaskara.concato", nivel: "standard", chat: 1, cod: 0 },
  { nome: "bruno.stersa", nivel: "standard", chat: 1, cod: 61 },
];

function RightSizing({ brl, fx }) {
  const [precoStd, setPrecoStd] = useState(30);
  const [precoPrem, setPrecoPrem] = useState(150);
  const [membros, setMembros] = useState(SEAT_SEED);
  const preco = (n) => (n === "premium" ? precoPrem : n === "standard" ? precoStd : 0);

  function recomendar(m) {
    const chat = parseFloat(m.chat) || 0, cod = parseFloat(m.cod) || 0;
    if (m.nivel === "remover") return { txt: "Vago / removido", cls: "neg", novo: "remover" };
    if (chat + cod <= 2) return { txt: "Revisar — quase sem uso", cls: "neg", novo: m.nivel };
    if (m.nivel === "premium" && cod < 20) return { txt: "Downgrade → Standard", cls: "pos", novo: "standard" };
    if (m.nivel === "standard" && cod >= 120) return { txt: "Avaliar Premium (uso pesado de código)", cls: "idle", novo: "premium" };
    return { txt: "Manter", cls: "", novo: m.nivel };
  }

  const rows = membros.map((m, i) => ({ ...m, i, rec: recomendar(m) }));
  const custoAtual = rows.reduce((s, r) => s + preco(r.nivel), 0);
  const custoOtim = rows.reduce((s, r) => s + preco(r.rec.novo), 0);
  const economia = custoAtual - custoOtim;

  const upd = (i, campo, val) => setMembros(ms => ms.map((m, j) => j === i ? { ...m, [campo]: val } : m));
  const addRow = () => setMembros(ms => [...ms, { nome: "novo@psa", nivel: "standard", chat: 0, cod: 0 }]);

  return (
    <div>
      <div className="banner idle"><span className="ic">i</span>
        <div><b>Todos os membros (claude.ai → Análise, 30d, jul/2026):</b> Chat = conversas, Código = sessões do Claude Code. <b>29 membros com atividade</b> dos 33 assentos → ~4 totalmente ociosos. Recomenda manter/upgrade/downgrade/revisar + a economia.</div>
      </div>

      <div className="hero" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 8 }}>
        <div><div className="k-label">Custo atual/mês</div><div className="k-big sm">{brl(custoAtual)}</div><div className="k-note">{rows.length} assentos lançados</div></div>
        <div><div className="k-label">Custo otimizado/mês</div><div className="k-big sm" style={{ color: "var(--value)" }}>{brl(custoOtim)}</div><div className="k-note">seguindo as recomendações</div></div>
        <div><div className="k-label">Economia/mês</div><div className="k-big sm" style={{ color: economia > 0 ? "var(--value)" : "var(--ink-soft)" }}>{brl(economia)}</div><div className="k-note">{brl(economia * 12)}/ano</div></div>
      </div>

      <div className="periodbar" style={{ marginTop: 16 }}>
        <span className="pb-label">Preço assento (US$/mês)</span>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Standard</span>
        <input type="number" className="dateinp" style={{ width: 70 }} value={precoStd} onChange={e => setPrecoStd(parseFloat(e.target.value) || 0)} />
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Premium</span>
        <input type="number" className="dateinp" style={{ width: 70 }} value={precoPrem} onChange={e => setPrecoPrem(parseFloat(e.target.value) || 0)} />
        <span className="pb-count">confira os valores reais no Faturamento e ajuste</span>
      </div>

      <section style={{ marginTop: 20 }}>
        <div className="sec-head"><span className="n">▸</span><h2>Assentos</h2><span className="hint">lance o % de uso semanal de cada um</span></div>
        <div className="tbl-scroll">
          <table>
            <thead><tr>
              <th>Pessoa</th><th>Nível atual</th><th className="num">Custo/mês</th>
              <th className="num">Chat (30d)</th><th className="num">Código (sessões)</th><th>Recomendação</th><th className="num">Δ/mês</th>
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const delta = preco(r.nivel) - preco(r.rec.novo);
                return (
                  <tr key={r.i}>
                    <td><span contentEditable suppressContentEditableWarning onBlur={e => upd(r.i, "nome", e.target.textContent.trim())} style={{ borderBottom: "1px dashed var(--line)" }}>{r.nome}</span></td>
                    <td>
                      <select value={r.nivel} onChange={e => upd(r.i, "nivel", e.target.value)} style={{ border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 6, padding: "4px 8px", fontFamily: "var(--mono)", fontSize: 12.5 }}>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="remover">(vago)</option>
                      </select>
                    </td>
                    <td className="num">{brl(preco(r.nivel))}</td>
                    <td className="num"><input type="number" value={r.chat} placeholder="—" onChange={e => upd(r.i, "chat", e.target.value)} style={{ width: 64, textAlign: "right", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 6, padding: "3px 7px", fontFamily: "var(--mono)" }} /></td>
                    <td className="num"><input type="number" value={r.cod} placeholder="—" onChange={e => upd(r.i, "cod", e.target.value)} style={{ width: 64, textAlign: "right", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)", borderRadius: 6, padding: "3px 7px", fontFamily: "var(--mono)" }} /></td>
                    <td className={r.rec.cls}>{r.rec.txt}</td>
                    <td className={"num " + (delta > 0 ? "pos" : delta < 0 ? "idle" : "")}>{delta === 0 ? "—" : (delta > 0 ? "−" : "+") + brl(Math.abs(delta)).replace("R$ ", "R$")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="addrow"><button className="addbtn" onClick={addRow}>+ adicionar assento</button>
          <span className="fine" style={{ margin: 0 }}>Regra: chat+código ≤2 → revisar (quase sem uso) · Premium com &lt;20 sessões de código → downgrade · Standard ≥120 sessões → avaliar Premium.</span>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">!</span><h2>Onde está a economia de verdade</h2></div>
        <div className="card"><div className="doc">
          <p>Agora com <b>todos os 29 membros ativos</b>, três leituras acionáveis:</p>
          <ul>
            <li><b>Standard usando código pesado</b> (candidatos a Premium se baterem no limite): renato.denck (186 sessões), bernardo.haab (144), leonardo.moreira (132).</li>
            <li><b>Quase sem uso</b> (revisar): yaskara.concato (1 chat). Além de <b>~4 assentos totalmente ociosos</b> (33 pagos × 29 com atividade).</li>
            <li><b>Só chat, sem código</b> (Standard está certo): mateus.mariano (152), bruna.eckhardt (80), dp/Shay (48), eduardo.vince, camila.loss, joao.marins… — justificam o assento pelo chat.</li>
            <li><b>Economia direta:</b> ~4 assentos ociosos × ~R$212 ≈ <b>R$850/mês</b>; revisar os de baixíssimo uso pode dobrar isso.</li>
          </ul>
          <p className="fine"><b>Fonte:</b> claude.ai → Análise (Visão geral + Claude Code), jul/2026. Lista completa dos 17 e export em claude.ai → Análise → Claude Code → <b>Exportar</b>. Custo total real: <b>R$ 6.997,32/mês</b> (33 licenças), overage R$0.</p>
        </div></div>
      </section>
    </div>
  );
}

// dados reais do grupo PSA (claude.ai admin + analytics, 17/07/2026)
const GRUPO = {
  atualizado: "17/07/2026",
  custoMes: 6997.32, overage: 0, licencas: 33, ativos: 29, ativosSemana: 26,
  ccUsers: 17, ccLinhas: 103777, horas: 52, conversas: 630,
  dossieVolume: 7809, dossieNegocio: 127063, dossieCustoUnit: 5,
};

function Resumo() {
  const rBR = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");
  const pct = (n) => (n * 100).toFixed(0) + "%";
  const [valorHora, setValorHora] = useState(100);
  const [horas, setHoras] = useState(GRUPO.horas);
  const [receita, setReceita] = useState(25000);

  const retornoProd = horas * valorHora;
  const retornoTotal = retornoProd + receita;
  const roi = GRUPO.custoMes > 0 ? retornoTotal / GRUPO.custoMes : 0;
  const custoAssento = GRUPO.custoMes / GRUPO.licencas;
  const ativacao = GRUPO.ativos / GRUPO.licencas;
  const ociosos = GRUPO.licencas - GRUPO.ativos;
  const economiaOciosos = ociosos * custoAssento;
  const dossieCusto = GRUPO.dossieVolume * GRUPO.dossieCustoUnit;
  const roiDossie = dossieCusto > 0 ? GRUPO.dossieNegocio / dossieCusto : 0;
  const custoPorLinha = GRUPO.custoMes / GRUPO.ccLinhas;

  const good = roi >= 1;
  return (
    <div>
      <div className="banner idle"><span className="ic">i</span>
        <div><b>Retrato consolidado do grupo PSA — {GRUPO.atualizado}.</b> Custo real do faturamento + uso real do claude.ai/analytics. O <b>retorno</b> usa premissas que você edita abaixo (valor da hora, receita atribuível). Snapshot; re-puxável sob demanda.</div>
      </div>

      {/* HERO: investimento × retorno × ROI */}
      <div className="hero" style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
        <div className="k-primary">
          <div className="k-label"><span className="sw" style={{ background: "var(--accent)" }} />ROI — retorno ÷ investimento</div>
          <div className="k-big" style={{ color: good ? "var(--value)" : "var(--idle)" }}>{pct(roi)}</div>
          <div className="k-usd">{roi.toFixed(1)}× · {good ? "retorno acima do investimento" : "ajuste as premissas de retorno"}</div>
        </div>
        <div>
          <div className="k-label">Investimento / mês</div>
          <div className="k-big sm">{rBR(GRUPO.custoMes)}</div>
          <div className="k-note">assinatura · overage {rBR(GRUPO.overage)}</div>
        </div>
        <div>
          <div className="k-label">Retorno estimado / mês</div>
          <div className="k-big sm" style={{ color: "var(--value)" }}>{rBR(retornoTotal)}</div>
          <div className="k-note">produtividade + receita atribuída</div>
        </div>
        <div>
          <div className="k-label">Economia à mão</div>
          <div className="k-big sm" style={{ color: "var(--idle)" }}>{rBR(economiaOciosos)}</div>
          <div className="k-note">{ociosos} assentos sem atividade (30d)</div>
        </div>
      </div>

      {/* premissas de retorno */}
      <div className="periodbar" style={{ marginTop: 16 }}>
        <span className="pb-label">Premissas de retorno</span>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Horas economizadas/mês</span>
        <input type="number" className="dateinp" style={{ width: 70 }} value={horas} onChange={e => setHoras(parseFloat(e.target.value) || 0)} />
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Valor da hora R$</span>
        <input type="number" className="dateinp" style={{ width: 70 }} value={valorHora} onChange={e => setValorHora(parseFloat(e.target.value) || 0)} />
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>+ Receita atribuível/mês R$</span>
        <input type="number" className="dateinp" style={{ width: 90 }} value={receita} onChange={e => setReceita(parseFloat(e.target.value) || 0)} />
      </div>

      {/* INVESTIMENTO */}
      <section>
        <div className="sec-head"><span className="n">01</span><h2>Investimento (custo real)</h2><span className="hint">o que sai do caixa</span></div>
        <div className="stat-strip">
          <div><div className="l">Assinatura/mês</div><div className="v">{rBR(GRUPO.custoMes)}</div><div className="d">Team · 33 licenças</div></div>
          <div><div className="l">Overage (tokens)</div><div className="v">{rBR(GRUPO.overage)}</div><div className="d">tudo dentro da cota</div></div>
          <div><div className="l">Custo por licença</div><div className="v">{rBR(custoAssento)}</div><div className="d">média/mês</div></div>
          <div><div className="l">Anual projetado</div><div className="v">{rBR(GRUPO.custoMes * 12)}</div><div className="d">12 × mensal</div></div>
        </div>
      </section>

      {/* USO & EFICIÊNCIA */}
      <section>
        <div className="sec-head"><span className="n">02</span><h2>Uso & eficiência</h2><span className="hint">quanto do que se paga está sendo usado</span></div>
        <div className="stat-strip">
          <div><div className="l">Ativação</div><div className="v" style={{ color: ativacao < 0.8 ? "var(--idle)" : "var(--value)" }}>{pct(ativacao)}</div><div className="d">{GRUPO.ativos} com atividade (30d) · {GRUPO.ativosSemana}/semana</div></div>
          <div><div className="l">Usuários Claude Code</div><div className="v">{GRUPO.ccUsers}</div><div className="d">de {GRUPO.licencas} licenças</div></div>
          <div><div className="l">Linhas aceitas/mês</div><div className="v">{(GRUPO.ccLinhas / 1000).toFixed(0)}k</div><div className="d">custo ~{(custoPorLinha).toFixed(3).replace(".", ",")} R$/linha</div></div>
          <div><div className="l">Horas economizadas</div><div className="v">{GRUPO.horas}h</div><div className="d">últimos 30d (estimado)</div></div>
        </div>
      </section>

      {/* RETORNO & ROI */}
      <section>
        <div className="sec-head"><span className="n">03</span><h2>Retorno & ROI</h2><span className="hint">produtividade recorrente + negócio por iniciativa</span></div>
        <div className="grid2">
          <div className="card">
            <div className="mbar-name" style={{ marginBottom: 10 }}>Produtividade (recorrente)</div>
            <div className="k-big sm" style={{ color: "var(--value)" }}>{rBR(retornoProd)}<span style={{ fontSize: 13, color: "var(--ink-faint)", fontWeight: 400 }}>/mês</span></div>
            <p className="fine">{horas}h × {rBR(valorHora)}/h. ROI de produtividade = <b style={{ color: retornoProd >= GRUPO.custoMes ? "var(--value)" : "var(--idle)" }}>{pct(retornoProd / GRUPO.custoMes)}</b> do investimento.</p>
          </div>
          <div className="card">
            <div className="mbar-name" style={{ marginBottom: 10 }}>Negócio gerado — Hunter Dossiê</div>
            <div className="k-big sm" style={{ color: "var(--value)" }}>{rBR(GRUPO.dossieNegocio)}</div>
            <p className="fine">Custo estimado da iniciativa {rBR(dossieCusto)} ({GRUPO.dossieVolume.toLocaleString("pt-BR")} × R${GRUPO.dossieCustoUnit}) → <b className="pos">ROI {roiDossie.toFixed(1)}×</b>. Correlação temporal (não prova de causa).</p>
          </div>
        </div>
        <p className="fine"><b>Calibração atual (edite no topo):</b> valor da hora R$100 (custo-hora carregado médio de time ops/growth/vendas) · 49h/mês (piso medido pela Anthropic — provavelmente subestima) · receita atribuível R$25.000/mês (≈30% do novo negócio mensal do Hunter Dossiê — R$127k desde jun ≈ R$85k/mês bruto × atribuição conservadora, já que é correlação e há outros toques). Suba/baixe conforme a realidade de vocês; o ROI do topo recalcula na hora.</p>
      </section>

      {/* OPORTUNIDADE */}
      <section>
        <div className="sec-head"><span className="n">04</span><h2>Oportunidade de economia</h2></div>
        <div className="verdict" style={{ marginTop: 0 }}>
          <div className="big">{rBR(economiaOciosos)}/mês · {rBR(economiaOciosos * 12)}/ano</div>
          <div className="txt"><b>{ociosos} das {GRUPO.licencas} licenças</b> não tiveram nenhuma atividade em 30 dias ({GRUPO.ativos} ativas). Somando quem usa pouquíssimo, dá pra recuperar mais. Detalhe por pessoa na aba <b>Right-sizing</b>.</div>
        </div>
      </section>

      <p className="fine">Fontes: claude.ai → Cobrança (R$ {GRUPO.custoMes.toLocaleString("pt-BR")}/mês) e claude.ai → Análise (uso). Iniciativa via HubSpot. Valores de retorno são premissas editáveis — ajuste-as pro seu contexto.</p>
    </div>
  );
}

function Methodology({ brl, fx }) {
  const plans = [["Pro", 20, "1 usuário, uso pessoal"], ["Team Standard", 30, "por assento; cota padrão"],
    ["Team Premium", 150, "por assento; cota alta de Claude Code"], ["Max 5×", 100, "individual, 5× o Pro"],
    ["Max 20×", 200, "individual, 20× o Pro"]];
  const tokens = [["Entrada (input)", "prompt/contexto que você envia", "Opus $5 · Sonnet $3 · Haiku $1 · Fable $10"],
    ["Saída (output)", "texto que o modelo gera — o mais caro", "Opus $25 · Sonnet $15 · Haiku $5 · Fable $50"],
    ["Leitura de cache", "contexto reaproveitado (0,1× da entrada)", "Opus $0,50 · Sonnet $0,30 · Haiku $0,10"],
    ["Escrita de cache", "gravar contexto no cache (1,25× da entrada)", "Opus $6,25 · Sonnet $3,75 · Haiku $1,25"]];
  return (
    <div className="doc">
      <section style={{ marginTop: 0 }}>
        <div className="sec-head"><span className="n">A</span><h2>As 3 formas de gastar dinheiro com o Claude</h2></div>
        <div className="card">
          <p>Todo custo do Claude cai em um de três baldes. O painel mede os três de formas diferentes — entender qual é qual evita ler "valor" como "gasto".</p>
          <ul>
            <li><b>1. Assinatura (planos)</b> — valor <b>fixo por assento/mês</b> (Pro, Team, Max). É o que realmente sai do caixa. Não depende de quanto você usa.</li>
            <li><b>2. Tokens</b> — a "moeda" de uso do modelo. Na <b>API</b> (pay-as-you-go) você paga por token de verdade; na <b>assinatura</b> os tokens estão inclusos na cota, e o painel calcula quanto eles <b>custariam</b> na API = o <b>valor-equivalente</b>.</li>
            <li><b>3. Integrações / APIs externas</b> — serviços que rodam junto com o Claude e cobram à parte: <b>Apify</b>, <b>HubSpot</b>, <b>n8n</b>, etc. Não são cobrados pela Anthropic.</li>
          </ul>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">B</span><h2>Planos (assinatura) — o que sai do caixa</h2></div>
        <div className="card">
          <p>Assinatura é <b>flat por assento</b>: você paga o mesmo todo mês, use muito ou pouco. Cada assento inclui uma cota de uso; passar da cota pode gerar <b>overage</b> (cobrado por token, à parte).</p>
          <table className="doctable">
            <thead><tr><th>Plano</th><th className="num">US$/assento·mês</th><th className="num">R$ (câmbio {fx})</th><th>Observação</th></tr></thead>
            <tbody>
              {plans.map(([n, p, obs]) => (
                <tr key={n}><td>{n}</td><td className="num">US$ {p}</td><td className="num">{brl(p)}</td><td style={{ color: "var(--ink-soft)" }}>{obs}</td></tr>
              ))}
            </tbody>
          </table>
          <p><b>Como o painel calcula o custo do plano no período:</b></p>
          <div className="formula">custo_plano = assentos × preço_assento × (dias_do_período ÷ 30,44)
            <br /><span className="c"># 30,44 = média de dias por mês; converte mensal → o período que você filtrou</span></div>
          <div className="callout warn">O PSA está no <b>Team</b> (31 assentos). Então "quanto pagamos" = 31 × preço do assento — não depende dos tokens. O CSV de gastos do claude.ai mostra em R$ sobretudo o <b>overage</b> (o que passou da cota); o uso dentro da cota aparece em tokens.</div>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">C</span><h2>Tokens — a moeda do uso</h2></div>
        <div className="card">
          <p>Um <b>token</b> ≈ 4 caracteres (¾ de uma palavra). Toda interação consome tokens de <b>4 tipos</b>, cada um com preço diferente por <b>1 milhão de tokens</b>:</p>
          <table className="doctable">
            <thead><tr><th>Tipo</th><th>O que é</th><th>Preço / 1M (US$)</th></tr></thead>
            <tbody>
              {tokens.map(([t, o, pr]) => (
                <tr key={t}><td><b>{t}</b></td><td style={{ color: "var(--ink-soft)" }}>{o}</td><td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{pr}</td></tr>
              ))}
            </tbody>
          </table>
          <p>Preços de saída são <b>5× os de entrada</b>. A <b>leitura de cache</b> é baratíssima por token (10% da entrada), mas costuma ser o maior volume — ver seção F.</p>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">D</span><h2>Fórmula do valor-equivalente</h2></div>
        <div className="card">
          <p>É o coração do painel: pega os tokens consumidos e calcula quanto custariam nos preços de API. Por modelo:</p>
          <div className="formula">valor = ( entrada×P_in + saída×P_out + cache_leitura×P_in×0,1 + cache_escrita×P_in×1,25 ) ÷ 1.000.000
            <br /><span className="c"># P_in e P_out = preços de entrada/saída do modelo (tabela acima)</span></div>
          <p><b>Exemplo</b> — uma tarefa no Opus 4.8 (P_in=$5, P_out=$25):</p>
          <div className="formula">50k entrada × $5/1M ................ $0,25
20k saída × $25/1M ................. $0,50
2M leitura de cache × $0,50/1M ..... $1,00
100k escrita de cache × $6,25/1M ... $0,625
{"                                    "}──────
total .............................. $2,375  ({brl(2.375)})</div>
          <p>O total do painel é a soma disso para <b>todas as chamadas, de todos os modelos</b>, no período filtrado.</p>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">E</span><h2>Custo real × valor-equivalente</h2></div>
        <div className="card">
          <p>Dois números que <b>não</b> são a mesma coisa:</p>
          <ul>
            <li><b>Custo real</b> = o que efetivamente foi pago. Na assinatura = assentos × preço (fixo). Na API = tokens × preço (variável). Overage aparece no CSV.</li>
            <li><b>Valor-equivalente</b> = o que os mesmos tokens custariam <b>na API</b>. É uma <b>referência de valor</b>, não um gasto. Serve pra medir o quanto você extrai vs. o que paga.</li>
          </ul>
          <div className="callout"><b>ROI</b> = valor-equivalente ÷ custo do plano. Se dá 18×, cada R$1 de assinatura rende R$18 de uso a preço de API — a assinatura está valendo muito a pena.</div>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">F</span><h2>Cache — por que o número fica tão grande</h2></div>
        <div className="card">
          <p>O Claude Code (e fluxos agênticos) <b>reenviam o contexto inteiro a cada passo</b> de uma tarefa. Esse contexto repetido é cobrado como <b>leitura de cache</b>: barato por token, mas em volume gigante vira bilhões de tokens.</p>
          <div className="callout warn">Na amostra desta máquina, <b>~88%</b> do valor-equivalente veio de cache (leitura + escrita), e só ~12% de saída de texto. Ou seja: o número é "real" no sentido de que a API cobraria isso, mas é <b>inflado pelo mecanismo de cache</b> — não é "R$50k de trabalho produzido".</div>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">G</span><h2>Integrações e APIs externas</h2></div>
        <div className="card">
          <p>Serviços que rodam junto com o Claude e cobram <b>separado</b> da Anthropic. Entram no custo de uma <b>iniciativa</b> (ex.: o Hunter Dossiê) além dos tokens:</p>
          <ul>
            <li><b>Apify</b> — cobra por <b>compute units</b> (CU) e uso de plataforma, por execução de <b>actor</b>. Custo por dossiê = CUs consumidas × preço do CU do seu plano Apify.</li>
            <li><b>API Anthropic (chave própria)</b> — se um fluxo (n8n do Renato) usa a API em vez de um assento, o custo é <b>por token, pay-as-you-go</b>, e aparece no <b>Console de API</b> (separado do Team).</li>
            <li><b>HubSpot</b> — assinatura própria por assento/tier. Não é custo Claude, mas pode entrar na conta "tudo incluído" de uma iniciativa.</li>
            <li><b>n8n</b> — se self-hosted, custo de servidor; se cloud, por execução de workflow.</li>
          </ul>
          <p><b>Custo por iniciativa</b> (ex.: um dossiê):</p>
          <div className="formula">custo_unitário = tokens_do_fluxo + Apify + (outras APIs)
custo_total = custo_unitário × volume  <span className="c"># ex.: R$5 × 7.798 dossiês</span></div>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">H</span><h2>Métricas do painel — como cada uma é calculada</h2></div>
        <div className="card">
          <div className="formula">Valor-equivalente ........ fórmula da seção D, somada no período
Custo do plano ........... assentos × preço × (dias ÷ 30,44)
ROI ...................... valor-equivalente ÷ custo do plano
Uso médio/dia ............ valor-equivalente ÷ dias com sessão
Dias úteis ociosos ....... dias seg–sex no período SEM nenhuma sessão
R$ pago sem uso .......... (preço mensal ÷ 30,44) × dias úteis ociosos
Custo por iniciativa ..... custo_unitário × volume</div>
        </div>
      </section>

      <section>
        <div className="sec-head"><span className="n">I</span><h2>De onde vêm os números</h2></div>
        <div className="card">
          <ul>
            <li><b>Uso do grupo</b> — CSV de Analytics do claude.ai (por usuário/modelo, tokens + gasto, até 90 dias, atraso de 1 dia). Exportado por um Proprietário do Team.</li>
            <li><b>Uso local</b> (amostra) — logs do Claude Code em <b>~/.claude</b> desta máquina.</li>
            <li><b>Preços</b> — tabela da Anthropic por 1M tokens (atualizável em <b>lib/pricing.js</b>).</li>
            <li><b>Câmbio US$→R$</b> — editável no topo (padrão {fx}).</li>
            <li><b>Funil de iniciativa</b> — HubSpot (ex.: <b>status_do_dossie</b>, associações de negócios).</li>
          </ul>
          <div className="callout">Tudo é processado <b>no navegador</b>; nenhum dado é enviado a servidores. O acesso ao painel é protegido por senha.</div>
        </div>
      </section>
    </div>
  );
}
