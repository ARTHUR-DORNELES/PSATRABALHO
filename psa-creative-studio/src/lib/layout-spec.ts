import { z } from "zod";
import type { ColorwayId } from "@/lib/html-creative-brand";

// ─────────────────────────────────────────────────────────────────────────
// LayoutSpec — a "planta" de um criativo que a IA propõe. Não é HTML livre
// (que quebraria); é uma composição de blocos + posições que o SpecRenderer
// desenha com segurança na marca TBS. É isso que dá variedade REAL de layout
// sem risco de peça quebrada.
// ─────────────────────────────────────────────────────────────────────────

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("eyebrow"), text: z.string() }),
  z.object({
    type: z.literal("headline"),
    text: z.string(),
    scale: z.enum(["md", "lg", "xl", "mega"]).default("lg"),
    highlight: z.string().nullish(),
  }),
  z.object({ type: z.literal("quote"), text: z.string(), highlight: z.string().nullish() }),
  z.object({ type: z.literal("subtext"), text: z.string() }),
  z.object({ type: z.literal("stat"), number: z.string(), label: z.string() }),
  z.object({ type: z.literal("cta"), text: z.string() }),
  z.object({ type: z.literal("tag"), name: z.string(), subtitle: z.string() }),
  z.object({ type: z.literal("divider") }),
]);
export type Block = z.infer<typeof blockSchema>;

export const layoutSpecSchema = z.object({
  concept: z.string().default("layout"),
  colorway: z.enum(["navy", "orange", "light", "mono"]).default("navy"),
  vAlign: z.enum(["top", "center", "bottom"]).default("center"),
  hAlign: z.enum(["left", "center"]).default("left"),
  photo: z.enum(["none", "full", "side", "bottom"]).default("none"),
  seloPosition: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right", "none"])
    .default("top-right"),
  logoPosition: z
    .enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-right"])
    .default("bottom-left"),
  // fundo decorativo da marca (glow laranja sobre navy). Escondido quando photo=full.
  bgFx: z.enum(["none", "bars", "rings", "burst", "spotlight"]).default("none"),
  // estilo do CTA — "underline" é o padrão da marca (texto com risco laranja).
  ctaStyle: z.enum(["pill", "underline"]).default("underline"),
  // faixa laranja no rodapé (o CTA/subtexto ficam dentro dela).
  band: z.enum(["none", "bottom"]).default("none"),
  // labels laterais de campeão/edição (esquerda) + "THE BEST SPEAKER BRASIL" (direita).
  credit: z.object({ name: z.string(), role: z.string() }).nullish(),
  blocks: z.array(blockSchema).min(1).max(7),
});
export type LayoutSpec = z.infer<typeof layoutSpecSchema>;

export interface CopyInput {
  persona: string;
  headline: string;
  textoPrincipal: string;
  cta: string;
  angulo: string;
}

/** Valida/normaliza um objeto qualquer em LayoutSpec; null se irrecuperável. */
export function sanitizeSpec(raw: unknown): LayoutSpec | null {
  const parsed = layoutSpecSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// Codifica/decodifica spec pra passar na URL da rota de render/export.
export function encodeSpec(spec: LayoutSpec): string {
  return Buffer.from(JSON.stringify(spec), "utf8").toString("base64url");
}
export function decodeSpec(s: string): LayoutSpec | null {
  try {
    return sanitizeSpec(JSON.parse(Buffer.from(s, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

// ── Fallback: gera specs diversos SEM IA (quando a API falha/sem key) ────────
const CW: ColorwayId[] = ["navy", "orange", "light", "mono"];

export function fallbackSpecs(copy: CopyInput, count: number): LayoutSpec[] {
  const kw = copy.persona.split(/\s+/)[0];
  const recipes: ((i: number) => LayoutSpec)[] = [
    // palavra gigante centralizada, fundo de barras
    (i) => ({
      concept: "Palavra gigante",
      colorway: "navy", vAlign: "center", hAlign: "center", photo: "none",
      bgFx: "bars", ctaStyle: "underline", band: "none",
      seloPosition: "none", logoPosition: "top-center",
      blocks: [
        { type: "headline", text: copy.headline, scale: "mega", highlight: kw },
        { type: "cta", text: copy.cta },
      ],
    }),
    // citação centralizada
    (i) => ({
      concept: "Citação",
      colorway: CW[(i + 1) % CW.length], vAlign: "center", hAlign: "center", photo: "none",
      bgFx: "spotlight", ctaStyle: "underline", band: "none",
      seloPosition: "bottom-right", logoPosition: "top-center",
      blocks: [
        { type: "quote", text: copy.headline, highlight: kw },
        { type: "subtext", text: copy.textoPrincipal },
        { type: "cta", text: copy.cta },
      ],
    }),
    // prêmio com burst
    (i) => ({
      concept: "Prêmio (burst)",
      colorway: "navy", vAlign: "center", hAlign: "left", photo: "none",
      bgFx: "burst", ctaStyle: "underline", band: "none",
      seloPosition: "none", logoPosition: "top-left",
      blocks: [
        { type: "stat", number: "R$ 1 milhão", label: "em prêmios no reality show" },
        { type: "headline", text: copy.headline, scale: "md", highlight: kw },
        { type: "cta", text: copy.cta },
      ],
    }),
    // campeão / depoimento com foto full
    (i) => ({
      concept: "Campeão",
      colorway: "navy", vAlign: "top", hAlign: "center", photo: "full",
      bgFx: "none", ctaStyle: "underline", band: "none",
      credit: { name: copy.persona.toUpperCase(), role: "CAMPEÃ · 2ª EDIÇÃO" },
      seloPosition: "none", logoPosition: "top-center",
      blocks: [
        { type: "headline", text: copy.headline, scale: "lg", highlight: kw },
        { type: "subtext", text: copy.textoPrincipal },
        { type: "cta", text: copy.cta },
      ],
    }),
    // multi-statement empilhado
    (i) => ({
      concept: "Multi-statement",
      colorway: CW[(i + 2) % CW.length], vAlign: "center", hAlign: "left", photo: "side",
      bgFx: "none", ctaStyle: "underline", band: "none",
      seloPosition: "top-right", logoPosition: "top-left",
      blocks: [
        { type: "headline", text: "150 vagas.", scale: "lg" },
        { type: "headline", text: "R$ 1 milhão em prêmios.", scale: "lg", highlight: "milhão" },
        { type: "headline", text: copy.headline, scale: "md", highlight: kw },
        { type: "cta", text: copy.cta },
      ],
    }),
    // faixa de rodapé + anéis
    (i) => ({
      concept: "Faixa de rodapé",
      colorway: "navy", vAlign: "center", hAlign: "center", photo: "none",
      bgFx: "rings", ctaStyle: "underline", band: "bottom",
      seloPosition: "none", logoPosition: "top-center",
      blocks: [
        { type: "headline", text: copy.headline, scale: "lg", highlight: kw },
        { type: "subtext", text: copy.textoPrincipal },
        { type: "cta", text: copy.cta },
      ],
    }),
  ];
  // embaralha as receitas e sorteia um offset de colorway pra que levas
  // diferentes (mesmo sem IA) não saiam idênticas.
  const order = recipes.map((_, i) => i).sort(() => Math.random() - 0.5);
  const cwOffset = Math.floor(Math.random() * CW.length);
  return Array.from({ length: count }, (_, i) => {
    const recipe = recipes[order[i % order.length]];
    const spec = recipe(i + cwOffset);
    return spec;
  });
}
