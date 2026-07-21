// Replace "NEWS" with "PESQUISA" in psa-news-original.png
// Keeps the rest of the image pixel-identical (PSA, dot, decorative elements all untouched).
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "fs";

// Identified via pixel-matching (see identify-font-v2.mjs): the "NEWS" in the
// original is Impact at ~15.5px — IoU 0.586 vs 0.516 for the next best fit.
GlobalFonts.registerFromPath("C:/Windows/Fonts/impact.ttf", "Impact");

const img = await loadImage("psa-news-original.png");
const W = img.width, H = img.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// 1. Draw the original image as-is
ctx.drawImage(img, 0, 0);

// 2. Cover the "NEWS" text rectangle with the exact background orange (#ff6400)
//    Original NEWS bbox: x=97..128, y=32..47. Add 1-2px padding to be safe — but
//    not too much, to avoid touching the "." (which ends at x=94) on the left,
//    or any of the decorative elements far to the right.
const NEWS_X = 96, NEWS_Y = 30, NEWS_W = 35, NEWS_H = 19;
ctx.fillStyle = "#ff6400";
ctx.fillRect(NEWS_X, NEWS_Y, NEWS_W, NEWS_H);

// 3. Render "PESQUISA" in the same style and baseline as the original NEWS.
//    Original NEWS baseline at y=47. Impact is a condensed display face — 15.5px
//    is the size that pixel-matched the original best.
ctx.fillStyle = "#000000";
ctx.textBaseline = "alphabetic";
ctx.font = "400 15.5px Impact";

const baselineY = 47;
const startX = 97; // same starting x as the original NEWS
ctx.fillText("PESQUISA", startX, baselineY);

// 4. Save result
const out = canvas.toBuffer("image/png");
writeFileSync("psa-pesquisa.png", out);
console.log(`Wrote psa-pesquisa.png (${out.length} bytes, ${W}x${H})`);

// Also report measured width of new text for sanity
const m = ctx.measureText("PESQUISA");
console.log(`PESQUISA measured width: ${m.width.toFixed(1)}px (starts at x=${startX})`);
