import type { HsSearchBody } from './hubspot';

// Sinal de inscrição confirmada no TBS 2026 (propriedade direta do HubSpot).
export const INSCRITO_FILTER = { propertyName: 'inscrito_tbs_2026', operator: 'EQ', value: 'Sim' };

// Etapas em ordem de funil. As contagens são CUMULATIVAS: cada etapa conta quem chegou nela OU além.
// "Análise IA pronta ou além" = quem REALMENTE teve a análise de IA concluída (ou já foi classificado).
// IMPORTANTE: "Pedir votos" foi REMOVIDO de propósito — esse status é atribuído automaticamente a TODOS
// que entram na plataforma, então não indica que a IA rodou. Incluí-lo inflava a contagem.
export const ANALISE_PLUS_STAGES = ['Análise IA pronta', 'Classificado', 'Não classificado'];
// "Vídeo enviado, antes da IA" (upload/troca, sem ter chegado na IA ainda).
export const UPLOAD_ONLY_STAGES = ['Upload vídeo concluído', 'Troca vídeo concluída'];
// Etapas que contam no card "Upload vídeo concluído" (definição explícita do usuário):
// qualquer etapa de upload em diante, incluindo "Pedir votos". NÃO inclui "Não classificado".
export const UPLOAD_CARD_STAGES = ['Análise IA pronta', 'Classificado', 'Pedir votos', 'Upload vídeo concluído', 'Troca vídeo concluída'];
// "Vídeo enviado ou além" (upload em diante, inclui IA+). Usado no funil cumulativo de upload.
export const VIDEO_PLUS_STAGES = [...UPLOAD_ONLY_STAGES, ...ANALISE_PLUS_STAGES];

// Piso de lançamento: conta só quem tem DATA DE INSCRIÇÃO >= 01/06/2026.
// Importante: é pela data de inscrição (tbs_2026__data_de_inscricao), NÃO pela createdate —
// senão a base antiga re-engajada (createdate de 2025) seria excluída mesmo se inscrevendo agora.
// Propriedade é tipo "date" → valor em epoch ms da meia-noite UTC.
export const REGISTRATION_DATE_PROP = 'tbs_2026__data_de_inscricao';
export const LAUNCH_FLOOR_MS = String(Date.UTC(2026, 5, 1)); // 2026-06-01 00:00 UTC
export const LAUNCH_FILTER = { propertyName: REGISTRATION_DATE_PROP, operator: 'GTE', value: LAUNCH_FLOOR_MS };

// Entrada REAL na plataforma 2026 (backoffice) — sinal fiel pra "participantes", melhor que tbs___etapa
// (que arrasta etapas de edições anteriores). Conta quem entrou na plataforma a partir de 01/06/2026.
export const PLATFORM_ENTRY_PROP = 'data_entrou_na_plataforma_tbs';
export const PLATFORM_ENTRY_FILTER = { propertyName: PLATFORM_ENTRY_PROP, operator: 'GTE', value: LAUNCH_FLOOR_MS };

// Exclui contatos de TESTE internos (domínio @profissionaissa) de todas as contagens.
export const TEST_EXCLUSION = { propertyName: 'email', operator: 'NOT_CONTAINS_TOKEN', value: 'profissionaissa' };

// Contas de teste avulsas (gmail/pessoais) que NÃO caem no domínio @profissionaissa, mas são
// validações internas (ex.: "Audren Teste 2", "Eduardo pj", staff). Exclusão pontual até a equipe
// limpar/mesclar no HubSpot. Quando houver a lista oficial do backoffice, esta some.
export const TEST_EMAILS = [
  'auniritter@gmail.com',                          // Audren Teste 2
  'eduardo.freitas.151185@gmail.com',              // Eduardo pj (teste)
  'eduardo.freitas.151185ultimavalidacao@gmail.com', // Eduardo última validação (teste)
  'bernardohaab@gmail.com',                        // Bernardo Haab (staff)
];
export const TEST_EMAIL_EXCLUSION = { propertyName: 'email', operator: 'NOT_IN', values: TEST_EMAILS };

// Conjunto completo de exclusões de teste — sempre espalhar (...) dentro de cada grupo de filtros.
export const TEST_FILTERS = [TEST_EXCLUSION, TEST_EMAIL_EXCLUSION];

