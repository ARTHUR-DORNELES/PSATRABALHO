import fs from 'fs';

const src = fs.readFileSync('curadoria-pocket.html', 'utf8');

const font800 = src.match(/@font-face\{font-family:'Bruta-pro';font-weight:800[^}]+\}/)?.[0] ?? '';
const font400 = src.match(/@font-face\{font-family:'Bruta-pro';font-weight:400[^}]+\}/)?.[0] ?? '';
const artMatch = src.match(/const TEMA_ART = \{[\s\S]+?\};\s*\n/);
const temaArt = artMatch?.[0] ?? 'const TEMA_ART = {};';

console.log('font800:', font800.length, 'font400:', font400.length, 'temaArt:', temaArt.length);

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Índice de Palestrante — PSA</title>
<style>
${font800}
${font400}
:root{
  --orange:#F15B24;--orange-dim:rgba(241,91,36,.1);
  --bg:#EDE8DE;--white:#FFFFFF;--txt:#111214;
  --body:#3D3D3D;--muted:#888580;--border:#DDD8CE;
  --dark:#111214;--dark2:#1B1D21;--dark3:#252830;--darkline:#2E3138;
  --r:10px;--rlg:16px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Bruta-pro',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;overflow-x:hidden}
.screen{display:none}
.screen.active{display:block}
.psa-logo{font-family:'Bruta-pro',system-ui,sans-serif;font-style:normal;font-weight:800;font-size:22px;color:var(--orange);letter-spacing:-.01em;user-select:none}

/* ═══ LANDING ═══════════════════════════════════════════════ */
#s-landing{display:none}
#s-landing.active{display:flex;flex-direction:column;height:100vh;background:var(--bg)}
.land-topbar{display:flex;align-items:center;justify-content:center;height:60px;min-height:60px;background:var(--white);border-bottom:1px solid var(--border)}
.land-topbar .psa-logo{font-size:28px}
.land-body{display:grid;grid-template-columns:1fr 460px;flex:1;overflow:hidden}
.land-left{padding:52px 64px 52px 80px;display:flex;flex-direction:column;justify-content:center;overflow:auto}
.land-product{font-family:'Bruta-pro',system-ui,sans-serif;font-size:clamp(48px,5vw,72px);font-weight:800;color:var(--txt);letter-spacing:-.03em;line-height:.96;margin-bottom:10px}
.land-product .dot{color:var(--orange)}
.land-sub-label{font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:26px}
.land-title{font-size:clamp(16px,1.6vw,21px);font-weight:700;line-height:1.45;color:var(--txt);text-wrap:balance;margin-bottom:13px;max-width:520px}
.land-desc{font-size:13.5px;line-height:1.6;color:var(--body);max-width:460px}
.land-bullets-lbl{font-size:13px;font-weight:700;color:var(--txt);margin-bottom:8px;margin-top:18px}
.land-bullets{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:26px}
.land-bullets li{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--body);line-height:1.4}
.land-bullets li::before{content:'★';font-size:9px;color:var(--orange);flex-shrink:0;margin-top:3px}
.btn-cta{display:inline-flex;align-items:center;gap:10px;background:var(--orange);color:#fff;font-size:12.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;border:none;border-radius:var(--r);padding:15px 30px;cursor:pointer;transition:background .15s,transform .1s;width:fit-content}
.btn-cta:hover{background:#d94f1e}
.btn-cta:active{transform:scale(.98)}
.btn-cta svg{width:14px;height:14px;flex-shrink:0}
.land-footnote{font-size:11.5px;color:var(--muted);margin-top:10px}
.land-right{background:var(--bg);padding:40px 48px 40px 32px;display:flex;flex-direction:column;justify-content:center;gap:14px;overflow:auto}
.panel-label{font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.score-card{background:var(--white);border:1px solid rgba(0,0,0,.06);border-radius:var(--rlg);padding:26px;box-shadow:0 4px 32px rgba(0,0,0,.10),0 1px 4px rgba(0,0,0,.05)}
.score-card-header{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.score-row{display:flex;align-items:center;gap:18px;margin-bottom:18px}
.score-ring{position:relative;width:86px;height:86px;flex-shrink:0}
.score-ring svg{transform:rotate(-90deg)}
.score-ring-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.score-ring-num .rn{font-size:26px;font-weight:800;color:var(--txt);line-height:1}
.score-ring-num .rs{font-size:9px;color:var(--muted)}
.score-badge-prev{background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);color:#6D28D9;font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;display:inline-block;margin-top:5px}
.score-desc{font-size:12.5px;color:var(--body);line-height:1.45;margin-top:6px}
.dim-bars{display:flex;flex-direction:column;gap:9px}
.dim-bar-row{display:flex;flex-direction:column;gap:3px}
.dim-bar-top{display:flex;justify-content:space-between;align-items:center}
.dim-bar-label{font-size:11.5px;color:var(--body)}
.dim-bar-val{font-size:11.5px;font-weight:700;color:var(--txt)}
.dim-bar-track{height:5px;background:var(--border);border-radius:3px;overflow:hidden}
.dim-bar-fill{height:100%;border-radius:3px}
.panel-note{font-size:10.5px;color:var(--muted);text-align:center;padding-top:12px;border-top:1px solid var(--border);margin-top:4px;line-height:1.4}

/* ═══ QUIZ ══════════════════════════════════════════════════ */
.quiz-shell{min-height:100vh;display:flex;flex-direction:column}
.quiz-nav{background:var(--white);border-bottom:1px solid var(--border);padding:0 48px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:10}
.quiz-progress{display:flex;align-items:center;gap:5px}
.pip{width:28px;height:4px;border-radius:2px;background:var(--border);transition:background .3s}
.pip.done{background:var(--orange)}
.pip.active{background:var(--orange);opacity:.55}
.step-label{font-size:12px;color:var(--muted);font-weight:500}
.quiz-body{flex:1;padding:52px 48px;max-width:860px;margin:0 auto;width:100%}
.q-eyebrow{font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--orange);margin-bottom:9px}
.q-title{font-family:'Bruta-pro',system-ui,sans-serif;font-size:clamp(20px,2.4vw,30px);font-weight:800;font-style:normal;letter-spacing:-.02em;line-height:1.18;color:var(--txt);text-wrap:balance;margin-bottom:34px}
.option-list{display:flex;flex-direction:column;gap:10px}
.option-item{display:flex;align-items:center;gap:16px;background:var(--white);border:2px solid var(--border);border-radius:var(--r);padding:16px 20px;cursor:pointer;transition:border-color .15s,transform .1s}
.option-item:hover{border-color:var(--muted);transform:translateX(3px)}
.option-item.selected{border-color:var(--orange);background:rgba(241,91,36,.03)}
.opt-icon{font-size:26px;flex-shrink:0;width:38px;text-align:center}
.opt-text{flex:1}
.opt-label{font-size:15px;font-weight:700;color:var(--txt)}
.opt-desc{font-size:13px;color:var(--muted);margin-top:2px}
.opt-check{width:22px;height:22px;border:2px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .15s,background .15s}
.option-item.selected .opt-check{background:var(--orange);border-color:var(--orange)}
.opt-check svg{display:none}
.option-item.selected .opt-check svg{display:block}
.answer-grid{display:grid;gap:13px}
.g3{grid-template-columns:repeat(3,1fr)}
.answer-card{position:relative;overflow:hidden;height:140px;border-radius:var(--rlg);cursor:pointer;border:2px solid transparent;transition:transform .15s,box-shadow .15s}
.answer-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.15)}
.answer-card.selected{border-color:var(--orange);box-shadow:0 0 0 4px rgba(241,91,36,.18)}
.card-art{position:absolute;inset:0;width:100%;height:100%}
.card-art svg{width:100%;height:100%}
.card-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.58) 0%,rgba(0,0,0,.1) 55%,transparent 100%)}
.card-label{position:absolute;bottom:12px;left:12px;right:12px;z-index:2;color:#fff;font-size:13px;font-weight:700;line-height:1.3;text-shadow:0 1px 4px rgba(0,0,0,.35)}

/* ═══ LOADING ════════════════════════════════════════════════ */
#s-loading{display:none}
#s-loading.active{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
.load-left{background:var(--dark);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;gap:28px}
.ring-wrap{position:relative;width:136px;height:136px}
.ring-wrap svg{position:absolute;top:0;left:0;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:var(--dark3);stroke-width:6}
.ring-fill{fill:none;stroke:var(--orange);stroke-width:6;stroke-linecap:round;stroke-dasharray:377;stroke-dashoffset:377;transition:stroke-dashoffset .5s ease}
.ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}
.load-title{font-family:'Bruta-pro',system-ui,sans-serif;font-style:normal;font-weight:800;font-size:18px;color:#fff;text-align:center}
.load-sub{font-size:13px;color:rgba(255,255,255,.4);text-align:center;margin-top:5px}
.load-steps{display:flex;flex-direction:column;gap:8px;width:100%;max-width:270px}
.load-step{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,.35);transition:color .3s}
.load-step.done{color:rgba(255,255,255,.8)}
.step-dot{width:7px;height:7px;border-radius:50%;background:var(--dark3);flex-shrink:0;transition:background .3s}
.load-step.done .step-dot{background:var(--orange)}
.load-right{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:60px}
.capture-wrap{width:100%;max-width:360px}
.cap-title{font-family:'Bruta-pro',system-ui,sans-serif;font-style:normal;font-weight:800;font-size:24px;color:var(--txt);letter-spacing:-.02em;margin-bottom:6px}
.cap-sub{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.55}
.form-field{margin-bottom:14px}
.form-label{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--body);margin-bottom:5px}
.form-input{width:100%;border:1.5px solid var(--border);border-radius:var(--r);padding:12px 14px;font-size:15px;color:var(--txt);background:var(--white);outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.form-input:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(241,91,36,.12)}
.form-input::placeholder{color:#C4C0B8}
.btn-submit{width:100%;background:var(--orange);color:#fff;border:none;border-radius:var(--r);padding:15px;font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:22px;transition:background .15s,transform .1s}
.btn-submit:hover{background:#d94f1e}
.btn-submit:active{transform:scale(.98)}
.btn-submit:disabled{opacity:.45;cursor:not-allowed}
.form-privacy{font-size:11px;color:var(--muted);text-align:center;margin-top:10px;line-height:1.5}

/* ═══ REPORT ═════════════════════════════════════════════════ */
#s-report{display:none}
#s-report.active{display:block}
.rep-header{background:var(--dark);padding:40px 60px;display:flex;align-items:center;justify-content:space-between;gap:32px}
.rep-header-tag{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--orange);margin-bottom:12px}
.rep-title{font-family:'Bruta-pro',system-ui,sans-serif;font-size:clamp(22px,2.8vw,36px);font-weight:800;font-style:normal;letter-spacing:-.02em;color:#fff;margin-bottom:5px}
.rep-sub{font-size:14px;color:rgba(255,255,255,.45)}
.rep-score-box{text-align:center;background:var(--dark2);border:1px solid var(--darkline);border-radius:var(--rlg);padding:20px 28px;flex-shrink:0}
.rep-score-ring{position:relative;width:90px;height:90px;margin:0 auto 10px}
.rep-score-ring svg{transform:rotate(-90deg)}
.rep-score-ring-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rep-score-ring-num .big{font-size:28px;font-weight:800;color:#fff;line-height:1}
.rep-score-ring-num .sub{font-size:10px;color:rgba(255,255,255,.35)}
.rep-score-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 10px;border-radius:100px;border:1px solid;margin-top:6px}
.btn-print{display:inline-flex;align-items:center;gap:7px;border:1.5px solid rgba(255,255,255,.28);color:rgba(255,255,255,.72);background:transparent;border-radius:var(--r);padding:8px 14px;font-size:12px;font-weight:700;letter-spacing:.05em;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap;text-transform:uppercase;margin-top:18px}
.btn-print:hover{border-color:rgba(255,255,255,.65);color:#fff}
.btn-print svg{width:13px;height:13px;flex-shrink:0}
.rep-body{padding:44px 60px;max-width:1080px;margin:0 auto}
.sec-eye{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:18px;display:flex;align-items:center;gap:8px}
.sec-eye::before{content:'';display:block;width:14px;height:2px;background:var(--orange)}
.dims-full{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:32px}
.dim-card{background:var(--white);border:1px solid var(--border);border-radius:var(--rlg);padding:20px}
.dim-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.dim-card-name{font-size:12px;font-weight:700;color:var(--body)}
.dim-card-score{font-family:'Bruta-pro',system-ui,sans-serif;font-size:24px;font-weight:800}
.dim-card-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:10px}
.dim-card-fill{height:100%;border-radius:3px;transition:width .8s ease}
.dim-card-desc{font-size:12px;color:var(--muted);line-height:1.45}
.profile-card{background:var(--white);border:1px solid var(--border);border-radius:var(--rlg);padding:28px;margin-bottom:32px}
.profile-title{font-family:'Bruta-pro',system-ui,sans-serif;font-size:20px;font-weight:800;color:var(--txt);margin-bottom:8px}
.profile-desc{font-size:15px;line-height:1.7;color:var(--body)}
.next-step-row{display:flex;align-items:flex-start;gap:12px;background:rgba(241,91,36,.05);border:1px solid rgba(241,91,36,.18);border-radius:var(--r);padding:14px 18px;margin-top:20px}
.ns-ico{font-size:22px;flex-shrink:0}
.ns-lbl{font-size:11px;font-weight:600;color:var(--orange);text-transform:uppercase;letter-spacing:.05em}
.ns-val{font-size:14px;font-weight:700;color:var(--txt);margin-top:2px}
.rep-ctas{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:40px}
.cta-card{border-radius:var(--rlg);padding:26px;cursor:pointer;display:flex;flex-direction:column;gap:9px;transition:transform .15s,box-shadow .15s;border:2px solid transparent}
.cta-card:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.1)}
.cta-card.primary{background:var(--orange);border-color:var(--orange)}
.cta-card.secondary{background:var(--white);border-color:var(--border)}
.cta-eye{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
.cta-card.primary .cta-eye{color:rgba(255,255,255,.55)}
.cta-card.secondary .cta-eye{color:var(--muted)}
.cta-ttl{font-family:'Bruta-pro',system-ui,sans-serif;font-size:18px;font-weight:800;line-height:1.2}
.cta-card.primary .cta-ttl{color:#fff}
.cta-card.secondary .cta-ttl{color:var(--txt)}
.cta-dsc{font-size:13px;line-height:1.5}
.cta-card.primary .cta-dsc{color:rgba(255,255,255,.65)}
.cta-card.secondary .cta-dsc{color:var(--muted)}
.cta-btn{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;padding:9px 16px;border-radius:var(--r);margin-top:5px;width:fit-content}
.cta-card.primary .cta-btn{background:rgba(255,255,255,.2);color:#fff}
.cta-card.secondary .cta-btn{background:var(--orange);color:#fff}
.ty-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100;align-items:center;justify-content:center}
.ty-overlay.active{display:flex}
.ty-box{background:var(--white);border-radius:var(--rlg);padding:44px 36px;max-width:420px;text-align:center}
.ty-ico{font-size:44px;margin-bottom:18px}
.ty-ttl{font-size:22px;font-weight:800;color:var(--txt);margin-bottom:7px}
.ty-sub{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:22px}
.ty-close{background:var(--orange);color:#fff;border:none;border-radius:var(--r);padding:12px 26px;font-size:14px;font-weight:700;cursor:pointer}

@media print{
  body{background:#fff!important}
  #s-landing,#s-q1,#s-q2,#s-q3,#s-q4,#s-q5,#s-q6,#s-loading,.quiz-nav,.rep-ctas,.btn-print,.ty-overlay{display:none!important}
  #s-report.active{display:block!important}
  .rep-header{background:#111214!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:28px 36px}
  .rep-body{padding:24px 36px}
  .dims-full{grid-template-columns:repeat(3,1fr)!important}
}
@media(max-width:900px){
  .land-body{grid-template-columns:1fr}
  .land-right{display:none}
  .land-left{padding:36px 28px 48px}
  .quiz-body{padding:36px 22px}
  .quiz-nav{padding:0 22px}
  .g3{grid-template-columns:repeat(2,1fr)}
  .dims-full{grid-template-columns:1fr 1fr}
  #s-loading.active{grid-template-columns:1fr}
  .load-left{padding:40px 28px}
  .load-right{padding:40px 28px}
  .rep-header{padding:28px;flex-direction:column;align-items:flex-start;gap:18px}
  .rep-body{padding:28px}
  .rep-ctas{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body>

<!-- ═══ LANDING ═══════════════════════════════════════════════ -->
<div id="s-landing" class="screen active">
  <div class="land-topbar"><div class="psa-logo">PSA.</div></div>
  <div class="land-body">
    <div class="land-left">
      <div class="land-product">Índice de<br>Palestrante<span class="dot">.</span></div>
      <div class="land-sub-label">Diagnóstico de maturidade para palestrantes profissionais</div>
      <h1 class="land-title">Você sabe exatamente onde está como palestrante profissional? Descubra seu índice de maturidade em 5 minutos.</h1>
      <p class="land-desc">O mercado de palestras é competitivo. Mas poucos palestrantes sabem com precisão o que os separa dos que faturam de verdade.</p>
      <div class="land-bullets-lbl">Em 5 minutos, você descobre:</div>
      <ul class="land-bullets">
        <li>Seu Índice de Palestrante (0–100) com classificação de maturidade</li>
        <li>Análise em 5 dimensões: Tese, Palco, Audiência, Comercial e Autoridade</li>
        <li>Sua maior lacuna e o que ela custa na prática</li>
        <li>O próximo passo estratégico para o seu perfil</li>
      </ul>
      <button class="btn-cta" onclick="show('s-q1')">
        DESCOBRIR MEU ÍNDICE
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
      </button>
      <p class="land-footnote">100% gratuito · Para palestrantes que querem crescer com estratégia</p>
    </div>
    <div class="land-right">
      <div class="panel-label">Exemplo de resultado</div>
      <div class="score-card">
        <div class="score-card-header">ÍNDICE DE PALESTRANTE</div>
        <div class="score-row">
          <div class="score-ring">
            <svg viewBox="0 0 86 86" width="86" height="86">
              <circle r="34" cx="43" cy="43" fill="none" stroke="#E4E0D8" stroke-width="6"/>
              <circle r="34" cx="43" cy="43" fill="none" stroke="#7C3AED" stroke-width="6" stroke-linecap="round" stroke-dasharray="214" stroke-dashoffset="60"/>
            </svg>
            <div class="score-ring-num"><span class="rn">72</span><span class="rs">/100</span></div>
          </div>
          <div>
            <div class="score-badge-prev">Palestrante Consolidado</div>
            <p class="score-desc">Base sólida. O próximo nível exige posicionamento e presença digital mais forte.</p>
          </div>
        </div>
        <div class="dim-bars">
          <div class="dim-bar-row"><div class="dim-bar-top"><div class="dim-bar-label">🎯 Clareza de Tese</div><div class="dim-bar-val">88/100</div></div><div class="dim-bar-track"><div class="dim-bar-fill" style="width:88%;background:#7C3AED"></div></div></div>
          <div class="dim-bar-row"><div class="dim-bar-top"><div class="dim-bar-label">🎤 Capital de Palco</div><div class="dim-bar-val">75/100</div></div><div class="dim-bar-track"><div class="dim-bar-fill" style="width:75%;background:#0891B2"></div></div></div>
          <div class="dim-bar-row"><div class="dim-bar-top"><div class="dim-bar-label">👥 Presença de Audiência</div><div class="dim-bar-val">48/100</div></div><div class="dim-bar-track"><div class="dim-bar-fill" style="width:48%;background:#D97706"></div></div></div>
          <div class="dim-bar-row"><div class="dim-bar-top"><div class="dim-bar-label">💼 Visão Comercial</div><div class="dim-bar-val">82/100</div></div><div class="dim-bar-track"><div class="dim-bar-fill" style="width:82%;background:#16A34A"></div></div></div>
          <div class="dim-bar-row"><div class="dim-bar-top"><div class="dim-bar-label">📣 Autoridade de Mercado</div><div class="dim-bar-val">63/100</div></div><div class="dim-bar-track"><div class="dim-bar-fill" style="width:63%;background:#BE185D"></div></div></div>
        </div>
        <div class="panel-note">Baseado em pesquisa com +587 palestrantes da base PSA</div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Q1 ═══════════════════════════════════════════════════ -->
<div id="s-q1" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip active"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
      <span class="step-label">1 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Capital de Palco</div>
      <h2 class="q-title">Quantas palestras profissionais você já realizou?</h2>
      <div class="option-list">
        <div class="option-item" onclick="pick('vol',0,this)"><div class="opt-icon">🌱</div><div class="opt-text"><div class="opt-label">Ainda não comecei</div><div class="opt-desc">Tenho vontade, mas nunca subi ao palco profissionalmente</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('vol',1,this)"><div class="opt-icon">🔥</div><div class="opt-text"><div class="opt-label">1 a 10 palestras</div><div class="opt-desc">Estou começando — experiências pontuais ou pro bono</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('vol',2,this)"><div class="opt-icon">🎤</div><div class="opt-text"><div class="opt-label">10 a 50 palestras</div><div class="opt-desc">Tenho consistência e eventos pagos no portfólio</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('vol',3,this)"><div class="opt-icon">⭐</div><div class="opt-text"><div class="opt-label">50 a 150 palestras</div><div class="opt-desc">Sou ativo no mercado, agenda boa parte do ano</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('vol',4,this)"><div class="opt-icon">🏆</div><div class="opt-text"><div class="opt-label">Mais de 150 palestras</div><div class="opt-desc">Palestrante veterano — palco é minha principal atividade</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Q2: Nicho com arts ════════════════════════════════════ -->
<div id="s-q2" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip done"></div><div class="pip active"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
      <span class="step-label">2 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Clareza de Tese</div>
      <h2 class="q-title">Qual é o tema central das suas palestras?</h2>
      <div class="answer-grid g3" id="nicho-grid"></div>
    </div>
  </div>
</div>

<!-- ═══ Q3 ═══════════════════════════════════════════════════ -->
<div id="s-q3" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip done"></div><div class="pip done"></div><div class="pip active"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
      <span class="step-label">3 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Clareza de Tese</div>
      <h2 class="q-title">Como você descreveria seu posicionamento como palestrante?</h2>
      <div class="option-list">
        <div class="option-item" onclick="pick('pos',0,this)"><div class="opt-icon">🌫️</div><div class="opt-text"><div class="opt-label">Ainda não tenho nicho definido</div><div class="opt-desc">Falo sobre vários temas dependendo do que o cliente pede</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('pos',1,this)"><div class="opt-icon">🔍</div><div class="opt-text"><div class="opt-label">Tenho tema, mas ainda generalizo bastante</div><div class="opt-desc">Já sei sobre o que falo, mas o posicionamento é amplo</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('pos',2,this)"><div class="opt-icon">🎯</div><div class="opt-text"><div class="opt-label">Nicho definido, conteúdo consistente</div><div class="opt-desc">Tenho tese clara e produzo conteúdo alinhado ao meu tema</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('pos',3,this)"><div class="opt-icon">🏅</div><div class="opt-text"><div class="opt-label">Referência no nicho, com cases publicados</div><div class="opt-desc">Sou reconhecido como autoridade — mídia, livros, conteúdo viral</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Q4 ═══════════════════════════════════════════════════ -->
<div id="s-q4" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip active"></div><div class="pip"></div><div class="pip"></div></div>
      <span class="step-label">4 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Presença de Audiência</div>
      <h2 class="q-title">Como está sua presença digital e audiência hoje?</h2>
      <div class="option-list">
        <div class="option-item" onclick="pick('dig',0,this)"><div class="opt-icon">📵</div><div class="opt-text"><div class="opt-label">Não tenho presença estruturada</div><div class="opt-desc">Perfis básicos sem publicação consistente</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('dig',1,this)"><div class="opt-icon">📱</div><div class="opt-text"><div class="opt-label">Perfis ativos, mas sem estratégia</div><div class="opt-desc">Posto com alguma frequência, sem crescimento consistente</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('dig',2,this)"><div class="opt-icon">📈</div><div class="opt-text"><div class="opt-label">Audiência engajada em pelo menos 1 plataforma</div><div class="opt-desc">LinkedIn, Instagram ou YouTube com crescimento real</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('dig',3,this)"><div class="opt-icon">🌟</div><div class="opt-text"><div class="opt-label">Referência em 2 ou mais plataformas</div><div class="opt-desc">Comunidade fiel, conteúdo viral, mídia espontânea</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Q5 ═══════════════════════════════════════════════════ -->
<div id="s-q5" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip active"></div><div class="pip"></div></div>
      <span class="step-label">5 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Visão Comercial</div>
      <h2 class="q-title">Qual é o seu cachê médio por palestra hoje?</h2>
      <div class="option-list">
        <div class="option-item" onclick="pick('cache',0,this)"><div class="opt-icon">🤝</div><div class="opt-text"><div class="opt-label">Faço por exposure ou permuta</div><div class="opt-desc">Ainda não cobro ou não tenho cachê definido</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('cache',1,this)"><div class="opt-icon">💰</div><div class="opt-text"><div class="opt-label">Até R$ 10 mil</div><div class="opt-desc">Primeiros cachês — construindo portfólio e reputação</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('cache',2,this)"><div class="opt-icon">💎</div><div class="opt-text"><div class="opt-label">R$ 10 mil a R$ 30 mil</div><div class="opt-desc">Carreira consolidada — empresas médias e grandes</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('cache',3,this)"><div class="opt-icon">🚀</div><div class="opt-text"><div class="opt-label">R$ 30 mil a R$ 80 mil</div><div class="opt-desc">Primeiro escalão — alta demanda e agenda seletiva</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('cache',4,this)"><div class="opt-icon">👑</div><div class="opt-text"><div class="opt-label">Acima de R$ 80 mil</div><div class="opt-desc">Top de linha — referência máxima do mercado</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ Q6 ═══════════════════════════════════════════════════ -->
<div id="s-q6" class="screen">
  <div class="quiz-shell">
    <nav class="quiz-nav">
      <div class="psa-logo">PSA.</div>
      <div class="quiz-progress"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip active"></div></div>
      <span class="step-label">6 de 6</span>
    </nav>
    <div class="quiz-body">
      <div class="q-eyebrow">Autoridade de Mercado</div>
      <h2 class="q-title">Como você se apresenta no mercado hoje?</h2>
      <div class="option-list">
        <div class="option-item" onclick="pick('mat',0,this)"><div class="opt-icon">📋</div><div class="opt-text"><div class="opt-label">Ainda não tenho materiais profissionais</div><div class="opt-desc">Sem one-sheet, vídeo de palco ou bio estruturada</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('mat',1,this)"><div class="opt-icon">📄</div><div class="opt-text"><div class="opt-label">Tenho materiais básicos</div><div class="opt-desc">Bio, fotos e apresentação, mas sem vídeo profissional</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('mat',2,this)"><div class="opt-icon">🎬</div><div class="opt-text"><div class="opt-label">One-sheet, bio e vídeo de palco profissional</div><div class="opt-desc">Kit completo para venda — pronto para agências e empresas</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
        <div class="option-item" onclick="pick('mat',3,this)"><div class="opt-icon">🏆</div><div class="opt-text"><div class="opt-label">Kit completo + mídia espontânea e cases publicados</div><div class="opt-desc">Reportagens, prêmios, livros ou conteúdos de referência</div></div><div class="opt-check"><svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,5 4,8 11,1"/></svg></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ LOADING / CAPTURA ═════════════════════════════════════ -->
<div id="s-loading" class="screen">
  <div class="load-left">
    <div class="ring-wrap">
      <svg viewBox="0 0 136 136" width="136" height="136">
        <circle class="ring-bg" cx="68" cy="68" r="60"/>
        <circle class="ring-fill" id="ring-fill" cx="68" cy="68" r="60"/>
      </svg>
      <div class="ring-num" id="ring-pct">0%</div>
    </div>
    <div>
      <div class="load-title" id="load-title">Calculando seu índice…</div>
      <div class="load-sub" id="load-sub">Cruzando suas respostas com a base PSA</div>
    </div>
    <div class="load-steps">
      <div class="load-step" id="step-1"><div class="step-dot"></div>Analisando volume e experiência</div>
      <div class="load-step" id="step-2"><div class="step-dot"></div>Avaliando tese e posicionamento</div>
      <div class="load-step" id="step-3"><div class="step-dot"></div>Calculando presença e autoridade</div>
      <div class="load-step" id="step-4"><div class="step-dot"></div>Gerando diagnóstico personalizado</div>
    </div>
  </div>
  <div class="load-right">
    <div class="capture-wrap">
      <div class="cap-title">Quase pronto!</div>
      <p class="cap-sub">Preencha seus dados para receber o diagnóstico completo com recomendações personalizadas.</p>
      <div class="form-field"><label class="form-label" for="f-name">Seu nome</label><input class="form-input" id="f-name" type="text" placeholder="Como quer ser chamado?" oninput="updateRing()"></div>
      <div class="form-field"><label class="form-label" for="f-email">E-mail profissional</label><input class="form-input" id="f-email" type="email" placeholder="seu@email.com" oninput="updateRing()"></div>
      <div class="form-field"><label class="form-label" for="f-phone">WhatsApp</label><input class="form-input" id="f-phone" type="tel" placeholder="(11) 99999-9999" oninput="updateRing()"></div>
      <button class="btn-submit" id="btn-submit" onclick="submitLead()" disabled>Ver meu Índice de Palestrante →</button>
      <p class="form-privacy">🔒 Seus dados são confidenciais e usados somente para envio do diagnóstico.</p>
    </div>
  </div>
</div>

<!-- ═══ REPORT ════════════════════════════════════════════════ -->
<div id="s-report" class="screen">
  <div class="rep-header">
    <div style="flex:1">
      <div class="psa-logo" style="margin-bottom:14px">PSA.</div>
      <div class="rep-header-tag">Índice de Palestrante · Diagnóstico Personalizado</div>
      <div class="rep-title" id="rep-title">Seu Índice de Palestrante</div>
      <div class="rep-sub" id="rep-sub">Baseado nas suas respostas</div>
      <button class="btn-print" onclick="window.print()">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 11v3h8v-3"/></svg>
        Baixar / Imprimir relatório
      </button>
    </div>
    <div class="rep-score-box">
      <div class="rep-score-ring">
        <svg viewBox="0 0 90 90" width="90" height="90">
          <circle r="38" cx="45" cy="45" fill="none" stroke="#2E3138" stroke-width="6"/>
          <circle id="rep-ring-fill" r="38" cx="45" cy="45" fill="none" stroke="#F15B24" stroke-width="6" stroke-linecap="round" stroke-dasharray="239" stroke-dashoffset="239"/>
        </svg>
        <div class="rep-score-ring-num"><span class="big" id="rep-score">--</span><span class="sub">/100</span></div>
      </div>
      <div class="rep-score-badge" id="rep-tier">—</div>
    </div>
  </div>
  <div class="rep-body">
    <div class="sec-eye">Análise por Dimensão</div>
    <div class="dims-full" id="rep-dims"></div>
    <div class="profile-card">
      <div class="sec-eye">Diagnóstico do seu perfil</div>
      <div class="profile-title" id="rep-profile-title">—</div>
      <div class="profile-desc" id="rep-desc">—</div>
      <div class="next-step-row" id="rep-nextstep"></div>
    </div>
    <div class="sec-eye">Próximos passos</div>
    <div class="rep-ctas">
      <div class="cta-card primary" onclick="openTY('catalogo')">
        <div class="cta-eye">Para você</div>
        <div class="cta-ttl">Entrar para o catálogo PSA</div>
        <div class="cta-dsc">Conecte-se com +5.000 empresas que contratam palestrantes pela PSA todos os anos.</div>
        <div class="cta-btn">Quero entrar →</div>
      </div>
      <div class="cta-card secondary" onclick="openTY('mentoria')">
        <div class="cta-eye">Acelere seu crescimento</div>
        <div class="cta-ttl">Diagnóstico completo com especialista</div>
        <div class="cta-dsc">Uma conversa com nosso time de desenvolvimento de palestrantes para traçar seu plano de crescimento.</div>
        <div class="cta-btn">Agendar conversa →</div>
      </div>
    </div>
  </div>
</div>

<div class="ty-overlay" id="ty-overlay">
  <div class="ty-box">
    <div class="ty-ico">🎉</div>
    <div class="ty-ttl" id="ty-ttl">Ótimo!</div>
    <p class="ty-sub" id="ty-sub">Nossa equipe entrará em contato em breve.</p>
    <button class="ty-close" onclick="document.getElementById('ty-overlay').classList.remove('active')">Fechar</button>
  </div>
</div>

<script>
${temaArt}

const S={vol:null,nicho:null,pos:null,dig:null,cache:null,mat:null,name:'',email:'',phone:''};
const SCORES={vol:[5,25,55,78,95],pos:[15,40,72,92],dig:[10,32,65,92],cache:[5,35,62,82,97],mat:[10,38,70,94]};

function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);}

const FLOW={vol:'s-q2',pos:'s-q4',dig:'s-q5',cache:'s-q6',mat:null};
function pick(field,val,el){
  S[field]=val;
  el.closest('.option-list').querySelectorAll('.option-item').forEach(i=>i.classList.remove('selected'));
  el.classList.add('selected');
  const next=FLOW[field];
  if(next) setTimeout(()=>show(next),280);
  else setTimeout(()=>{show('s-loading');startLoad();},280);
}

const NICHOS=[
  {id:'lideranca',label:'Liderança'},
  {id:'vendas',label:'Vendas & Negócios'},
  {id:'inovacao',label:'Inovação & IA'},
  {id:'marketing',label:'Marketing & Growth'},
  {id:'cultura',label:'Cultura & Pessoas'},
  {id:'esg',label:'ESG & Sustentabilidade'},
  {id:'saude',label:'Saúde & Bem-estar'},
  {id:'futuro',label:'Futuro & Tendências'},
  {id:'outro',label:'Outro tema'},
];
(function buildNichoGrid(){
  const g=document.getElementById('nicho-grid');
  NICHOS.forEach(n=>{
    const el=document.createElement('div');el.className='answer-card';
    const art=TEMA_ART[n.id]||TEMA_ART['outro']||'';
    el.innerHTML='<div class="card-art">'+art+'</div><div class="card-shade"></div><div class="card-label">'+n.label+'</div>';
    el.onclick=()=>{S.nicho=n;document.querySelectorAll('#nicho-grid .answer-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');setTimeout(()=>show('s-q3'),280);};
    g.appendChild(el);
  });
})();

let loadInt=null;
function startLoad(){
  const steps=['step-1','step-2','step-3','step-4'];let s=0;
  clearInterval(loadInt);steps.forEach(id=>document.getElementById(id).classList.remove('done'));
  loadInt=setInterval(()=>{if(s<steps.length){document.getElementById(steps[s]).classList.add('done');s++;}else clearInterval(loadInt);},900);
}

function updateRing(){
  const n=document.getElementById('f-name').value.trim();
  const e=document.getElementById('f-email').value.trim();
  const p=document.getElementById('f-phone').value.trim();
  const filled=[n.length>1,e.includes('@'),p.length>7].filter(Boolean).length;
  const pct=Math.round(filled/3*100);const circ=377;
  document.getElementById('ring-fill').style.strokeDashoffset=circ-(circ*pct/100);
  document.getElementById('ring-pct').textContent=pct+'%';
  document.getElementById('btn-submit').disabled=filled<3;
  if(pct===100){document.getElementById('load-title').textContent='Perfeito! Calculando seu índice…';document.getElementById('load-sub').textContent='Tudo pronto para mostrar seu diagnóstico';}
}

function submitLead(){
  S.name=document.getElementById('f-name').value.trim();
  S.email=document.getElementById('f-email').value.trim();
  S.phone=document.getElementById('f-phone').value.trim();
  buildReport();show('s-report');
}

function buildReport(){
  const pal=SCORES.vol[S.vol??0],pos=SCORES.pos[S.pos??0],tese=Math.round((pos+72)/2);
  const aud=SCORES.dig[S.dig??0],com=SCORES.cache[S.cache??0],aut=SCORES.mat[S.mat??0];
  const sc=Math.round(pal*0.20+tese*0.22+aud*0.18+com*0.22+aut*0.18);
  const TIERS=[
    {max:35,label:'Iniciante com Potencial',color:'#6B7280',desc:'Você está no início da jornada. A boa notícia: o mercado está aberto e o caminho está claro. Foque em volume de palco e definição de nicho antes de qualquer outra coisa.',step:'Definir seu nicho e fazer as primeiras palestras pagas — mesmo que em troca de visibilidade.'},
    {max:55,label:'Palestrante em Formação',color:'#D97706',desc:'Você já tem experiência, mas ainda há pontos críticos a fortalecer para competir com consistência no mercado corporativo. É a hora de estruturar.',step:'Montar seu kit de vendas (one-sheet + vídeo de palco) e aumentar sua presença no LinkedIn.'},
    {max:72,label:'Palestrante Consolidado',color:'#0891B2',desc:'Base sólida. Você já é reconhecido e tem cases reais. O próximo salto exige posicionamento mais preciso e aumento de autoridade percebida pelo mercado.',step:'Elevar o cachê com base em resultados e fortalecer a autoridade com conteúdo e participação em veículos de mídia.'},
    {max:88,label:'Referência de Mercado',color:'#7C3AED',desc:'Você está no primeiro escalão. Alta demanda, agenda valorizada. O desafio agora é escalar com seletividade — dizer não aos eventos errados libera espaço para os certos.',step:'Selecionar eventos estratégicos para sua marca e construir legado com livro, curso ou programa próprio.'},
    {max:100,label:'Top de Linha',color:'#F15B24',desc:'Você está entre os melhores do mercado. A PSA considera perfis como o seu para parcerias diretas e projetos de alto impacto. Sua agenda é ativo estratégico.',step:'Explorar formatos premium: retainers, programas de imersão e keynotes internacionais.'},
  ];
  const tier=TIERS.find(t=>sc<=t.max)||TIERS[TIERS.length-1];
  document.getElementById('rep-score').textContent=sc;
  const badge=document.getElementById('rep-tier');
  badge.textContent=tier.label;badge.style.color=tier.color;badge.style.borderColor=tier.color+'55';badge.style.background=tier.color+'18';
  const circ=239;
  document.getElementById('rep-ring-fill').style.stroke=tier.color;
  document.getElementById('rep-ring-fill').style.strokeDashoffset=circ-(circ*sc/100);
  document.getElementById('rep-title').textContent='Índice de Palestrante: '+tier.label;
  document.getElementById('rep-sub').textContent='Olá, '+S.name+' — diagnóstico de maturidade para palestrantes profissionais.';
  const dims=[
    {name:'🎯 Clareza de Tese',val:tese,color:'#7C3AED',desc:'Define seu posicionamento e profundidade temática no mercado corporativo.'},
    {name:'🎤 Capital de Palco',val:pal,color:'#0891B2',desc:'Volume de experiências reais e portfólio de eventos realizados.'},
    {name:'👥 Presença de Audiência',val:aud,color:'#D97706',desc:'Alcance digital, comunidade e capacidade de gerar demanda ativa inbound.'},
    {name:'💼 Visão Comercial',val:com,color:'#16A34A',desc:'Posicionamento de cachê, modelo de negócio e maturidade comercial.'},
    {name:'📣 Autoridade de Mercado',val:aut,color:'#BE185D',desc:'Materiais profissionais, mídia espontânea e reconhecimento externo.'},
  ];
  document.getElementById('rep-dims').innerHTML=dims.map(d=>'<div class="dim-card"><div class="dim-card-top"><div class="dim-card-name">'+d.name+'</div><div class="dim-card-score" style="color:'+d.color+'">'+d.val+'</div></div><div class="dim-card-track"><div class="dim-card-fill" style="width:'+d.val+'%;background:'+d.color+'"></div></div><div class="dim-card-desc">'+d.desc+'</div></div>').join('');
  const weakest=dims.reduce((a,b)=>a.val<b.val?a:b);
  const weakName=weakest.name.split(' ').slice(1).join(' ');
  document.getElementById('rep-profile-title').textContent=tier.label;
  document.getElementById('rep-desc').textContent=tier.desc+' Sua maior lacuna está em '+weakName+' ('+weakest.val+'/100) — é onde um investimento pontual gera o maior retorno de carreira.';
  document.getElementById('rep-nextstep').innerHTML='<div class="ns-ico">🎯</div><div><div class="ns-lbl">Próximo passo recomendado</div><div class="ns-val">'+tier.step+'</div></div>';
}

function openTY(type){
  document.getElementById('ty-ttl').textContent=type==='catalogo'?'Ótimo! Vamos te apresentar.':'Conversa agendada!';
  document.getElementById('ty-sub').textContent=type==='catalogo'?'Nossa equipe entrará em contato com '+S.name+' para iniciar o processo de curadoria do seu perfil na PSA.':'Em até 24h enviaremos para '+S.email+' as opções de agenda para sua conversa com nosso time de desenvolvimento.';
  document.getElementById('ty-overlay').classList.add('active');
}
</script>
</body>
</html>`;

fs.writeFileSync('indice-palestrante.html', html, 'utf8');
const size = fs.statSync('indice-palestrante.html').size;
console.log('Written! Size:', Math.round(size/1024), 'KB');
