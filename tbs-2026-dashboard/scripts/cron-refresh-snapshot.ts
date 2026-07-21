// CLI: npx tsx scripts/cron-refresh-snapshot.ts
// Reconstrói o snapshot ao vivo FORA da Vercel (sem o teto de maxDuration=60s do plano Hobby) e grava
// direto no MESMO Redis (tbs:snapshot) que a produção lê — ver lib/data.ts invalidateAndFetch()/registros-store.ts.
// Chamado por uma tarefa agendada (a cada poucos minutos) como rede de segurança: garante que o dado nunca
// fique stale por horas, mesmo se o refresh automático via página (que RODA dentro do limite de 60s da Vercel)
// falhar por timeout conforme a base de inscritos cresce.
//
// IMPORTANTE: NÃO nomeie a variável do require('react') como `React` — um `const React = ...` no topo de um
// arquivo sem import/export vira global no TypeScript e quebra o namespace ambiente `React` do projeto inteiro
// ("Cannot find namespace 'React'" em arquivos não relacionados). Use outro nome (reactPkg).
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envRaw = fs.readFileSync(envPath, 'utf8');
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = v;
}

const reactPkg = require('react');
if (typeof reactPkg.cache !== 'function') reactPkg.cache = (fn: unknown) => fn;

import('../lib/data').then(async (mod) => {
  const start = Date.now();
  try {
    const data = await mod.invalidateAndFetch();
    console.log(`[cron-refresh] OK em ${Math.round((Date.now() - start) / 1000)}s · generatedAt ${data.generatedAt}`);
  } catch (e) {
    console.error(`[cron-refresh] FALHOU em ${Math.round((Date.now() - start) / 1000)}s:`, e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
});
