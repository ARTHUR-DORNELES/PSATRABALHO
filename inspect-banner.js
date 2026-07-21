// Inspect the PSA.NEWS banner: sample bg color and find text bounding boxes
import { Jimp } from "jimp";

const img = await Jimp.read("psa-news-original.png");
console.log(`Dimensions: ${img.bitmap.width} x ${img.bitmap.height}`);

// Sample background color from corner
const bg = img.getPixelColor(2, 2);
const bgR = (bg >> 24) & 0xff;
const bgG = (bg >> 16) & 0xff;
const bgB = (bg >>  8) & 0xff;
console.log(`Background (top-left): rgb(${bgR}, ${bgG}, ${bgB}) -> #${bgR.toString(16).padStart(2,'0')}${bgG.toString(16).padStart(2,'0')}${bgB.toString(16).padStart(2,'0')}`);

// Scan: classify each pixel as "blue text" if it differs strongly from orange bg.
// Then per column, count blue pixels. Print columns with blue presence in left half (where PSA.NEWS sits).
const W = img.bitmap.width;
const H = img.bitmap.height;

function isText(c){
  const r = (c >> 24) & 0xff;
  const g = (c >> 16) & 0xff;
  const b = (c >>  8) & 0xff;
  // text is dark blue, bg is bright orange — text has high B and low R
  return b > 80 && r < 120;
}

let cols = [];
for (let x = 0; x < W; x++) {
  let count = 0;
  for (let y = 0; y < H; y++) {
    if (isText(img.getPixelColor(x, y))) count++;
  }
  cols.push(count);
}

// Find blocks of consecutive text-bearing columns in the left half (x < 250)
let blocks = [];
let inBlock = false, start = 0;
for (let x = 0; x < 250; x++) {
  const hasText = cols[x] > 2;
  if (hasText && !inBlock) { inBlock = true; start = x; }
  else if (!hasText && inBlock) {
    inBlock = false;
    if (x - start >= 2) blocks.push([start, x - 1]);
  }
}
if (inBlock) blocks.push([start, 249]);

console.log("Text column-blocks in left 250px (start, end, width):");
blocks.forEach(([s, e]) => console.log(`  x=${s}..${e}  (w=${e - s + 1})  text-pixel-count peak ≈ ${Math.max(...cols.slice(s, e+1))}`));

// Sample a text-color pixel from the densest column in block #1 (assumed PSA)
if (blocks.length > 0) {
  const [s, e] = blocks[0];
  let bestX = s, bestCount = 0;
  for (let x = s; x <= e; x++) if (cols[x] > bestCount) { bestCount = cols[x]; bestX = x; }
  // walk vertically and grab the first text pixel
  for (let y = 0; y < H; y++) {
    const c = img.getPixelColor(bestX, y);
    if (isText(c)) {
      const r = (c >> 24) & 0xff;
      const g = (c >> 16) & 0xff;
      const b = (c >>  8) & 0xff;
      console.log(`Text color sample at (${bestX},${y}): rgb(${r}, ${g}, ${b}) -> #${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
      break;
    }
  }
}

// Vertical bounds of text in left 250px: find first/last rows with any blue
let topY = H, botY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < 250; x++) {
    if (isText(img.getPixelColor(x, y))) { if (y < topY) topY = y; if (y > botY) botY = y; break; }
  }
}
console.log(`Text vertical bounds (left 250px): y=${topY}..${botY}  (h=${botY - topY + 1})`);
