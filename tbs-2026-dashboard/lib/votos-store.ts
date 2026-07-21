// Armazenamento dos 5 relatórios de VOTOS (importados via upload .xlsx) no Redis.
// Cada relatório é um valor JSON { importedAt, fileName, rows } sob a chave tbs:votos:<tipo>.
// Sem TTL — o dado fica até a próxima importação sobrescrever.
import { getClient, storageConfigured } from './registros-store';
import { VOTOS_ORDER, type VotoTipo, type VotoReport } from './votos';

const KEY = (t: VotoTipo) => `tbs:votos:${t}`;

export async function getVoto(t: VotoTipo): Promise<VotoReport | null> {
  if (!storageConfigured()) return null;
  const v = await getClient().get(KEY(t));
  return v ? (JSON.parse(v) as VotoReport) : null;
}

export async function putVoto(t: VotoTipo, r: VotoReport): Promise<void> {
  if (!storageConfigured()) return;
  await getClient().set(KEY(t), JSON.stringify(r));
}

export async function getAllVotos(): Promise<Record<VotoTipo, VotoReport | null>> {
  const out = {} as Record<VotoTipo, VotoReport | null>;
  if (!storageConfigured()) {
    for (const t of VOTOS_ORDER) out[t] = null;
    return out;
  }
  const vals = await getClient().mget(...VOTOS_ORDER.map(KEY));
  VOTOS_ORDER.forEach((t, i) => { out[t] = vals[i] ? (JSON.parse(vals[i] as string) as VotoReport) : null; });
  return out;
}
