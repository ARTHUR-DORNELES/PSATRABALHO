import type { CSSProperties, ReactNode } from "react";
import {
  TBS,
  TBS_FACTS,
  highlightKeyword,
  resolvePalette,
  type Palette,
  type TemplateId,
  type TemplateProps,
} from "@/lib/html-creative-brand";

// ─────────────────────────────────────────────────────────────────────────
// Templates de criativo TBS — composição vetorial em HTML/CSS (sem IA de
// imagem). O colorway (paleta) muda fundo/texto/destaque/CTA e é a principal
// alavanca de diversidade entre peças. Logo e selo são assets reais da marca;
// a foto entra depois via placeholder nomeado (Banlek).
// ─────────────────────────────────────────────────────────────────────────

const DIM = {
  feed: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

// ── primitivas compartilhadas ──────────────────────────────────────────────

// Selo real da marca.
function Selo({ size = 176 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      data-name="CLONE_selo"
      src="/brand/selo.png"
      alt="selo TBS"
      style={{ height: size, width: "auto", transform: "rotate(-4deg)" }}
    />
  );
}

function PhotoSlot({ note, style }: { note: string; style?: CSSProperties }) {
  return (
    <div
      data-name="PhotoPlaceholder_Banlek"
      style={{
        background: TBS.photoDark,
        border: `2px dashed ${TBS.orange}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        textAlign: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <p style={{ color: TBS.peach, fontFamily: TBS.fontBody, fontSize: 22, lineHeight: 1.45, margin: 0 }}>
        {note}
      </p>
    </div>
  );
}

function CtaPill({ label, pal, style }: { label: string; pal: Palette; style?: CSSProperties }) {
  return (
    <span
      data-name="CTA"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "fit-content",
        background: pal.ctaBg,
        color: pal.ctaColor,
        fontFamily: TBS.fontDisplay,
        fontWeight: 800,
        fontSize: 24,
        letterSpacing: 0.5,
        padding: "20px 44px",
        borderRadius: 999,
        textTransform: "uppercase",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

// Logo real. Em fundo claro, envolve num chip navy pra não sumir.
function LogoSlot({ logoUrl, pal, style }: { logoUrl: string | null; pal: Palette; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img data-name="CLONE_logoCompact" src={logoUrl ?? "/brand/logo.png"} alt="The Best Speaker" style={{ height: 48, width: "auto", display: "block" }} />;
  if (pal.dark) return <div style={{ ...style }}>{img}</div>;
  return (
    <div style={{ background: TBS.navy, borderRadius: 12, padding: "12px 18px", ...style }}>{img}</div>
  );
}

function Tag({ name, subtitle, style }: { name: string; subtitle: string; style?: CSSProperties }) {
  return (
    <div data-name="TAG" style={{ width: 272, ...style }}>
      <div style={{ background: TBS.offWhite, borderRadius: "4px 4px 0 0", padding: "12px 16px" }}>
        <span style={{ color: TBS.navy, fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: 20 }}>{name}</span>
      </div>
      <div style={{ background: TBS.orangeGradient, borderRadius: "0 0 4px 4px", padding: "8px 16px" }}>
        <span style={{ color: TBS.offWhite, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: 11.5 }}>{subtitle}</span>
      </div>
    </div>
  );
}

function canvasStyle(format: "feed" | "story", bg: string, extra?: CSSProperties): CSSProperties {
  return {
    width: DIM[format].w,
    height: DIM[format].h,
    position: "relative",
    overflow: "hidden",
    background: bg,
    fontFamily: TBS.fontBody,
    boxSizing: "border-box",
    ...extra,
  };
}

// ── 1. SPLIT PANEL ──────────────────────────────────────────────────────────
function SplitPanel(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const panelW = story ? 1080 : 605;
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: story ? "column" : "row" })}>
      <div
        data-name="Panel"
        style={{
          width: panelW,
          height: story ? 1150 : "100%",
          background: pal.bg,
          padding: story ? "110px 90px" : "150px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34,
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 62 : 50, lineHeight: 1.15, letterSpacing: -0.5, color: pal.text }}>
          {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
        </h1>
        <p style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 34 : 30, lineHeight: 1.32, color: pal.text }}>
          {p.textoPrincipal}
        </p>
        {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 8 }} />}
        <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 60, bottom: 56 }} />
      </div>
      <PhotoSlot note={p.photoNote} style={{ flex: 1, background: TBS.photoSide, height: story ? "auto" : "100%" }} />
      <div style={{ position: "absolute", top: story ? 900 : 44, right: story ? 60 : 300, zIndex: 3 }}>
        <Selo size={story ? 210 : 190} />
      </div>
    </div>
  );
}

// ── 2. CITAÇÃO ──────────────────────────────────────────────────────────────
function Citacao(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: story ? "160px 90px" : "150px 80px", textAlign: "center" })}>
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", top: story ? 80 : 60, left: "50%", transform: "translateX(-50%)" }} />
      <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 84 : 76, lineHeight: 1.08, color: pal.text }}>
        {"“"}
        {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
        {"”"}
      </h1>
      <p style={{ margin: "40px 0 0", maxWidth: 780, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 36 : 34, lineHeight: 1.38, color: pal.text }}>
        {p.textoPrincipal}
      </p>
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 48 }} />}
      <div style={{ position: "absolute", bottom: story ? 140 : 90, right: story ? 90 : 90 }}>
        <Selo size={story ? 240 : 190} />
      </div>
    </div>
  );
}

// ── 3. FOTO DOMINANTE ────────────────────────────────────────────────────────
function FotoDominante(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const scrim = pal.dark
    ? "linear-gradient(105deg, #0E0031 30%, rgba(14,0,49,0.75) 52%, rgba(14,0,49,0) 78%)"
    : "linear-gradient(105deg, rgba(244,244,244,0.96) 30%, rgba(244,244,244,0.78) 52%, rgba(244,244,244,0) 78%)";
  return (
    <div style={canvasStyle(p.format, TBS.navy)}>
      <PhotoSlot note={p.photoNote} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: scrim }} />
      <div style={{ position: "absolute", left: story ? 90 : 105, right: story ? 90 : 480, bottom: story ? 200 : 160, display: "flex", flexDirection: "column", gap: 26, zIndex: 2 }}>
        <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 72 : 60, lineHeight: 0.98, letterSpacing: -0.5, color: pal.text }}>
          {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
        </h1>
        <p style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 30 : 27, lineHeight: 1.29, color: pal.text }}>
          {p.textoPrincipal}
        </p>
        {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 6 }} />}
        <Tag name={(p.tagName ?? p.persona).toUpperCase()} subtitle={p.tagSubtitle ?? `FINALISTA THE BEST SPEAKER 2025 · ${p.persona.toUpperCase()}`} style={{ marginTop: 10 }} />
      </div>
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 105, bottom: 56, zIndex: 2 }} />
      <div style={{ position: "absolute", top: story ? 120 : 60, right: story ? 60 : 60, zIndex: 2 }}>
        <Selo size={story ? 210 : 176} />
      </div>
    </div>
  );
}

// ── 4. PALCO + STATS ──────────────────────────────────────────────────────────
function PalcoSaude(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const photoTop = story ? 1160 : 529;
  return (
    <div style={canvasStyle(p.format, pal.bg)}>
      <div style={{ position: "absolute", left: story ? 64 : 63, right: story ? 64 : 63, top: story ? 70 : 49, display: "flex", flexDirection: "column", gap: 18, zIndex: 2 }}>
        <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: 22, letterSpacing: 2, color: pal.accent }}>{p.persona.toUpperCase()},</span>
        <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 58 : 53, lineHeight: 1.04, color: pal.text }}>{p.headline}</h1>
        <p style={{ margin: 0, maxWidth: 560, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: 26, lineHeight: 1.29, color: pal.text }}>{p.textoPrincipal}</p>
        <p style={{ margin: "6px 0 0", fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: 22, letterSpacing: 0.6, color: pal.text }}>
          <b style={{ color: pal.accent }}>20</b> chegam ao reality &nbsp;·&nbsp; <b style={{ color: pal.accent }}>10</b> vão à final &nbsp;·&nbsp; <b style={{ color: pal.accent }}>1</b> leva <b style={{ color: pal.accent }}>R$ 1 milhão</b> em prêmios.
        </p>
        {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 14 }} />}
      </div>
      <PhotoSlot note={p.photoNote} style={{ position: "absolute", left: 0, right: 0, top: photoTop, bottom: 0 }} />
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: 53, top: photoTop - 92, zIndex: 2 }} />
      <Tag name={(p.tagName ?? p.persona).toUpperCase()} subtitle={p.tagSubtitle ?? `FINALISTA THE BEST SPEAKER 2025 · ${p.persona.toUpperCase()}`} style={{ position: "absolute", left: story ? 64 : 163, top: photoTop + 200, zIndex: 3 }} />
      <div style={{ position: "absolute", top: story ? 60 : 28, right: story ? 40 : 20, zIndex: 3 }}>
        <Selo size={story ? 210 : 176} />
      </div>
    </div>
  );
}

// ── 5. MANCHETE GIGANTE ───────────────────────────────────────────────────────
function MancheteGigante(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", justifyContent: "center", padding: story ? "160px 90px" : "110px 70px" })}>
      <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 110 : 96, lineHeight: 0.94, letterSpacing: -1, color: pal.text }}>
        {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
      </h1>
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 48 }} />}
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 70, bottom: 56 }} />
      <div style={{ position: "absolute", top: story ? 90 : 60, right: story ? 60 : 60 }}>
        <Selo size={story ? 200 : 168} />
      </div>
    </div>
  );
}

// ── 6. PERGUNTA ──────────────────────────────────────────────────────────────
function Pergunta(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const q = p.headline.trim().endsWith("?") ? p.headline : `${p.headline}?`;
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: story ? "160px 90px" : "150px 90px", textAlign: "center" })}>
      <div style={{ position: "absolute", top: story ? 90 : 56, left: "50%", transform: "translateX(-50%)" }}>
        <Selo size={story ? 190 : 150} />
      </div>
      <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 78 : 68, lineHeight: 1.06, color: pal.text }}>
        {highlightKeyword(q, p.highlightWord ?? p.persona, pal.accent)}
      </h1>
      {p.textoPrincipal && (
        <p style={{ margin: "32px 0 0", maxWidth: 720, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 32 : 28, lineHeight: 1.35, color: pal.sub }}>
          {p.textoPrincipal}
        </p>
      )}
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 44 }} />}
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)" }} />
    </div>
  );
}

// ── 7. REQUISITO ÚNICO ─────────────────────────────────────────────────────────
function RequisitoUnico(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", justifyContent: "center", gap: 30, padding: story ? "160px 90px" : "120px 70px" })}>
      <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase", color: pal.accent }}>O único requisito é</span>
      <div style={{ width: "fit-content", maxWidth: "100%", background: pal.ctaBg, borderRadius: 24, padding: story ? "32px 48px" : "26px 40px" }}>
        <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 76 : 64, lineHeight: 1.02, color: pal.ctaColor }}>{TBS_FACTS.requisito}.</span>
      </div>
      <p style={{ margin: 0, maxWidth: 720, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 34 : 30, lineHeight: 1.32, color: pal.text }}>{p.headline}</p>
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 6 }} />}
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 70, bottom: 56 }} />
      <div style={{ position: "absolute", top: story ? 90 : 56, right: story ? 60 : 56 }}>
        <Selo size={story ? 200 : 168} />
      </div>
    </div>
  );
}

// ── 8. CONVITE / DATA ─────────────────────────────────────────────────────────
function ConviteData(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const chip = p.dateChip ?? TBS_FACTS.defaultDateChip;
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", justifyContent: "center", gap: 30, padding: story ? "160px 90px" : "120px 70px" })}>
      <span style={{ width: "fit-content", background: pal.ctaBg, color: pal.ctaColor, fontFamily: TBS.fontDisplay, fontWeight: 800, fontSize: 20, letterSpacing: 1, textTransform: "uppercase", padding: "12px 24px", borderRadius: 999 }}>{chip}</span>
      <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 72 : 60, lineHeight: 1.04, letterSpacing: -0.5, color: pal.text }}>
        {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
      </h1>
      {p.textoPrincipal && (
        <p style={{ margin: 0, maxWidth: 700, fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 32 : 28, lineHeight: 1.32, color: pal.text }}>{p.textoPrincipal}</p>
      )}
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 6 }} />}
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 70, bottom: 56 }} />
      <div style={{ position: "absolute", top: story ? 90 : 56, right: story ? 60 : 56 }}>
        <Selo size={story ? 200 : 168} />
      </div>
    </div>
  );
}

// ── 9. FUNIL ─────────────────────────────────────────────────────────────────
function Funil(p: TemplateProps) {
  const pal = resolvePalette(p.colorway);
  const story = p.format === "story";
  const widths = story ? [900, 620, 340] : [820, 560, 300];
  const rowBg = pal.dark ? "rgba(255,122,30,0.14)" : "rgba(14,0,49,0.08)";
  return (
    <div style={canvasStyle(p.format, pal.bg, { display: "flex", flexDirection: "column", justifyContent: "center", gap: story ? 40 : 30, padding: story ? "150px 90px" : "110px 70px" })}>
      <h1 style={{ margin: 0, fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 60 : 50, lineHeight: 1.05, color: pal.text }}>
        {highlightKeyword(p.headline, p.highlightWord ?? p.persona, pal.accent)}
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {TBS_FACTS.funil.map((fct, i) => (
          <div key={fct.n} style={{ width: widths[i], maxWidth: "100%", background: i === 2 ? pal.ctaBg : rowBg, border: `1px solid ${pal.accent}`, borderRadius: 14, padding: story ? "20px 28px" : "16px 24px", display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 900, fontSize: story ? 58 : 48, color: i === 2 ? pal.ctaColor : pal.accent, lineHeight: 1 }}>{fct.n}</span>
            <span style={{ fontFamily: TBS.fontDisplay, fontWeight: 600, fontSize: story ? 30 : 26, color: i === 2 ? pal.ctaColor : pal.text }}>{fct.label}</span>
          </div>
        ))}
      </div>
      {p.cta && <CtaPill label={p.cta} pal={pal} style={{ marginTop: 8 }} />}
      <LogoSlot logoUrl={p.logoUrl} pal={pal} style={{ position: "absolute", left: story ? 90 : 70, bottom: 56 }} />
      <div style={{ position: "absolute", top: story ? 90 : 56, right: story ? 60 : 56 }}>
        <Selo size={story ? 200 : 168} />
      </div>
    </div>
  );
}

const RENDERERS: Record<TemplateId, (p: TemplateProps) => ReactNode> = {
  "split-panel": SplitPanel,
  citacao: Citacao,
  "foto-dominante": FotoDominante,
  "palco-saude": PalcoSaude,
  "manchete-gigante": MancheteGigante,
  pergunta: Pergunta,
  "requisito-unico": RequisitoUnico,
  "convite-data": ConviteData,
  funil: Funil,
};

export function CreativeTemplate({ templateId, ...props }: TemplateProps & { templateId: TemplateId }) {
  const render = RENDERERS[templateId] ?? SplitPanel;
  return <>{render(props)}</>;
}
