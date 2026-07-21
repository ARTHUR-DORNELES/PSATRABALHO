// Armazenamento das OCORRÊNCIAS do TBS (calendário editável) em Redis, via TCP (ioredis).
// Usa um HASH (campo = id) pra escrita/edição/exclusão atômicas por item, evitando corrida
// quando várias pessoas relatam ao mesmo tempo.
//
// Variável de ambiente (injetada pelo store Redis conectado na Vercel): REDIS_URL
import Redis from 'ioredis';

const KEY = 'tbs:ocorrencias';

export type Status = 'aberto' | 'andamento' | 'resolvido';
export type Ocorrencia = {
  id: string;
  criadoEm: string; // ISO
  atualizadoEm?: string; // ISO
  data: string; // YYYY-MM-DD — dia da ocorrência (o que aparece no calendário)
  titulo: string;
  descricao: string;
  areaOrigem: string; // quem está fazendo / de onde veio
  areaResponsavel: string; // quem é responsável por resolver
  relator: string; // nome de quem relatou
  status: Status;
};

export function storageConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

// Cliente singleton (reusa a conexão entre invocações quentes do serverless).
let client: Redis | null = null;
export function getClient(): Redis {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL não configurado.');
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, connectTimeout: 8000 });
    client.on('error', (e) => console.error('[redis] erro:', e instanceof Error ? e.message : e));
  }
  return client;
}

export async function listOcorrencias(): Promise<Ocorrencia[]> {
  const map = await getClient().hgetall(KEY); // { id: json, ... }
  const out: Ocorrencia[] = [];
  for (const v of Object.values(map)) {
    try { out.push(JSON.parse(v) as Ocorrencia); } catch { /* ignora item corrompido */ }
  }
  // mais recente primeiro (pela data da ocorrência, desempata pela criação)
  return out.sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm));
}

export async function getOcorrencia(id: string): Promise<Ocorrencia | null> {
  const v = await getClient().hget(KEY, id);
  return v ? (JSON.parse(v) as Ocorrencia) : null;
}

export async function putOcorrencia(o: Ocorrencia): Promise<void> {
  await getClient().hset(KEY, o.id, JSON.stringify(o));
}

export async function delOcorrencia(id: string): Promise<void> {
  await getClient().hdel(KEY, id);
}

// ── Snapshot do dashboard compartilhado (Redis) — todas as instâncias da Vercel leem o mesmo,
// então o "Atualizar" reflete globalmente e some a defasagem por instância. ──
const SNAP_KEY = 'tbs:snapshot';
export async function getSnapshotCache(): Promise<{ data: unknown; ts: number } | null> {
  if (!storageConfigured()) return null;
  const v = await getClient().get(SNAP_KEY);
  return v ? (JSON.parse(v) as { data: unknown; ts: number }) : null;
}
export async function setSnapshotCache(payload: string): Promise<void> {
  if (!storageConfigured()) return;
  // SEM expiração: a chave é sempre sobrescrita pelo refresh em background. Se expirasse (era EX 1800),
  // a próxima carga teria que reconstruir de forma SÍNCRONA (45s+) e estourava o maxDuration da Vercel →
  // o dashboard caía. Persistir o último snapshot bom é sempre melhor que sumir com ele.
  await getClient().set(SNAP_KEY, payload);
}
