import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('_top50_3y_sp_FINAL.json','utf8'));

// PSA brand palette
const ORANGE_DEEP = '#D14A0F';
const ORANGE = '#F08220';
const ORANGE_LIGHT = '#FFA52A';
const ORANGE_GLOW = '#FFD580';

// Dark premium palette
const BG = '#0B0B0E';
const BG_ALT = '#13131A';
const INK_LIGHT = '#F5F5F7';
const INK_DIM = '#9B9BA3';
const INK_MUTE = '#5C5C66';
const HAIRLINE = '#1F1F26';

// Layout
const W = 1200;
const PAD_X = 50;
const HEADER_H = 360;
const FOOTER_H = 110;
const ROW_H = 56;
const ROWS_PER_COL = 25;
const CONTENT_H = ROWS_PER_COL * ROW_H + 40; // +padding top/bottom of content
const H = HEADER_H + CONTENT_H + FOOTER_H;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ============ Background ============
// Vertical gradient body (subtle)
const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
bgGrad.addColorStop(0, BG);
bgGrad.addColorStop(0.5, BG_ALT);
bgGrad.addColorStop(1, BG);
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, W, H);

// Subtle radial glow upper-left (event vibe)
const glow = ctx.createRadialGradient(220, 80, 0, 220, 80, 700);
glow.addColorStop(0, 'rgba(255, 165, 42, 0.10)');
glow.addColorStop(1, 'rgba(255, 165, 42, 0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, HEADER_H + 100);

// Subtle radial glow lower-right
const glow2 = ctx.createRadialGradient(W - 100, H - 200, 0, W - 100, H - 200, 600);
glow2.addColorStop(0, 'rgba(209, 74, 15, 0.08)');
glow2.addColorStop(1, 'rgba(209, 74, 15, 0)');
ctx.fillStyle = glow2;
ctx.fillRect(0, 0, W, H);

// ============ Header ============
// Top eyebrow line
const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
lineGrad.addColorStop(0, ORANGE_DEEP);
lineGrad.addColorStop(0.5, ORANGE);
lineGrad.addColorStop(1, ORANGE_LIGHT);
ctx.fillStyle = lineGrad;
ctx.fillRect(0, 0, W, 4);

// Eyebrow text (centered, tracking)
ctx.fillStyle = ORANGE_LIGHT;
ctx.font = 'bold 18px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.fillText('R A N K I N G   2 0 2 6', W/2, 70);

// Decorative dots under eyebrow
ctx.fillStyle = ORANGE;
for (let i = -2; i <= 2; i++) {
  ctx.beginPath();
  ctx.arc(W/2 + i * 14, 108, 1.8, 0, Math.PI*2);
  ctx.fill();
}

// Title
ctx.fillStyle = INK_LIGHT;
ctx.font = 'bold 96px sans-serif';
ctx.fillText('TOP 50', W/2, 130);

// Subtitle
ctx.font = '300 38px sans-serif';
ctx.fillStyle = INK_LIGHT;
ctx.fillText('EMPRESAS  ·  SÃO PAULO', W/2, 232);

// Tagline
ctx.font = '15px sans-serif';
ctx.fillStyle = INK_DIM;
ctx.fillText('M A I O R E S   C O M P R A D O R E S   B 2 B   ·   3   A N O S', W/2, 290);

// Underline accent
const ulW = 160;
ctx.fillStyle = lineGrad;
ctx.fillRect(W/2 - ulW/2, 322, ulW, 3);

// ============ Helpers ============
ctx.textBaseline = 'top';
ctx.textAlign = 'left';

function trunc(text, maxWidth, font) {
  ctx.font = font;
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 0 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut + '…';
}

const norm = (s) => (s||'').replace(/\s*[-–]\s*$/, '').trim();

function formatPhone(p) {
  if (!p || p === '—') return '—';
  // keep visible spaces but compact
  return p.replace(/\s+/g,' ').trim();
}

// ============ Rows ============
const contentTop = HEADER_H + 20;
const colW = (W - PAD_X * 2 - 50) / 2; // 50px gap between cols
const col1X = PAD_X;
const col2X = PAD_X + colW + 50;

function drawRow(row, x, y, w) {
  // Hairline separator at bottom
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(x, y + ROW_H - 1, w, 1);

  // Rank — orange, big numeric
  const isTop3 = row.rank <= 3;
  ctx.fillStyle = isTop3 ? ORANGE_LIGHT : ORANGE;
  ctx.font = `bold ${isTop3 ? '34' : '28'}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(String(row.rank).padStart(2, '0'), x + 4, y + (isTop3 ? 12 : 14));

  // Vertical micro-divider after rank
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(x + 64, y + 14, 1, ROW_H - 28);

  // Empresa name
  ctx.fillStyle = INK_LIGHT;
  const empFont = 'bold 18px sans-serif';
  ctx.font = empFont;
  const empMax = w - 80;
  ctx.fillText(trunc(norm(row.empresa), empMax, empFont), x + 80, y + 9);

  // Decisor + phone (line 2)
  ctx.font = '14px sans-serif';
  ctx.fillStyle = INK_DIM;
  const dec = row.decisor_nome && row.decisor_nome !== '—' ? row.decisor_nome : '—';
  const phone = formatPhone(row.decisor_phone);
  const sep = '  ·  ';
  const line = `${dec}${sep}${phone}`;
  ctx.fillText(trunc(line, empMax, '14px sans-serif'), x + 80, y + 33);
}

// Draw 50 rows
for (let i = 0; i < 50; i++) {
  const row = data[i];
  const col = i < ROWS_PER_COL ? 0 : 1;
  const localIdx = i - col * ROWS_PER_COL;
  const x = col === 0 ? col1X : col2X;
  const y = contentTop + localIdx * ROW_H;
  drawRow(row, x, y, colW);
}

// Central vertical divider between columns
ctx.fillStyle = HAIRLINE;
ctx.fillRect(W/2, contentTop + 6, 1, CONTENT_H - 50);

// Tiny decorative bullet at divider top + bottom
ctx.fillStyle = ORANGE;
ctx.beginPath();
ctx.arc(W/2 + 0.5, contentTop + 4, 3, 0, Math.PI*2);
ctx.fill();
ctx.beginPath();
ctx.arc(W/2 + 0.5, contentTop + CONTENT_H - 46, 3, 0, Math.PI*2);
ctx.fill();

// ============ Footer ============
const footY = HEADER_H + CONTENT_H;

// Footer top hairline
ctx.fillStyle = HAIRLINE;
ctx.fillRect(PAD_X, footY + 12, W - PAD_X*2, 1);

ctx.textAlign = 'left';
ctx.fillStyle = INK_DIM;
ctx.font = '13px sans-serif';
ctx.fillText('R A N K I N G', PAD_X, footY + 34);
ctx.fillStyle = INK_LIGHT;
ctx.font = '500 15px sans-serif';
ctx.fillText('Por quantidade de deals fechados · desempate por receita', PAD_X, footY + 54);

ctx.textAlign = 'right';
ctx.fillStyle = INK_DIM;
ctx.font = '13px sans-serif';
ctx.fillText('P E R Í O D O', W - PAD_X, footY + 34);
ctx.fillStyle = INK_LIGHT;
ctx.font = '500 15px sans-serif';
ctx.fillText('Últimos 3 anos · 26 mai 2026', W - PAD_X, footY + 54);

// Bottom orange accent line
ctx.fillStyle = lineGrad;
ctx.fillRect(0, H - 4, W, 4);

// ============ Save ============
const out = canvas.encode('png');
out.then(buf => {
  fs.writeFileSync('top50_empresas_sp.png', buf);
  console.log('Saved top50_empresas_sp.png');
  console.log('Size:', W, 'x', H);
  console.log('KB:', Math.round(buf.length/1024));
});
