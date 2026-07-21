// Render PESQUISA in 3 candidate fonts and compose a comparison image
// so we can pick the closest match to the original "NEWS".
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "fs";

GlobalFonts.registerFromPath("C:/Windows/Fonts/ariblk.ttf",   "ArialBlack");
GlobalFonts.registerFromPath("C:/Windows/Fonts/arialbd.ttf",  "ArialBold");
GlobalFonts.registerFromPath("C:/Windows/Fonts/impact.ttf",   "Impact");

const orig = await loadImage("psa-news-original.png");
const W = orig.width, H = orig.height;

// We'll stack: row 0 = original (for reference), rows 1..3 = candidates.
// Label each row on a 90px-wide left gutter.
const rowH = H, labelW = 110, totalW = W + labelW, totalH = rowH * 4;

const canvas = createCanvas(totalW, totalH);
const ctx = canvas.getContext("2d");

// Light grey background for the gutter
ctx.fillStyle = "#eeeeee";
ctx.fillRect(0, 0, totalW, totalH);

function drawRow(rowIdx, label, fontFamily, fontWeight) {
  const y0 = rowIdx * rowH;
  // label on the left
  ctx.fillStyle = "#111";
  ctx.font = `700 13px ArialBold`;
  ctx.textBaseline = "middle";
  ctx.fillText(label, 8, y0 + rowH / 2);

  // draw original image as base
  ctx.drawImage(orig, labelW, y0);

  if (rowIdx === 0) return; // first row is just the original, untouched

  // cover the NEWS bbox
  const NEWS_X = labelW + 96, NEWS_Y = y0 + 30, NEWS_W = 35, NEWS_H = 19;
  ctx.fillStyle = "#ff6400";
  ctx.fillRect(NEWS_X, NEWS_Y, NEWS_W, NEWS_H);

  // draw PESQUISA at the same baseline (y=47 within the row)
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontWeight} 17.5px ${fontFamily}`;
  ctx.fillText("PESQUISA", labelW + 97, y0 + 47);
}

drawRow(0, "ORIGINAL",     null,         null);
drawRow(1, "Arial Black",  "ArialBlack", 900);
drawRow(2, "Arial Bold",   "ArialBold",  700);
drawRow(3, "Impact",       "Impact",     400);

writeFileSync("font-comparison.png", canvas.toBuffer("image/png"));
console.log(`Wrote font-comparison.png (${totalW}x${totalH})`);
