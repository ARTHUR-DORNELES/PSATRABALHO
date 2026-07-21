import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('_top50_3y_sp_FINAL.json','utf8'));

// PSA brand
const ORANGE_DEEP = '#D14A0F';
const ORANGE = '#F08220';
const ORANGE_LIGHT = '#FFA52A';
const ORANGE_50 = '#FFF4E8';
const INK = '#0E0E10';
const MUTE = '#6B6B72';
const LINE = '#E6E6EA';
const BG = '#FFFFFF';

// Layout
const W = 1200;
const HEADER_H = 220;
const FOOTER_H = 80;
const ROW_H = 62;
const COL_W = (W - 60) / 2;   // two columns, 30 padding each side, 0 gap
const ROWS_PER_COL = 25;
const CONTENT_H = ROWS_PER_COL * ROW_H;
const H = HEADER_H + CONTENT_H + FOOTER_H;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = BG;
ctx.fillRect(0, 0, W, H);

// === Header gradient bar ===
const grad = ctx.createLinearGradient(0, 0, W, 0);
grad.addColorStop(0, ORANGE_DEEP);
grad.addColorStop(0.5, ORANGE);
grad.addColorStop(1, ORANGE_LIGHT);
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, HEADER_H);

// Title
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 56px sans-serif';
ctx.textBaseline = 'top';
ctx.fillText('TOP 50 EMPRESAS · SÃO PAULO', 50, 48);

// Subtitle
ctx.font = '24px sans-serif';
ctx.globalAlpha = 0.92;
ctx.fillText('Maiores compradores B2B nos últimos 3 anos', 50, 116);
ctx.globalAlpha = 0.78;
ctx.font = '20px sans-serif';
ctx.fillText('com nome e telefone do tomador de decisão', 50, 152);
ctx.globalAlpha = 1;

// Decorative right accent
ctx.fillStyle = 'rgba(255,255,255,0.18)';
ctx.beginPath();
ctx.arc(W - 80, HEADER_H/2, 70, 0, Math.PI*2);
ctx.fill();
ctx.fillStyle = 'rgba(255,255,255,0.10)';
ctx.beginPath();
ctx.arc(W - 30, HEADER_H/2 + 60, 50, 0, Math.PI*2);
ctx.fill();

// Truncate text helper
function trunc(text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 0 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut + '…';
}

// Sanitize empresa display
const norm = (s) => (s||'').replace(/\s*[-–]\s*$/, '').trim();

// Draw rows in 2 columns
const drawRow = (row, x, y) => {
  // Alt background (very subtle)
  if (row.rank % 2 === 0) {
    ctx.fillStyle = ORANGE_50;
    ctx.fillRect(x + 4, y + 2, COL_W - 8, ROW_H - 4);
  }

  // Rank circle
  ctx.fillStyle = ORANGE_DEEP;
  ctx.beginPath();
  ctx.arc(x + 30, y + ROW_H/2, 19, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(row.rank).padStart(2, '0'), x + 30, y + ROW_H/2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Empresa (line 1)
  ctx.fillStyle = INK;
  ctx.font = 'bold 18px sans-serif';
  const empMax = COL_W - 70;
  ctx.fillText(trunc(norm(row.empresa), empMax), x + 60, y + 8);

  // Decisor + telefone (line 2)
  ctx.font = '15px sans-serif';
  ctx.fillStyle = MUTE;
  const dec = row.decisor_nome && row.decisor_nome !== '—' ? row.decisor_nome : '—';
  const phone = row.decisor_phone && row.decisor_phone !== '—' ? row.decisor_phone : '—';
  const line2 = `${dec}  ·  ${phone}`;
  ctx.fillText(trunc(line2, empMax), x + 60, y + 35);
};

// Vertical separator between columns
ctx.strokeStyle = LINE;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(W/2, HEADER_H + 20);
ctx.lineTo(W/2, HEADER_H + CONTENT_H - 20);
ctx.stroke();

// Draw 50 rows
for (let i = 0; i < 50; i++) {
  const row = data[i];
  const col = i < 25 ? 0 : 1;
  const localIdx = i - col * 25;
  const x = col === 0 ? 30 : W/2 + 10;
  const y = HEADER_H + localIdx * ROW_H;
  drawRow(row, x, y);
}

// === Footer ===
ctx.fillStyle = INK;
ctx.fillRect(0, HEADER_H + CONTENT_H, W, FOOTER_H);
ctx.fillStyle = '#FFFFFF';
ctx.font = '16px sans-serif';
ctx.textAlign = 'left';
ctx.fillText('Recorte: Funil B2B · estado de SP · negócios fechados nos últimos 3 anos', 50, HEADER_H + CONTENT_H + 22);
ctx.globalAlpha = 0.6;
ctx.font = '14px sans-serif';
ctx.fillText('Ranking por quantidade de deals · desempate por receita · 26/05/2026', 50, HEADER_H + CONTENT_H + 48);
ctx.globalAlpha = 1;

// Right side accent line in footer
ctx.fillStyle = ORANGE;
ctx.fillRect(W - 120, HEADER_H + CONTENT_H + 28, 70, 4);

// Save
const out = canvas.encode('png');
out.then(buf => {
  fs.writeFileSync('top50_empresas_sp.png', buf);
  console.log('Saved top50_empresas_sp.png');
  console.log('Size:', W, 'x', H);
  console.log('Bytes:', buf.length);
});
