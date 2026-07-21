import { CreativeTemplate } from "@/components/html-creatives/CreativeTemplate";
import { TEMPLATES, buildPhotoNote, type TemplateId, type TemplateProps } from "@/lib/html-creative-brand";

export const dynamic = "force-dynamic";

// Galeria de modelos com copy de exemplo — não toca no Supabase. Serve pra
// ver os 4 arquétipos lado a lado (Feed + Story) sem precisar importar copy.
const SAMPLE: Omit<TemplateProps, "format"> = {
  persona: "Médico",
  headline: "O que um médico tem a dizer que 3.000 pessoas pagariam pra ouvir?",
  textoPrincipal: "Descubra no maior reality de palestrantes do Brasil.",
  cta: "Inscreva-se agora",
  logoUrl: null,
  photoNote: buildPhotoNote("Médico", "Identidade / orgulho"),
};

function ScaledFrame({
  templateId,
  format,
  scale,
}: {
  templateId: TemplateId;
  format: "feed" | "story";
  scale: number;
}) {
  const w = 1080;
  const h = format === "feed" ? 1080 : 1920;
  return (
    <div
      style={{ width: w * scale, height: h * scale }}
      className="overflow-hidden rounded-lg border border-psa-border"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>
        <CreativeTemplate templateId={templateId} format={format} {...SAMPLE} />
      </div>
    </div>
  );
}

export default function TemplatePreviewPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Galeria de modelos</h1>
        <p className="mt-1 text-sm text-psa-muted">
          Os 4 arquétipos com copy de exemplo. Cada linha de copy na aba Criativos HTML pode usar um
          modelo diferente.
        </p>
      </div>

      {TEMPLATES.map((t) => (
        <div key={t.id} className="space-y-3">
          <div>
            <h2 className="font-display text-lg text-white">
              {t.label}
              {!t.hasPhoto && <span className="text-psa-accent"> · sem foto</span>}
            </h2>
            <p className="text-xs text-psa-muted">{t.desc}</p>
          </div>
          <div className="flex flex-wrap items-start gap-6">
            <div>
              <p className="mb-1 text-xs text-psa-muted">Feed 1080×1080</p>
              <ScaledFrame templateId={t.id} format="feed" scale={0.3} />
            </div>
            <div>
              <p className="mb-1 text-xs text-psa-muted">Story 1080×1920</p>
              <ScaledFrame templateId={t.id} format="story" scale={0.3} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