export type FunnelStageKey =
  | 'inscricao_confirmada'
  | 'completou_cadastro'
  | 'upload_video_concluido'
  | 'analise_ia_pronto';

export type FunnelStageDef = {
  key: FunnelStageKey;
  label: string;
  description: string;
  // filterGroups são OR entre grupos, AND dentro de cada grupo (mesma semântica da Search API).
  filterGroups: HsSearchBody['filterGroups'];
};

// Atribui um contato à etapa MAIS PROFUNDA do funil que ele atingiu (mutuamente exclusivo).
// Usado na atividade diária pra empilhar sem duplicar contatos.
export function deepestStageOf(etapa: string | undefined, inscrito: boolean): FunnelStageKey | null {
  if (etapa && ANALISE_PLUS_STAGES.includes(etapa)) return 'analise_ia_pronto'; // IA pronta ou além
  if (etapa && UPLOAD_ONLY_STAGES.includes(etapa)) return 'upload_video_concluido'; // upload/troca, antes da IA
  if (etapa) return 'completou_cadastro';
  if (inscrito) return 'inscricao_confirmada';
  return null;
}

// Filtros mutuamente exclusivos (deepest) — usados pelo drill da atividade diária pra bater 1:1 com o gráfico.
export function deepestStageFilterGroups(key: FunnelStageKey): HsSearchBody['filterGroups'] {
  switch (key) {
    case 'analise_ia_pronto':
      return [{ filters: [{ propertyName: 'tbs___etapa', operator: 'IN', values: ANALISE_PLUS_STAGES }, LAUNCH_FILTER, ...TEST_FILTERS] }];
    case 'upload_video_concluido':
      return [{ filters: [{ propertyName: 'tbs___etapa', operator: 'IN', values: UPLOAD_ONLY_STAGES }, LAUNCH_FILTER, ...TEST_FILTERS] }];
    case 'completou_cadastro':
      return [{ filters: [{ propertyName: 'tbs___etapa', operator: 'HAS_PROPERTY' }, { propertyName: 'tbs___etapa', operator: 'NOT_IN', values: VIDEO_PLUS_STAGES }, LAUNCH_FILTER, ...TEST_FILTERS] }];
    case 'inscricao_confirmada':
      return [{ filters: [INSCRITO_FILTER, { propertyName: 'tbs___etapa', operator: 'NOT_HAS_PROPERTY' }, LAUNCH_FILTER, ...TEST_FILTERS] }];
  }
}

// Fonte única das 4 etapas do funil TBS 2026. Usada tanto pela contagem (lib/data.ts)
// quanto pelo drill (lib/drill.ts), garantindo que card e drill batam 1:1.
export function funnelStageDefs(): FunnelStageDef[] {
  return [
    {
      key: 'inscricao_confirmada',
      label: 'Inscrição confirmada',
      description: 'Inscrito TBS 2026 = Sim (data de inscrição a partir de 01/06/2026) · sem testes',
      filterGroups: [{ filters: [INSCRITO_FILTER, LAUNCH_FILTER, ...TEST_FILTERS] }],
    },
    {
      key: 'completou_cadastro',
      label: 'Entrou na plataforma',
      description: 'Data entrou na Plataforma TBS a partir de 01/06/2026 (fiel ao backoffice; exclui testes internos)',
      filterGroups: [{ filters: [PLATFORM_ENTRY_FILTER, ...TEST_FILTERS] }],
    },
    {
      key: 'upload_video_concluido',
      label: 'Upload vídeo concluído',
      description: 'TBS - Etapas: Análise IA pronta, Classificado, Pedir votos, Upload vídeo concluído ou Troca vídeo concluída + inscrito TBS 2026 = Sim · sem testes',
      filterGroups: [{ filters: [{ propertyName: 'tbs___etapa', operator: 'IN', values: UPLOAD_CARD_STAGES }, INSCRITO_FILTER, LAUNCH_FILTER, ...TEST_FILTERS] }],
    },
    {
      key: 'analise_ia_pronto',
      label: 'Análise de IA pronto',
      description: 'TBS - Etapas: Análise IA pronta ou além (inclui classificado e não classificado; "Pedir votos" NÃO conta) · sem testes',
      filterGroups: [{ filters: [{ propertyName: 'tbs___etapa', operator: 'IN', values: ANALISE_PLUS_STAGES }, LAUNCH_FILTER, ...TEST_FILTERS] }],
    },
  ];
}
