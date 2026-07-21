// Mapeamento de regiões TBS — usado pela contagem (lib/data.ts) e pelo drill (lib/drill.ts),
// garantindo que o card do mapa e o drill batam 1:1.
// Regra: usa regiao_tbs quando preenchido; senão deriva da UF (estado_tbs).

export type RegionKey = 'norte' | 'nordeste' | 'centro_oeste' | 'suldeste' | 'sul';

// Valor canônico no HubSpot (atenção ao typo oficial "Suldeste" para Sudeste).
export const REGION_HUBSPOT_VALUE: Record<RegionKey, string> = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  centro_oeste: 'Centro-Oeste',
  suldeste: 'Suldeste',
  sul: 'Sul',
};

export const REGION_LABEL: Record<RegionKey, string> = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  centro_oeste: 'Centro-Oeste',
  suldeste: 'Sudeste',
  sul: 'Sul',
};

export const REGION_KEYS: RegionKey[] = ['norte', 'nordeste', 'centro_oeste', 'suldeste', 'sul'];

const REGIAO_VALUE_TO_KEY: Record<string, RegionKey> = {
  norte: 'norte',
  nordeste: 'nordeste',
  'centro-oeste': 'centro_oeste',
  'centro oeste': 'centro_oeste',
  suldeste: 'suldeste',
  sudeste: 'suldeste',
  sul: 'sul',
};

// UF (sigla) → região
export const UF_TO_REGION: Record<string, RegionKey> = {
  AC: 'norte', AM: 'norte', AP: 'norte', PA: 'norte', RO: 'norte', RR: 'norte', TO: 'norte',
  AL: 'nordeste', BA: 'nordeste', CE: 'nordeste', MA: 'nordeste', PB: 'nordeste', PE: 'nordeste', PI: 'nordeste', RN: 'nordeste', SE: 'nordeste',
  DF: 'centro_oeste', GO: 'centro_oeste', MT: 'centro_oeste', MS: 'centro_oeste',
  ES: 'suldeste', MG: 'suldeste', RJ: 'suldeste', SP: 'suldeste',
  PR: 'sul', RS: 'sul', SC: 'sul',
};

// UFs de cada região (para o drill: estado_tbs IN [...])
export const UFS_BY_REGION: Record<RegionKey, string[]> = (() => {
  const out: Record<RegionKey, string[]> = { norte: [], nordeste: [], centro_oeste: [], suldeste: [], sul: [] };
  for (const [uf, key] of Object.entries(UF_TO_REGION)) out[key].push(uf);
  return out;
})();

// Campo de estado REAL do formulário de inscrição (dropdown obrigatório). É o confiável.
// `estado_tbs` é legado (poucos preenchidos) e `regiao` está bugado (default "Sul") — não usar `regiao`.
export const ESTADO_FORM_PROP = 'estado__menu_suspenso_';

// Resolve a região de um contato: prioriza regiao_tbs; senão deriva da UF.
// ufCandidates em ordem de prioridade (estado do form primeiro).
export function regionOf(regiaoTbs?: string, ...ufCandidates: (string | undefined)[]): RegionKey | null {
  const r = regiaoTbs?.trim().toLowerCase();
  if (r && REGIAO_VALUE_TO_KEY[r]) return REGIAO_VALUE_TO_KEY[r];
  for (const cand of ufCandidates) {
    const uf = cand?.trim().toUpperCase();
    if (uf && UF_TO_REGION[uf]) return UF_TO_REGION[uf];
  }
  return null;
}
