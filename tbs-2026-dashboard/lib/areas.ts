// Áreas da PSA — usadas nos dropdowns de "quem relata" e "quem resolve" das ocorrências.
// Lista editável: adicione/remova à vontade que os dropdowns acompanham.
export const AREAS = [
  'Marketing / Growth',
  'Tecnologia / Dev',
  'Comercial / Vendas',
  'Produto / Eventos (TBS)',
  'Atendimento / CS',
  'Financeiro',
  'Diretoria',
] as const;

export type Area = (typeof AREAS)[number];
