// Metadados dos 5 relatórios de VOTOS do TBS (exportados pelo backoffice da plataforma).
// Compartilhado entre a API (mapeia cabeçalho do .xlsx → chave canônica) e o componente (rótulos/colunas).
// Importante: só "dia" (Votos por dia) tem dimensão de data; os demais são totais agregados (snapshot da exportação).

export type VotoTipo = 'dia' | 'etapa' | 'estado' | 'participante' | 'participantes';
export const VOTOS_ORDER: VotoTipo[] = ['dia', 'etapa', 'estado', 'participante', 'participantes'];

export type VotoCol = { key: string; header: string; type: 'string' | 'number' };
export type VotoMetaItem = {
  label: string;
  sub: string;
  arquivo: string; // nome esperado do arquivo (orientação ao usuário)
  temData: boolean; // se o relatório tem dimensão de data (filtrável por período)
  cols: VotoCol[]; // primeira col é a "chave" — usada pra validar se o arquivo bate
};

export const VOTOS_META: Record<VotoTipo, VotoMetaItem> = {
  dia: {
    label: 'Votos por período',
    sub: 'votos por dia · filtrável por data',
    arquivo: 'votos_por_day_2026.xlsx',
    temData: true,
    cols: [
      { key: 'dia', header: 'Dia', type: 'string' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'unicos', header: 'Total Únicos', type: 'number' },
      { key: 'torcida', header: 'Total Torcida', type: 'number' },
    ],
  },
  etapa: {
    label: 'Votos por etapa',
    sub: 'totais por etapa da votação',
    arquivo: 'votos_por_etapa_2026.xlsx',
    temData: false,
    cols: [
      { key: 'etapa', header: 'Etapa', type: 'string' },
      { key: 'agendamento', header: 'Agendamento', type: 'string' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'unicos', header: 'Total Únicos', type: 'number' },
      { key: 'torcida', header: 'Total Torcida', type: 'number' },
    ],
  },
  estado: {
    label: 'Votos por estado',
    sub: 'totais por UF',
    arquivo: 'votos_por_estado_2026.xlsx',
    temData: false,
    cols: [
      { key: 'estado', header: 'Estado', type: 'string' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'unicos', header: 'Total Únicos', type: 'number' },
      { key: 'torcida', header: 'Total Torcida', type: 'number' },
    ],
  },
  participante: {
    label: 'Votos por participante (ranking)',
    sub: 'ranking de votos por participante',
    arquivo: 'votos_por_participante_2026.xlsx',
    temData: false,
    cols: [
      { key: 'participante', header: 'Participante', type: 'string' },
      { key: 'estado', header: 'Estado', type: 'string' },
      { key: 'total', header: 'Total', type: 'number' },
      { key: 'unicos', header: 'Total Únicos', type: 'number' },
      { key: 'torcida', header: 'Total Torcida', type: 'number' },
    ],
  },
  participantes: {
    label: 'Lista de participantes (inscritos)',
    sub: 'inscritos na votação · vídeo e região',
    arquivo: 'participantes_2026.xlsx',
    temData: false,
    cols: [
      { key: 'nome', header: 'Nome', type: 'string' },
      { key: 'sobrenome', header: 'Sobrenome', type: 'string' },
      { key: 'email', header: 'Email', type: 'string' },
      { key: 'cidade', header: 'Cidade', type: 'string' },
      { key: 'estado', header: 'Estado', type: 'string' },
      { key: 'regiao', header: 'Região', type: 'string' },
      { key: 'statusVideo', header: 'Status do vídeo', type: 'string' },
      { key: 'temVideo', header: 'Tem vídeo', type: 'string' },
    ],
  },
};

// Normaliza cabeçalho/valor pra casar sem depender de acento/caixa.
export function normHeader(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export type VotoRow = Record<string, string | number>;
export type VotoReport = { importedAt: string; fileName?: string; rows: VotoRow[] };
