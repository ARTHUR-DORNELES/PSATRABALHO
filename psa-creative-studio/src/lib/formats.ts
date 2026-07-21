// Formatos de saída dos criativos. Todos com largura 1080 (a escala de fonte é
// relativa à largura), variando só a altura — assim a "raiz" do layout (marca,
// tipografia, composição) se mantém e só o enquadramento muda.
export type FormatId = "quadrado" | "retrato" | "story" | "paisagem";

export interface FormatDef {
  id: FormatId;
  label: string;
  w: number;
  h: number;
}

export const FORMATS: FormatDef[] = [
  { id: "quadrado", label: "Quadrado 1:1", w: 1080, h: 1080 },
  { id: "retrato", label: "Retrato 4:5", w: 1080, h: 1350 },
  { id: "story", label: "Story 9:16", w: 1080, h: 1920 },
  { id: "paisagem", label: "Paisagem 16:9", w: 1080, h: 608 },
];

export function getFormat(id: string | null | undefined): FormatDef {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}
