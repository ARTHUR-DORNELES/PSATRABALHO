import fs from 'node:fs';

const REGIAO_MAP = {
  '1': 'sul',
  '2': 'suldeste',
  '3': 'norte',
  '4': 'nordeste',
  '5': 'centro_oeste',
};

const d = JSON.parse(fs.readFileSync(new URL('./_br.json', import.meta.url), 'utf-8'));

// Bounds
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
const traverse = (coords, cb) => {
  if (typeof coords[0] === 'number') { cb(coords); return; }
  for (const c of coords) traverse(c, cb);
};
for (const feat of d.features) {
  traverse(feat.geometry.coordinates, ([lon, lat]) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
}

// ViewBox 0 0 500 600 com aspect-ratio preservada
const VW = 500, VH = 600;
const lonRange = maxLon - minLon;
const latRange = maxLat - minLat;
// Ajustar pra latitude visualmente correta (~1.1 ratio em latitudes baixas)
const scaleLat = 1;
const sx = VW / lonRange;
const sy = (VH / latRange) * scaleLat;
const s = Math.min(sx, sy);
const ox = (VW - lonRange * s) / 2;
const oy = (VH - latRange * s) / 2;

const xy = ([lon, lat]) => [
  (lon - minLon) * s + ox,
  (maxLat - lat) * s + oy,
];

// Simplificação leve: pula pontos próximos (distância min em pixels)
const MIN_DIST = 0.6;
function simplifyRing(ring) {
  const out = [];
  let lastPx = null;
  for (const point of ring) {
    const pt = xy(point);
    if (lastPx === null) {
      out.push(pt);
      lastPx = pt;
      continue;
    }
    const dx = pt[0] - lastPx[0];
    const dy = pt[1] - lastPx[1];
    if (Math.sqrt(dx * dx + dy * dy) >= MIN_DIST) {
      out.push(pt);
      lastPx = pt;
    }
  }
  // Garantir que fecha
  if (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
  }
  return out;
}

function ringToSvgPath(ring) {
  const simplified = simplifyRing(ring);
  if (simplified.length < 3) return '';
  return simplified
    .map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1))
    .join(' ') + ' Z';
}

function multiPolygonToPath(coords) {
  // coords é array de polígonos. Cada polígono é array de rings (1 outer + 0..n holes).
  const parts = [];
  for (const poly of coords) {
    for (const ring of poly) {
      const p = ringToSvgPath(ring);
      if (p) parts.push(p);
    }
  }
  return parts.join(' ');
}

// Agrupar por estado
const states = {};
for (const feat of d.features) {
  const sigla = feat.properties.sigla;
  const regiao = REGIAO_MAP[feat.properties.regiao_id];
  const path = multiPolygonToPath(feat.geometry.coordinates);
  states[sigla] = { sigla, regiao, path };
}

// Output
const output = {
  viewBox: `0 0 ${VW} ${VH}`,
  states,
};

console.log('// AUTO-GERADO de _br.json — não editar manualmente');
console.log('// Coords: lat/lon convertidos pra viewBox', output.viewBox);
console.log('export const BRAZIL_VIEWBOX = "' + output.viewBox + '";');
console.log('export const BRAZIL_STATES: Record<string, { sigla: string; regiao: string; path: string }> = {');
for (const [sigla, info] of Object.entries(states)) {
  console.log(`  ${sigla}: { sigla: "${info.sigla}", regiao: "${info.regiao}", path: "${info.path}" },`);
}
console.log('};');
