// Round 2: also test REGULAR weights + render the top candidates' "NEWS" overlay vs original.
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "fs";

const orig = await loadImage("psa-news-original.png");
const cropX = 95, cropY = 30, cropW = 38, cropH = 20;

const refCanvas = createCanvas(cropW, cropH);
refCanvas.getContext("2d").drawImage(orig, -cropX, -cropY);
const refData = refCanvas.getContext("2d").getImageData(0, 0, cropW, cropH).data;
const refMask = new Uint8Array(cropW * cropH);
for (let i = 0; i < cropW * cropH; i++) {
  const r = refData[i*4], g = refData[i*4+1], b = refData[i*4+2];
  refMask[i] = ((r + g + b) / 3) < 110 ? 1 : 0;
}

const candidates = [
  // Heavy/Black
  { name: "ArialBlack",     path: "C:/Windows/Fonts/ariblk.ttf",      weight: 900 },
  { name: "SegoeBlack",     path: "C:/Windows/Fonts/seguibl.ttf",     weight: 900 },
  { name: "Impact",         path: "C:/Windows/Fonts/impact.ttf",      weight: 400 },
  // Bold
  { name: "ArialBold",      path: "C:/Windows/Fonts/arialbd.ttf",     weight: 700 },
  { name: "TahomaBold",     path: "C:/Windows/Fonts/tahomabd.ttf",    weight: 700 },
  { name: "VerdanaBold",    path: "C:/Windows/Fonts/verdanab.ttf",    weight: 700 },
  { name: "Bahnschrift",    path: "C:/Windows/Fonts/bahnschrift.ttf", weight: 700 },
  // Regular
  { name: "Arial",          path: "C:/Windows/Fonts/arial.ttf",       weight: 400 },
  { name: "Calibri",        path: "C:/Windows/Fonts/calibri.ttf",     weight: 400 },
  { name: "Tahoma",         path: "C:/Windows/Fonts/tahoma.ttf",      weight: 400 },
  { name: "Verdana",        path: "C:/Windows/Fonts/verdana.ttf",     weight: 400 },
  { name: "Segoe",          path: "C:/Windows/Fonts/segoeui.ttf",     weight: 400 },
];
for (const c of candidates) GlobalFonts.registerFromPath(c.path, c.name);

function renderMaskAt(font, weight, size) {
  const cw = 80, ch = cropH + 8;
  const c = createCanvas(cw, ch);
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, cw, ch);
  x.fillStyle = "#000000";
  x.textBaseline = "alphabetic";
  x.font = `${weight} ${size}px ${font}`;
  x.fillText("NEWS", 2, ch - 4);
  const d = x.getImageData(0, 0, cw, ch).data;
  const m = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) {
    const r = d[i*4], g = d[i*4+1], b = d[i*4+2];
    m[i] = ((r + g + b) / 3) < 110 ? 1 : 0;
  }
  return { mask: m, w: cw, h: ch };
}
function iouShifted(refMask, refW, refH, cm, cw, ch, dx, dy) {
  let inter=0, union=0;
  for (let y=0; y<refH; y++) for (let x=0; x<refW; x++) {
    const r = refMask[y*refW+x];
    const cx=x-dx, cy=y-dy;
    let c=0;
    if (cx>=0 && cx<cw && cy>=0 && cy<ch) c = cm[cy*cw+cx];
    if (r||c) union++;
    if (r&&c) inter++;
  }
  return union===0?0:inter/union;
}

const results = [];
for (const cand of candidates) {
  let best = { iou: 0, size: 0, dx: 0, dy: 0 };
  for (let size = 13; size <= 24; size += 0.5) {
    const r = renderMaskAt(cand.name, cand.weight, size);
    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = -10; dx <= 20; dx++) {
        const iou = iouShifted(refMask, cropW, cropH, r.mask, r.w, r.h, dx, dy);
        if (iou > best.iou) best = { iou, size, dx, dy };
      }
    }
  }
  results.push({ ...cand, ...best });
}
results.sort((a,b) => b.iou - a.iou);
console.log("Ranked by IoU (higher = closer match to original NEWS):");
results.forEach((r,i) => console.log(`  ${i+1}. ${r.name.padEnd(16)} weight=${r.weight}  IoU=${r.iou.toFixed(3)}  size=${r.size}px  off=(${r.dx},${r.dy})`));

