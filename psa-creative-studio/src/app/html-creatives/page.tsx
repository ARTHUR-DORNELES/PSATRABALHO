import { listCopyEntries, listReferenceImages } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";
import { HtmlCreativesIndex } from "@/components/HtmlCreativesIndex";

export const dynamic = "force-dynamic";

export default async function HtmlCreativesPage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject() : null;
  const [copyEntries, references] = activeProject
    ? await Promise.all([listCopyEntries(activeProject.id), listReferenceImages(activeProject.id)])
    : [[], []];
  const logos = references.filter((r) => r.kind === "logo");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Criativos HTML</h1>
        <p className="mt-1 text-sm text-psa-muted">
          Compõe o criativo em HTML/CSS real, fiel ao design system TBS (sem IA de imagem). A foto
          nunca é gerada: entra como um <strong className="text-white">placeholder nomeado</strong>{" "}
          preenchido depois com uma imagem do <strong className="text-white">Banlek</strong>.
          Escolha um <strong className="text-white">modelo por linha de copy</strong> (é o que
          diferencia as peças), o logo, e abra Feed ou Story numa aba nova.
        </p>
        <p className="mt-2 text-xs text-psa-muted">
          Entrega no Figma: <strong className="text-white">Copiar HTML</strong> → colar no plugin{" "}
          <strong className="text-white">html.to.design</strong> (self-serve). Pra acabamento 100%
          fiel em nós nativos, peça pro Claude compor via MCP a partir dessa mesma copy.
        </p>
      </div>

      {!configured && <SetupNotice />}
      {configured && !activeProject && <MigrationPendingNotice />}
      {configured && activeProject && (
        <HtmlCreativesIndex copyEntries={copyEntries} logos={logos} />
      )}
    </div>
  );
}
