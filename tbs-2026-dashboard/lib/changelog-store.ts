// Changelog DINÂMICO do painel (Redis) — entradas novas adicionadas a cada deploy/atualização,
// sem precisar editar código. Mesclado com o seed estático (lib/changelog.ts) na aba Registros.
// Lista Redis tbs:changelog (uma entrada JSON por item).
import { getClient, storageConfigured } from './registros-store';
import type { ChangelogEntry } from './changelog';

const KEY = 'tbs:changelog';

export async function listChangelogDinamico(): Promise<ChangelogEntry[]> {
  if (!storageConfigured()) return [];
  const arr = await getClient().lrange(KEY, 0, -1);
  const out: ChangelogEntry[] = [];
  for (const s of arr) { try { out.push(JSON.parse(s) as ChangelogEntry); } catch { /* item corrompido */ } }
  return out;
}

export async function appendChangelog(e: ChangelogEntry): Promise<void> {
  if (!storageConfigured()) return;
  await getClient().rpush(KEY, JSON.stringify(e));
}
