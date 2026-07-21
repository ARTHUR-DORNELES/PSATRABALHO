const fs = require('fs');
const CSV_PATH = "C:\\Users\\Usuário\\Downloads\\hubspot-whatsapp-recipients-list-2026-06-16.csv";
const DEALS_PATH = "C:\\Users\\Usuário\\Desktop\\Claude Code\\_deals_q.tsv";

function norm(p) {
  if (!p) return null;
  let d = String(p).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2); // strip BR country code
  if (d.length < 10) return null;
  return d.slice(0, 2) + d.slice(2).slice(-8); // DDD + last 8 (collapse 8/9-digit)
}

// Deals that ENTERED Qualificado 21/05-16/06 (any createdate/canal)
const dealBest = new Map();
for (let line of fs.readFileSync(DEALS_PATH, 'utf-8').split(/\r?\n/)) {
  line = line.trim();
  if (!line) continue;
  const m = line.match(/\b(\d{11})\b/);
  if (!m) continue;
  const phone = line.slice(m.index + m[0].length).trim();
  const key = norm(phone);
  if (!key) continue;
  const lost = line.includes('Perdido');
  if (!dealBest.has(key)) dealBest.set(key, { lost: true });
  if (!lost) dealBest.get(key).lost = false; // any non-Perdido => active/won
}

// CSV recipients
const recips = new Set();
for (const line of fs.readFileSync(CSV_PATH, 'utf-8').split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const mm = line.match(/"([^"]*)"\s*$/);
  if (!mm) continue;
  const k = norm(mm[1]);
  if (k) recips.add(k);
}

let matched = 0, active = 0, lostOnly = 0;
const hits = [];
for (const k of recips) {
  if (dealBest.has(k)) {
    matched++;
    if (dealBest.get(k).lost) lostOnly++; else active++;
    hits.push(k);
  }
}

console.log('CSV destinatarios (unicos):', recips.size);
console.log('Negocios que entraram em Qualificado 21/05-16/06 (telefones unicos):', dealBest.size);
console.log('========================================');
console.log('Destinatarios do b2b_nr1 que QUALIFICARAM apos o disparo:', matched);
console.log('   - ainda ativos / ganhos:', active);
console.log('   - qualificaram mas depois Perdido:', lostOnly);
console.log('========================================');
console.log('Taxa de qualificacao sobre 518 enviados:', (100*matched/518).toFixed(1) + '%');
console.log('Chaves que casaram:', hits.join(', '));
