// Identify which font matches the original "NEWS" text best.
// Method:
//   1. Extract the "NEWS" bbox from psa-news-original.png as a binary mask
//      (foreground = dark text pixel, background = orange).
//   2. For each candidate font, render "NEWS" at various sizes (16..20px) and
//      micro-adjust horizontal/vertical offset to maximise overlap with the
//      original mask. Score = (intersection) / (union) of foreground pixels.
//   3. Print ranked results.
//
// The winner is the font I'll commit to for "PESQUISA".

import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

// --- Step 1: extract NEWS mask from original ---
const orig = await loadImage("psa-news-original.png");
const W = orig.width, H = orig.height;
const cropX = 95, cropY = 30, cropW = 38, cropH = 20;

const refCanvas = createCanvas(cropW, cropH);
const refCtx = refCanvas.getContext("2d");
refCtx.drawImage(orig, -cropX, -cropY);
const refData = refCtx.getImageData(0, 0, cropW, cropH).data;

// Binarise: dark pixel = 1, orange bg = 0
const refMask = new Uint8Array(cropW * cropH);
for (let i = 0; i < cropW * cropH; i++) {
  const r = refData[i*4], g = refData[i*4+1], b = refData[i*4+2];
  const brightness = (r + g + b) / 3;
  refMask[i] = brightness < 110 ? 1 : 0;
}
const refFG = refMask.reduce((s,v) => s+v, 0);
console.log(`Reference NEWS mask: ${cropW}x${cropH}, fg pixels = ${refFG}`);

// --- Step 2: register candidate fonts ---
const candidates = [
  { name: "ArialBold",    path: "C:/Windows/Fonts/arialbd.ttf",      weight: 700 },
  { name: "ArialBlack",   path: "C:/Windows/Fonts/ariblk.ttf",       weight: 900 },
  { name: "Impact",       path: "C:/Windows/Fonts/impact.ttf",       weight: 400 },
  { name: "Bahnschrift",  path: "C:/Windows/Fonts/bahnschrift.ttf",  weight: 700 },
  { name: "CalibriBold",  path: "C:/Windows/Fonts/calibrib.ttf",     weight: 700 },
  { name: "VerdanaBold",  path: "C:/Windows/Fonts/verdanab.ttf",     weight: 700 },
  { name: "TahomaBold",   path: "C:/Windows/Fonts/tahomabd.ttf",     weight: 700 },
  { name: "TrebuchetBold",path: "C:/Windows/Fonts/trebucbd.ttf",     weight: 700 },
  { name: "SegoeBlack",   path: "C:/Windows/Fonts/seguibl.ttf",      weight: 900 },
  { name: "SegoeSemibold",path: "C:/Windows/Fonts/seguisb.ttf",      weight: 600 },
];
for (const c of candidates) GlobalFonts.registerFromPath(c.path, c.name);

// --- Step 3: for each candidate, search size & offset for best IoU ---
function renderMaskAt(font, weight, size) {
  // Render NEWS in a wide canvas, return binarised mask + measured width.
  const cw = 80, ch = cropH + 8; // extra margin for descenders/ascenders
  const c = createCanvas(cw, ch);
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, cw, ch);
  x.fillStyle = "#000000";
  x.textBaseline = "alphabetic";
  x.font = `${weight} ${size}px ${font}`;
  // Draw with baseline near bottom of canvas
  x.fillText("NEWS", 2, ch - 4);
  const d = x.getImageData(0, 0, cw, ch).data;
  const m = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) {
    const r = d[i*4], g = d[i*4+1], b = d[i*4+2];
    m[i] = ((r + g + b) / 3) < 110 ? 1 : 0;
  }
  return { mask: m, w: cw, h: ch };
}

function iouShifted(refMask, refW, refH, candMask, candW, candH, dx, dy) {
  // Compare refMask with candMask shifted by (dx, dy) when overlaid on refMask grid
  let inter = 0, union = 0;
  for (let y = 0; y < refH; y++) {
    for (let x = 0; x < refW; x++) {
      const r = refMask[y * refW + x];
      const cx = x - dx, cy = y - dy;
      let c = 0;
      if (cx >= 0 && cx < candW && cy >= 0 && cy < candH) c = candMask[cy * candW + cx];
      if (r || c) union++;
      if (r && c) inter++;
    }
  }
  return union === 0 ? 0 : inter / union;
}

const results = [];
for (const cand of candidates) {
  let best = { iou: 0, size: 0, dx: 0, dy: 0 };
  for (let size = 14; size <= 22; size += 0.5) {
    const r = renderMaskAt(cand.name, cand.weight, size);
    // search for best alignment offset
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -10; dx <= 20; dx++) {
        const iou = iouShifted(refMask, cropW, cropH, r.mask, r.w, r.h, dx, dy);
        if (iou > best.iou) best = { iou, size, dx, dy };
      }
    }
  }
  results.push({ font: cand.name, ...best });
  console.log(`${cand.name.padEnd(16)} IoU=${best.iou.toFixed(3)}  size=${best.size}px  offset=(${best.dx},${best.dy})`);
}

results.sort((a,b) => b.iou - a.iou);
console.log("\n=== Ranked by IoU (higher = better match) ===");
results.forEach((r,i) => console.log(`  ${i+1}. ${r.font.padEnd(16)} IoU=${r.iou.toFixed(3)}  @${r.size}px`));
console.log(`\nWINNER: ${results[0].font} at ${results[0].size}px`);
