// Registra UMA atualização do painel no changelog dinâmico (Redis). Rode a cada deploy:
//   node scripts/log-change.mjs <tipo> "<título>" ["<descrição>"] [YYYY-MM-DD] [HH:MM]
// tipo ∈ novo | melhoria | ajuste | correcao. Data/hora omitidas = agora (horário de Brasília).
import Redis from 'ioredis';
import fs from 'node:fs';

if (!process.env.REDIS_URL) {
  try {
    const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const m = env.match(/^REDIS_URL=(.+)$/m);
    if (m) process.env.REDIS_URL = m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* sem .env.local */ }
}
if (!process.env.REDIS_URL) { console.error('REDIS_URL não configurado.'); process.exit(1); }

const TIPOS = ['novo', 'melhoria', 'ajuste', 'correcao'];
const [, , tipo, titulo, desc, dateArg, timeArg] = process.argv;
if (!TIPOS.includes(tipo) || !titulo) {
  console.error('uso: node scripts/log-change.mjs <novo|melhoria|ajuste|correcao> "<título>" ["<desc>"] [YYYY-MM-DD] [HH:MM]');
  process.exit(1);
}
const now = new Date();
const date = dateArg || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const time = timeArg || new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(now);

const entry = { date, time, tipo, titulo, ...(desc ? { desc } : {}) };
const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, connectTimeout: 8000 });
await r.rpush('tbs:changelog', JSON.stringify(entry));
console.log('registrado:', JSON.stringify(entry));
await r.quit();