// --- Build a visual overlay sheet: top 5 candidates rendered side by side ---
const top = results.slice(0, 6);
const tileW = cropW + 8, tileH = cropH * 3 + 16; // 3 rows: original | candidate | difference
const cols = top.length;
const totalW = tileW * cols + 10;
const totalH = tileH + 30;

const out = createCanvas(totalW, totalH);
const o = out.getContext("2d");
o.fillStyle = "#eeeeee"; o.fillRect(0, 0, totalW, totalH);

for (let i = 0; i < top.length; i++) {
  const cand = top[i];
  const x0 = i * tileW + 5;
  // header label
  o.fillStyle = "#111";
  o.font = "700 10px Arial";
  o.fillText(`${cand.name} ${cand.size}px`, x0, 10);
  o.fillText(`IoU ${cand.iou.toFixed(3)}`, x0, 22);

  // Row 1: original NEWS crop
  o.drawImage(orig, cropX, cropY, cropW, cropH, x0, 30, cropW, cropH);

  // Row 2: candidate render with applied offset, on orange background
  const yRow2 = 30 + cropH + 4;
  o.fillStyle = "#ff6400"; o.fillRect(x0, yRow2, cropW, cropH);
  o.fillStyle = "#000000";
  o.textBaseline = "alphabetic";
  o.font = `${cand.weight} ${cand.size}px ${cand.name}`;
  // The optimal offset says: candidate-mask was rendered at (2, ch-4) in an 80x28 canvas.
  // To overlay on the cropW×cropH grid, we apply dx,dy: drawPosition = (2+dx, (ch-4)+dy)
  // Translated to the tile: x = x0 + 2 + cand.dx, baseline y = yRow2 + (cropH+8 - 4) + cand.dy = yRow2 + cropH + 4 + cand.dy
  o.fillText("NEWS", x0 + 2 + cand.dx, yRow2 + cropH + 4 + cand.dy);

  // Row 3: diff visualisation (XOR) — render mask on white BG to compare
  const yRow3 = yRow2 + cropH + 4;
  const cm = renderMaskAt(cand.name, cand.weight, cand.size);
  // build diff: ref=1 cand=0 → red, ref=0 cand=1 → blue, both → black
  const diffCanvas = createCanvas(cropW, cropH);
  const dx = diffCanvas.getContext("2d");
  const imgData = dx.createImageData(cropW, cropH);
  for (let y = 0; y < cropH; y++) for (let xpx = 0; xpx < cropW; xpx++) {
    const r = refMask[y*cropW+xpx];
    const cxp = xpx - cand.dx, cyp = y - cand.dy;
    let c = 0;
    if (cxp >= 0 && cxp < cm.w && cyp >= 0 && cyp < cm.h) c = cm.mask[cyp*cm.w + cxp];
    const idx = (y*cropW+xpx)*4;
    if (r && c)      { imgData.data[idx]=0;   imgData.data[idx+1]=0;   imgData.data[idx+2]=0;   }
    else if (r && !c){ imgData.data[idx]=220; imgData.data[idx+1]=0;   imgData.data[idx+2]=0;   } // missed
    else if (!r && c){ imgData.data[idx]=0;   imgData.data[idx+1]=100; imgData.data[idx+2]=220; } // extra
    else             { imgData.data[idx]=255; imgData.data[idx+1]=255; imgData.data[idx+2]=255; }
    imgData.data[idx+3] = 255;
  }
  dx.putImageData(imgData, 0, 0);
  o.drawImage(diffCanvas, x0, yRow3);
}

writeFileSync("font-overlay-comparison.png", out.toBuffer("image/png"));
console.log(`\nWrote font-overlay-comparison.png (${totalW}x${totalH})`);
console.log(`  Row 1 = original NEWS  |  Row 2 = candidate render  |  Row 3 = diff (red=missed by font, blue=extra ink)`);
