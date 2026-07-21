import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────
// Design system TBS — tokens extraídos 1:1 do arquivo de referência no Figma
// (fileKey z7BXALyCVkrMZogv20DHTa · página "Criativos"). Cores em hex/gradiente
// simples (não Tailwind) porque o HTML precisa ser 100% autocontido pra colar
// no plugin html.to.design.
// ─────────────────────────────────────────────────────────────────────────
export const TBS = {
  navy: "#0E0031",
  navyGradient: "linear-gradient(126deg, #190548 14%, #0E0031 86%)",
  photoDark: "#261447", // fundo do placeholder de foto sobre navy
  photoSide: "#1F1A1F", // fundo da coluna de foto (split panel)
  orange: "#FF7A1E",
  orangeAlt: "#EB7801",
  orangeGradient: "linear-gradient(169deg, #FFB03B 14%, #E8471F 86%)", // pill / Box_Reforco
  orangeGradientBg: "linear-gradient(135deg, #FFB03B 14%, #E8471F 86%)", // fundo cheio (citação)
  offWhite: "#F4F4F4",
  peach: "#FFBD90", // destaque de headline sobre foto
  // DX Rigraf é a fonte de marca; Inter/Archivo são fallback quando ela não
  // está instalada. Instalar DX Rigraf no Figma deixa o import 1:1.
  fontDisplay: "'DX Rigraf', 'Archivo', 'Poppins', 'Segoe UI', sans-serif",
  fontBody: "'DX Rigraf', 'Inter', 'Segoe UI', sans-serif",
  badgeText: "O ÚNICO REALITY SHOW DE PALESTRANTES DO MUNDO!",
};

// ── Colorways ───────────────────────────────────────────────────────────
// Esquemas de cor que mudam radicalmente a cara da peça (fundo, texto,
// destaque, CTA), todos dentro da paleta TBS. É a principal alavanca de
// diversidade entre criativos.
export type ColorwayId = "navy" | "orange" | "light" | "mono";

export interface Palette {
  id: ColorwayId;
  label: string;
  bg: string;
  text: string;
  sub: string;
  accent: string; // cor do destaque no headline / eyebrow
  ctaBg: string;
  ctaColor: string;
  dark: boolean; // fundo escuro? (define contraste de elementos)
}

const NAVY = "#0E0031";
const OFFWHITE = "#F4F4F4";
const ORANGE = "#FF7A1E";
const PEACH = "#FFBD90";
const NAVY_GRAD = "linear-gradient(126deg, #190548 14%, #0E0031 86%)";
const ORANGE_GRAD = "linear-gradient(169deg, #FFB03B 14%, #E8471F 86%)";
const ORANGE_GRAD_BG = "linear-gradient(135deg, #FFB03B 14%, #E8471F 86%)";

export const COLORWAYS: Record<ColorwayId, Palette> = {
  navy: {
    id: "navy", label: "Navy",
    bg: NAVY_GRAD, text: OFFWHITE, sub: PEACH, accent: ORANGE,
    ctaBg: ORANGE_GRAD, ctaColor: OFFWHITE, dark: true,
  },
  orange: {
    id: "orange", label: "Laranja",
    bg: ORANGE_GRAD_BG, text: OFFWHITE, sub: OFFWHITE, accent: NAVY,
    ctaBg: OFFWHITE, ctaColor: NAVY, dark: false,
  },
  light: {
    id: "light", label: "Claro",
    bg: OFFWHITE, text: NAVY, sub: "rgba(14,0,49,0.72)", accent: ORANGE,
    ctaBg: ORANGE_GRAD, ctaColor: OFFWHITE, dark: false,
  },
  mono: {
    id: "mono", label: "Mono",
    bg: NAVY, text: OFFWHITE, sub: "rgba(244,244,244,0.66)", accent: OFFWHITE,
    ctaBg: OFFWHITE, ctaColor: NAVY, dark: true,
  },
};

export const COLORWAY_IDS = Object.keys(COLORWAYS) as ColorwayId[];

export function resolvePalette(id: ColorwayId | null | undefined): Palette {
  return COLORWAYS[id ?? "navy"] ?? COLORWAYS.navy;
}

export type TemplateId =
  | "split-panel"
  | "citacao"
  | "foto-dominante"
  | "palco-saude"
  | "manchete-gigante"
  | "pergunta"
  | "requisito-unico"
  | "convite-data"
  | "funil";

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  hasPhoto: boolean;
  desc: string;
}

// Os 4 arquétipos espelham os frames da referência. Cada persona/ângulo pode
// usar um template diferente — é isso que quebra o "todos iguais".
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "split-panel",
    label: "Split Painel",
    hasPhoto: true,
    desc: "Texto num painel navy à esquerda, foto à direita, selo na costura. (base: AD_Medico03)",
  },
  {
    id: "citacao",
    label: "Citação",
    hasPhoto: false,
    desc: "Fundo laranja, frase de impacto entre aspas, sem foto. (base: AD_MedicoCitacao)",
  },
  {
    id: "foto-dominante",
    label: "Foto Dominante",
    hasPhoto: true,
    desc: "Foto full-bleed, headline embaixo, tag de finalista. (base: AD_BrunoBenites)",
  },
  {
    id: "palco-saude",
    label: "Palco + Stats",
    hasPhoto: true,
    desc: "Argumento denso em cima, foto embaixo, linha de stats. (base: AD_BrunoBenites_PalcoSaude)",
  },
  {
    id: "manchete-gigante",
    label: "Manchete Gigante",
    hasPhoto: false,
    desc: "Uma manchete enorme domina a peça, mínimo de elementos. Impacto direto.",
  },
  {
    id: "pergunta",
    label: "Pergunta",
    hasPhoto: false,
    desc: "Headline em pergunta, centralizada, muito respiro. Provoca resposta.",
  },
  {
    id: "requisito-unico",
    label: "Requisito Único",
    hasPhoto: false,
    desc: "Destaca o 'único requisito: ter algo a dizer' num selo/chip forte.",
  },
  {
    id: "convite-data",
    label: "Convite / Data",
    hasPhoto: false,
    desc: "Chamada de inscrição com chip de prazo/data em evidência.",
  },
  {
    id: "funil",
    label: "Funil",
    hasPhoto: false,
    desc: "Visual do funil do reality: 20 chegam · 10 à final · 1 leva R$ 1 milhão.",
  },
];

