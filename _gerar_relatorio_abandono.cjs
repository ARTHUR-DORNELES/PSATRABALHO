const PDFDocument = require('pdfkit');
const fs = require('fs');

const OUTS = [
  'C:/Users/Usuário/Downloads/Recuperacao_Carrinho_TBSchool.pdf',
  'C:/Users/Usuário/Desktop/Recuperacao_Carrinho_TBSchool.pdf',
];
const INK = '#1F2933', GRAY = '#5A6470', ACCENT = '#D35400', GREEN = '#1E7E4F', RED = '#B23A2E';
const RULE = '#D9DCE1', HEADBG = '#EEF0F3', PANEL = '#F5F6F8';

const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 56, right: 56 }, bufferPages: true });
const streams = OUTS.map((o) => fs.createWriteStream(o));
streams.forEach((s) => doc.pipe(s));
const L = 56, W = doc.page.width - 112, R = L + W, BOTTOM = doc.page.height - 64;

const need = (h) => { if (doc.y + h > BOTTOM) doc.addPage(); };
function section(num, title) {
  need(40); doc.moveDown(0.6); const y0 = doc.y;
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(ACCENT).text(num + '   ', L, y0, { continued: true });
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(INK).text(title);
  const y = doc.y + 3; doc.moveTo(L, y).lineTo(R, y).lineWidth(0.8).strokeColor(INK).stroke(); doc.y = y + 7;
}
function p(text, o = {}) {
  const h = doc.heightOfString(text, { width: W, align: o.align || 'left', lineGap: 2 });
  need(h); doc.font(o.b ? 'Helvetica-Bold' : 'Helvetica').fontSize(o.s || 10).fillColor(o.c || INK).text(text, L, doc.y, { width: W, align: o.align || 'left', lineGap: 2 });
  doc.moveDown(0.35);
}
function caption(text) { need(16); doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY).text(text, L, doc.y, { width: W, lineGap: 1.5 }); doc.moveDown(0.3); }
function table(cols, rows) {
  const pad = 6, fs2 = 9.5;
  const drawHead = () => {
    const rh = 20; need(rh + 2); const y = doc.y; let x = L;
    doc.rect(L, y, W, rh).fillColor(HEADBG).fill();
    for (const c of cols) { doc.font('Helvetica-Bold').fontSize(fs2).fillColor(INK).text(c.h, x + pad, y + 6, { width: c.w - pad * 2, align: c.align || 'left' }); x += c.w; }
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.8).strokeColor(INK).stroke();
    doc.moveTo(L, y + rh).lineTo(R, y + rh).lineWidth(0.8).strokeColor(INK).stroke(); doc.y = y + rh;
  };
  drawHead();
  for (const r of rows) {
    const cells = r.cells || r;
    doc.font('Helvetica').fontSize(fs2); // fonte fixa ANTES de medir, pra altura sair certa
    const hs = cells.map((c, i) => doc.heightOfString(String(c), { width: cols[i].w - pad * 2 }));
    const rh = Math.max(...hs, 12) + 10; // mais respiro vertical → sem ambiguidade de linha
    if (doc.y + rh > BOTTOM) { doc.addPage(); drawHead(); }
    const y = doc.y; let x = L;
    cells.forEach((c, i) => { doc.font(r.b ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs2).fillColor((r.colors && r.colors[i]) || (i === 0 ? INK : GRAY)).text(String(c), x + pad, y + 6, { width: cols[i].w - pad * 2, align: cols[i].align || 'left', lineBreak: false }); x += cols[i].w; });
    doc.moveTo(L, y + rh).lineTo(R, y + rh).lineWidth(0.5).strokeColor(RULE).stroke(); doc.y = y + rh;
  }
  doc.moveDown(0.5);
}
function kpiBand(items) {
  const h = 56; need(h + 6); const y = doc.y; doc.roundedRect(L, y, W, h, 6).fillColor(PANEL).fill();
  const cw = W / items.length;
  items.forEach((it, idx) => { const x = L + cw * idx; if (idx > 0) doc.moveTo(x, y + 10).lineTo(x, y + h - 10).lineWidth(0.6).strokeColor(RULE).stroke();
    doc.font('Helvetica-Bold').fontSize(17).fillColor(it.color || INK).text(it.value, x + 8, y + 11, { width: cw - 16, align: 'center' });
    doc.font('Helvetica').fontSize(7.8).fillColor(GRAY).text(it.label.toUpperCase(), x + 8, y + 35, { width: cw - 16, align: 'center', lineGap: 1 }); });
  doc.y = y + h + 8;
}
function rec(n, title, body) {
  const h = doc.heightOfString(title, { width: W - 26 }) + doc.heightOfString(body, { width: W - 26, lineGap: 2 }) + 14; need(h);
  const y = doc.y; doc.font('Helvetica-Bold').fontSize(11).fillColor(ACCENT).text(String(n), L, y, { width: 20 });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(title, L + 22, y, { width: W - 24 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(body, L + 22, doc.y + 1, { width: W - 24, align: 'justify', lineGap: 2 }); doc.moveDown(0.5);
}

// ===== CAPA =====
doc.moveTo(L, 70).lineTo(L + 64, 70).lineWidth(3).strokeColor(ACCENT).stroke();
doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('THE BEST SCHOOL · RÉGUA DE ABANDONO', L, 82, { characterSpacing: 1 });
doc.moveDown(1.3);
doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text('Recuperação de Carrinho', L, doc.y, { width: W });
doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text('Conversão por mensagem', { width: W });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(11).fillColor(GRAY).text('Quanto cada disparo (WhatsApp e e-mail) da régua converte em pagamento, por trilha — para decidir o que ajustar.', { width: W, lineGap: 2 });
doc.moveDown(0.5);
doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GRAY).text('15/06/2026 · workflow "[TBS 2026] Abandono de carrinho / Pix não pago" · coorte de 701 contatos · pagamento ao vivo (HubSpot).');
doc.moveDown(0.6);

// ===== 1. SÍNTESE =====
section('01', 'Síntese');
p('A régua está funcionando. Dos 701 que entram no fluxo, 65% acabam pagando — mas 419 pagam antes da 1ª mensagem (compra rápida). O ganho da régua está nos ~282 que precisam de empurrão, e a conversão deles depende fortemente da trilha.', { b: true });
p('Existem duas trilhas: PIX não pago (gerou PIX, quase pagou — alta intenção) e Abandono de carrinho (saiu antes do PIX — frio). A trilha PIX converte cerca de 2x mais.');
kpiBand([
  { label: 'Contatos no fluxo', value: '701', color: INK },
  { label: 'Pagaram (total)', value: '65%', color: GREEN },
  { label: 'Conv. trilha PIX', value: '~10%', color: GREEN },
  { label: 'Conv. trilha Carrinho', value: '~5%', color: RED },
]);

// ===== 2. CONVERSÃO POR DISPARO =====
section('02', 'Conversão por disparo');
caption('De cada disparo: quantos receberam e, desses, quantos pagaram depois (conversão). Trilha PIX = 529 contatos · Carrinho = 172.');
const COLS = [{ h: 'Disparo', w: W * 0.56 }, { h: 'Recebeu', w: W * 0.16, align: 'right' }, { h: 'Pagou', w: W * 0.13, align: 'right' }, { h: 'Conv.', w: W * 0.15, align: 'right' }];
p('Trilha PIX não pago (alta intenção)', { b: true, s: 10 });
table(COLS, [
  { cells: ['WhatsApp · tbschool_live_pix_v2', '123', '14', '11,4%'], colors: [INK, GRAY, GRAY, GREEN] },
  { cells: ['E-mail · PIX não pago 01', '105', '12', '11,4%'], colors: [INK, GRAY, GRAY, GREEN] },
  { cells: ['WhatsApp · tbschool_live_pix_v3', '98', '9', '9,2%'], colors: [INK, GRAY, GRAY, GREEN] },
  { cells: ['E-mail · PIX não pago 02', '71', '4', '5,6%'], colors: [INK, GRAY, GRAY, RED] },
]);
p('Trilha Abandono de carrinho (público frio)', { b: true, s: 10 });
table(COLS, [
  { cells: ['WhatsApp · tbschool_live_carrinho01', '159', '8', '5,0%'], colors: [INK, GRAY, GRAY, RED] },
  { cells: ['E-mail · Abandono Carrinho 01', '149', '6', '4,0%'], colors: [INK, GRAY, GRAY, RED] },
  { cells: ['WhatsApp · tbschool_live_carrinho02_2', '146', '7', '4,8%'], colors: [INK, GRAY, GRAY, RED] },
  { cells: ['WhatsApp · tbschool_live_carrinho03', '131', '6', '4,6%'], colors: [INK, GRAY, GRAY, RED] },
  { cells: ['E-mail · Abandono Carrinho 02', '106', '5', '4,7%'], colors: [INK, GRAY, GRAY, RED] },
]);
p('Leitura: na trilha PIX, os 2 primeiros toques (pix_v2 e e-mail PIX 01) puxam o grosso, ambos a 11,4%; o e-mail PIX 02 é o mais fraco (5,6%). A trilha de carrinho fica travada em 4–5% em todos os toques — é o gargalo.', { s: 9.5 });

// ===== 3. RECOMENDAÇÃO =====
section('03', 'Recomendação');
rec(1, 'Manter a trilha PIX como está', 'Todos os toques convertem bem (9–11%). É o público de maior retorno; não mexer na cadência.');
rec(2, 'Atacar a trilha de carrinho (o gargalo)', 'Travada em ~5% em todos os toques. É aqui que ajustar a régua rende mais: testar um gancho/oferta mais forte para o público frio (incentivo, escassez, prova social), em vez de repetir o mesmo tom.');
rec(3, 'Revisar o e-mail PIX não pago 02', 'É o disparo mais fraco dentro da trilha que converte (5,6%). Vale um teste de assunto/copy.');

// rodapé
doc.moveDown(0.4); need(30); doc.moveTo(L, doc.y).lineTo(R, doc.y).lineWidth(0.5).strokeColor(RULE).stroke(); doc.moveDown(0.3);
doc.font('Helvetica-Oblique').fontSize(8).fillColor(GRAY).text('Fonte: logs de ação do workflow (HubSpot) + status de pagamento ao vivo. Disparos mapeados por trilha (código PIX presente) e ordem do toque, com os nomes informados pela equipe. Conv. = de quem recebeu o disparo, % que pagou depois. Números variam conforme novas vendas.', { width: W, lineGap: 1.5 });

const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i); doc.page.margins.bottom = 0; const fy = doc.page.height - 42;
  doc.moveTo(L, fy).lineTo(R, fy).lineWidth(0.5).strokeColor(RULE).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text('The Best School · Recuperação de carrinho · Growth/MKT Ops', L, fy + 6, { width: W * 0.7, lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(`${i + 1} / ${range.count}`, L + W * 0.7, fy + 6, { width: W * 0.3, align: 'right', lineBreak: false });
}
doc.end();
let done = 0;
streams.forEach((s, i) => s.on('finish', () => { console.log('PDF salvo:', OUTS[i]); if (++done === streams.length) console.log('Concluido.'); }));
