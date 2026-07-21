// Mesclar mais referências que isso numa única geração tende a diluir o
// estilo (e aproxima do limite de tamanho de request da API do Gemini).
export const MAX_MERGE_REFERENCES = 6;

export const MAX_REFERENCE_IMAGES = 30;

// Variações do logo da marca (fundo escuro, fundo claro, só ícone…) —
// separado das referências de estilo pra manter fidelidade visual.
export const MAX_LOGO_IMAGES = 6;

export const GENERATION_MODES = [
  "MERGE_LITERAL",
  "MERGE_INSPIRED",
  "MERGE_NO_TEXT",
  "COPY_ONLY",
] as const;

export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_MODE_INFO: Record<GenerationMode, { label: string; description: string }> = {
  MERGE_LITERAL: {
    label: "Mesclar referências + copy literal",
    description:
      "Usa as referências selecionadas e escreve o headline/texto/CTA exatos na imagem.",
  },
  MERGE_INSPIRED: {
    label: "Mesclar referências + copy como inspiração",
    description:
      "Usa as referências selecionadas; a copy vira direção de tom/ângulo, mas a IA escreve o texto da imagem livremente (não copia literal).",
  },
  MERGE_NO_TEXT: {
    label: "Mesclar referências, sem texto",
    description:
      "Gera uma variação só visual das referências selecionadas, sem nenhuma palavra na imagem. Copy é opcional (só guia o clima da cena).",
  },
  COPY_ONLY: {
    label: "Somente copy (sem referência)",
    description:
      "Ignora as imagens de referência; cria uma peça nova do zero a partir do texto da copy.",
  },
};
