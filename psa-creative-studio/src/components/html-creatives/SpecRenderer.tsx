import type { CSSProperties } from "react";
import { TBS, highlightKeyword, resolvePalette, type Palette } from "@/lib/html-creative-brand";
import type { Block, LayoutSpec } from "@/lib/layout-spec";

// ─────────────────────────────────────────────────────────────────────────
// SpecRenderer — desenha um LayoutSpec (proposto pela IA) como criativo TBS em
// qualquer formato. Suporta a "raiz" visual das peças reais: fundos decorativos
// (glow laranja sobre navy), CTA sublinhado, faixa laranja de rodapé, palavra
// gigante e labels de campeão. Só tokens/assets de marca → varia muito, nunca
// quebra. A foto é sempre placeholder (quem edita no Figma escolhe).
// ─────────────────────────────────────────────────────────────────────────

interface Ctx {
  pal: Palette;
  fs: number;
  centered: boolean;
  ctaStyle: "pill" | "underline";
}

function Selo({ size }: { size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/selo.png" alt="selo TBS" style={{ height: size, width: "auto", transform: "rotate(-4deg)" }} />;
}

function Logo({ pal, logoUrl, h }: { pal: Palette; logoUrl: string | null; h: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={logoUrl ?? "/brand/logo.png"} alt="The Best Speaker" style={{ height: h, width: "auto", display: "block" }} />;
  if (pal.dark) return img;
  return <div style={{ background: TBS.navy, borderRadius: 12, padding: "10px 16px" }}>{img}</div>;
}

function corner(pos: string, pad: number): CSSProperties {
  const s: CSSProperties = { position: "absolute", zIndex: 4 };
  if (pos.includes("top")) s.top = pad;
  if (pos.includes("bottom")) s.bottom = pad;
  if (pos.includes("left")) s.left = pad;
  if (pos.includes("right")) s.right = pad;
  if (pos.includes("center")) { s.left = "50%"; s.transform = "translateX(-50%)"; }
  return s;
}

// fundo decorativo — glow laranja sobre navy, no espírito das peças reais.
// Calibrado por proporção do formato (tall=story, wide=paisagem, senão
// quadrado/retrato) pra o enquadramento fazer sentido em cada um.
function bgFxImage(fx: string, tall: boolean, wide: boolean): string | undefined {
  switch (fx) {
    case "bars": {
      // barras verticais + glow quente na base; a base sobe/desce conforme a altura
      const glowY = wide ? 150 : tall ? 118 : 128;
      const glowH = wide ? 130 : tall ? 80 : 90;
      return `repeating-linear-gradient(90deg, rgba(255,122,30,0) 0 52px, rgba(255,138,40,0.13) 58px, rgba(255,122,30,0) 64px), radial-gradient(130% ${glowH}% at 50% ${glowY}%, rgba(255,122,30,0.6), rgba(255,122,30,0) 60%)`;
    }
    case "spotlight": {
      // holofote do topo — mais concentrado em story, mais largo em paisagem
      const y = wide ? -8 : tall ? 6 : 10;
      const hh = wide ? 95 : tall ? 46 : 55;
      return `radial-gradient(65% ${hh}% at 50% ${y}%, rgba(255,150,50,0.5), rgba(255,150,50,0) 70%)`;
    }
    case "burst": {
      // burst diagonal no canto superior direito
      const gw = wide ? 34 : 42;
      const gh = wide ? 62 : 42;
      const cy = wide ? 12 : 8;
      return `radial-gradient(${gw}% ${gh}% at 90% ${cy}%, rgba(255,170,60,0.85), rgba(255,120,30,0) 70%), repeating-conic-gradient(from 200deg at 92% ${cy - 2}%, rgba(255,130,35,0.16) 0deg 3deg, rgba(255,130,35,0) 3deg 9deg)`;
    }
    case "rings": {
      // anéis concêntricos (portal) — banda maior em story, menor em paisagem
      const a = wide ? 24 : tall ? 50 : 32;
      const cy = tall ? 44 : wide ? 50 : 52;
      const glow = wide ? 44 : tall ? 30 : 28;
      return `repeating-radial-gradient(circle at 50% ${cy}%, rgba(255,122,30,0) 0 ${a}px, rgba(255,140,40,0.42) ${a + 7}px, rgba(255,122,30,0) ${a + 15}px), radial-gradient(${glow}% ${glow}% at 50% ${cy}%, rgba(255,150,50,0.55), transparent 72%)`;
    }
    default:
      return undefined;
  }
}

function renderBlock(b: Block, ctx: Ctx, key: number) {
  const { pal, fs, centered, ctaStyle } = ctx;
  const px = (n: number) => Math.round(n * fs);
  switch (b.type) {
    case "eyebrow":
      return <span key={key} style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(22), letterSpacing: 2, textTransform: "uppercase", color: pal.accent }}>{b.text}</span>;
    case "headline": {
      const base = { md: 48, lg: 64, xl: 100, mega: 150 }[b.scale ?? "lg"];
      return (
        <h1 key={key} style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: px(base), lineHeight: 0.96, letterSpacing: -0.5, color: pal.text }}>
          {highlightKeyword(b.text, b.highlight ?? null, pal.accent)}
        </h1>
      );
    }
    case "quote":
      return (
        <h1 key={key} style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: px(70), lineHeight: 1.08, color: pal.text }}>
          {"“"}{highlightKeyword(b.text, b.highlight ?? null, pal.accent)}{"”"}
        </h1>
      );
    case "subtext":
      return <p key={key} style={{ margin: 0, maxWidth: 760, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: px(29), lineHeight: 1.34, color: pal.sub }}>{b.text}</p>;
    case "stat":
      return (
        <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: centered ? "center" : "flex-start", gap: 4 }}>
          <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: px(112), lineHeight: 0.9, color: pal.accent }}>{b.number}</span>
          <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: px(28), color: pal.text }}>{b.label}</span>
        </div>
      );
    case "cta":
      if (ctaStyle === "pill")
        return <span key={key} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "fit-content", background: pal.ctaBg, color: pal.ctaColor, fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(23), letterSpacing: 0.5, padding: `${px(18)}px ${px(40)}px`, borderRadius: 999, textTransform: "uppercase" }}>{b.text}</span>;
      return <span key={key} style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(24), letterSpacing: 3, textTransform: "uppercase", color: pal.text, borderBottom: `${px(4)}px solid ${pal.accent}`, paddingBottom: px(8), width: "fit-content" }}>{b.text}</span>;
    case "tag":
      return (
        <div key={key} style={{ width: px(300) }}>
          <div style={{ background: TBS.offWhite, borderRadius: "4px 4px 0 0", padding: `${px(12)}px ${px(16)}px` }}>
            <span style={{ color: TBS.navy, fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(20) }}>{b.name}</span>
          </div>
          <div style={{ background: TBS.orangeGradient, borderRadius: "0 0 4px 4px", padding: `${px(8)}px ${px(16)}px` }}>
            <span style={{ color: TBS.offWhite, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: px(11.5) }}>{b.subtitle}</span>
          </div>
        </div>
      );
    case "divider":
      return <div key={key} style={{ width: px(90), height: px(6), borderRadius: 3, background: pal.accent }} />;
  }
}