export function getTemplate(id: string | null | undefined): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export interface TemplateProps {
  format: "feed" | "story";
  persona: string;
  headline: string;
  textoPrincipal: string;
  cta: string | null;
  logoUrl: string | null;
  photoNote: string;
  tagName?: string | null;
  tagSubtitle?: string | null;
  dateChip?: string | null;
  // knobs de estilo que o Diretor de Arte varia entre gerações
  ctaVariant?: "gradient" | "light";
  highlightWord?: string | null;
  colorway?: ColorwayId;
}

// Fatos fixos da campanha TBS — usados por templates que não dependem de
// campos de copy (ex: o funil do reality). Ajuste aqui se a mecânica mudar.
export const TBS_FACTS = {
  funil: [
    { n: "20", label: "chegam ao reality" },
    { n: "10", label: "vão à final" },
    { n: "1", label: "leva R$ 1 milhão" },
  ],
  requisito: "ter algo a dizer",
  defaultDateChip: "Inscrições abertas",
};

// Destaca a primeira palavra da persona dentro de um texto (ex: "médico" em
// "O que um médico tem a dizer..."), com a cor passada. Se não achar a
// palavra literalmente, devolve o texto puro.
export function highlightKeyword(text: string, keyword: string | null, color: string): ReactNode {
  const kw = (keyword ?? "").trim().split(/\s+/)[0];
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color }}>{text.slice(idx, idx + kw.length)}</span>
      {text.slice(idx + kw.length)}
    </>
  );
}

// Copy de exemplo do catálogo — a mesma persona em todos os tipos, pra o time
// comparar layouts (o texto é ilustrativo; as peças reais usam a copy importada).
export const SAMPLE_COPY = {
  persona: "Médico",
  headline: "O que um médico tem a dizer que 3.000 pessoas pagariam pra ouvir?",
  textoPrincipal: "Descubra no maior reality de palestrantes do Brasil.",
  cta: "Inscreva-se agora",
  angulo: "Identidade / orgulho",
};

export function buildSampleProps(format: "feed" | "story"): TemplateProps {
  return {
    format,
    persona: SAMPLE_COPY.persona,
    headline: SAMPLE_COPY.headline,
    textoPrincipal: SAMPLE_COPY.textoPrincipal,
    cta: SAMPLE_COPY.cta,
    logoUrl: null,
    photoNote: buildPhotoNote(SAMPLE_COPY.persona, SAMPLE_COPY.angulo),
    dateChip: "Inscrições até 31/08",
  };
}

export interface SampleCopy {
  persona: string;
  headline: string;
  textoPrincipal: string;
  cta: string;
  angulo: string;
}

// Banco de copies de exemplo (personas × ângulos) que o Diretor de Arte usa
// pra gerar variações. Trocável depois pela matriz real importada em /copy.
export const SAMPLE_COPIES: SampleCopy[] = [
  {
    persona: "Médico",
    headline: "O que um médico tem a dizer que 3.000 pessoas pagariam pra ouvir?",
    textoPrincipal: "Descubra no maior reality de palestrantes do Brasil.",
    cta: "Inscreva-se agora",
    angulo: "Identidade / orgulho",
  },
  {
    persona: "Advogado",
    headline: "Todo dia você defende uma tese. E se o júri fossem 3.000 pessoas?",
    textoPrincipal: "O maior reality de palestrantes do Brasil está com inscrições abertas.",
    cta: "Quero meu palco",
    angulo: "Provocação",
  },
  {
    persona: "Professor",
    headline: "Você já ensina uma sala. Falta o palco pra ensinar o país.",
    textoPrincipal: "20 chegam ao reality, 10 à final, 1 leva R$ 1 milhão.",
    cta: "Inscreva-se",
    angulo: "Aspiração",
  },
  {
    persona: "Psicólogo",
    headline: "O que um psicólogo escuta todo dia que um auditório inteiro precisa ouvir?",
    textoPrincipal: "Seu conhecimento merece um palco. O The Best Speaker entrega isso.",
    cta: "Inscreva-se agora",
    angulo: "Identidade / orgulho",
  },
];

export function buildPropsFromCopy(c: SampleCopy, format: "feed" | "story"): TemplateProps {
  return {
    format,
    persona: c.persona,
    headline: c.headline,
    textoPrincipal: c.textoPrincipal,
    cta: c.cta,
    logoUrl: null,
    photoNote: buildPhotoNote(c.persona, c.angulo),
    dateChip: "Inscrições até 31/08",
  };
}

export function buildPhotoNote(persona: string, angulo: string | null): string {
  return (
    `📷 Substituir por foto do Banlek (banlek.com/psa) — palco/palestrante que ` +
    `combine com "${persona}"${angulo ? ` · ângulo: ${angulo}` : ""}. ` +
    `Arraste a imagem pra dentro deste retângulo (mantém a máscara).`
  );
}