export function SpecRenderer({
  spec,
  w: wIn,
  h: hIn,
  logoUrl = null,
  photoNote = "📷 Foto do Banlek entra aqui",
  photoUrl = null,
}: {
  spec: LayoutSpec;
  w: number;
  h: number;
  logoUrl?: string | null;
  photoNote?: string;
  photoUrl?: string | null;
}) {
  const w = Number.isFinite(wIn) && wIn > 0 ? wIn : 1080;
  const h = Number.isFinite(hIn) && hIn > 0 ? hIn : 1080;
  const pal = resolvePalette(spec.colorway);
  const ratio = h / w;
  const tall = ratio >= 1.3;
  const wide = ratio <= 0.75;
  const fs = wide ? 0.62 : tall ? 1.05 : 1;
  const pad = wide ? 44 : tall ? 96 : 80;
  const px = (n: number) => Math.round(n * fs);

  const band = spec.band === "bottom";
  const bandH = band ? Math.round(h * (wide ? 0.26 : 0.22)) : 0;

  const hasPhoto = spec.photo !== "none";
  const photoFull = spec.photo === "full" && !wide;
  const photoBottom = spec.photo === "bottom" || (tall && spec.photo === "side");
  const usePhotoSide = !photoBottom && !photoFull && (spec.photo === "side" || (wide && spec.photo === "full"));

  let photoStyle: CSSProperties | null = null;
  if (photoFull) photoStyle = { inset: 0 };
  else if (photoBottom) photoStyle = { left: 0, right: 0, bottom: bandH, top: Math.round(h * 0.56) };
  else if (usePhotoSide) photoStyle = { top: 0, bottom: bandH, right: 0, left: Math.round(w * 0.56) };

  const content: CSSProperties = { position: "absolute", zIndex: 2, top: pad, left: pad, right: pad, bottom: band ? bandH + Math.round(pad * 0.35) : pad };
  if (photoBottom) content.bottom = Math.round(h * 0.46);
  if (usePhotoSide) content.right = Math.round(w * 0.48);
  if (photoFull && spec.vAlign === "bottom") content.right = tall ? pad : Math.round(w * 0.4);

  const scrim = photoFull
    ? pal.dark
      ? "linear-gradient(120deg, #0E0031 26%, rgba(14,0,49,0.72) 50%, rgba(14,0,49,0) 80%)"
      : "linear-gradient(120deg, rgba(244,244,244,0.96) 26%, rgba(244,244,244,0.7) 50%, rgba(244,244,244,0) 80%)"
    : "none";

  const justify = spec.vAlign === "top" ? "flex-start" : spec.vAlign === "bottom" ? "flex-end" : "center";
  const align = spec.hAlign === "center" ? "center" : "flex-start";
  const ctaStyle = spec.ctaStyle ?? "underline";
  const ctx: Ctx = { pal, fs, centered: spec.hAlign === "center", ctaStyle };
  const seloSize = Math.round((tall ? 190 : 168) * (wide ? 0.7 : 1));

  // no rodapé em faixa, o CTA sai do fluxo e vai pra dentro da faixa
  const ctaBlock = spec.blocks.find((b) => b.type === "cta");
  const flowBlocks = band ? spec.blocks.filter((b) => b.type !== "cta") : spec.blocks;

  const fxImg = bgFxImage(spec.bgFx, tall, wide);

  return (
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden", background: pal.bg, fontFamily: TBS.fontBody }}>
      {fxImg && <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: fxImg, pointerEvents: "none" }} />}

      {hasPhoto && photoStyle && (
        photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img data-name="PhotoPlaceholder_Banlek" src={photoUrl} alt="foto" style={{ position: "absolute", zIndex: 1, objectFit: "cover", ...photoStyle }} />
        ) : (
          <div data-name="PhotoPlaceholder_Banlek" style={{ position: "absolute", zIndex: 1, background: TBS.photoDark, border: `2px dashed ${TBS.orange}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", boxSizing: "border-box", ...photoStyle }}>
            <p style={{ color: TBS.peach, fontFamily: TBS.fontBody, fontSize: px(20), lineHeight: 1.4, margin: 0 }}>{photoNote}</p>
          </div>
        )
      )}
      {photoFull && <div style={{ position: "absolute", inset: 0, background: scrim, zIndex: 1 }} />}

      {/* faixa laranja de rodapé com o CTA */}
      {band && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bandH, background: TBS.orangeGradientBg, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: pad }}>
          {ctaBlock && (
            <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(26), letterSpacing: 3, textTransform: "uppercase", color: TBS.offWhite, borderBottom: `${px(4)}px solid rgba(255,255,255,0.9)`, paddingBottom: px(8) }}>{ctaBlock.text}</span>
          )}
        </div>
      )}

      <div style={{ ...content, display: "flex", flexDirection: "column", justifyContent: justify, alignItems: align, gap: Math.round((tall ? 30 : 22) * fs), textAlign: spec.hAlign === "center" ? "center" : "left", boxSizing: "border-box" }}>
        {flowBlocks.map((b, i) => renderBlock(b, ctx, i))}
      </div>

      {/* labels de campeão/edição (esquerda) + marca (direita) */}
      {spec.credit && (
        <>
          <div style={{ position: "absolute", left: pad, top: "46%", zIndex: 3, color: pal.text }}>
            <div style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: px(20), letterSpacing: 3, textTransform: "uppercase", lineHeight: 1.2 }}>{spec.credit.name}</div>
            <div style={{ fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: px(15), letterSpacing: 3, textTransform: "uppercase", lineHeight: 1.3, opacity: 0.85 }}>{spec.credit.role}</div>
          </div>
          <div style={{ position: "absolute", right: pad, top: "46%", zIndex: 3, textAlign: "right", color: pal.text, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: px(15), letterSpacing: 3, textTransform: "uppercase", lineHeight: 1.4 }}>
            THE BEST<br />SPEAKER<br />BRASIL
          </div>
        </>
      )}

      {spec.seloPosition !== "none" && <div style={corner(spec.seloPosition, pad - 12)}><Selo size={seloSize} /></div>}
      <div style={corner(spec.logoPosition, pad - 16)}><Logo pal={pal} logoUrl={logoUrl} h={px(46)} /></div>
    </div>
  );
}
