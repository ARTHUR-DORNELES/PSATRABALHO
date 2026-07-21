import { listReferenceImages } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { ImageStudio } from "@/components/ImageStudio";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";
import type { ReferenceImage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject().catch(() => null) : null;
  let references: ReferenceImage[] = [];
  if (activeProject) references = await listReferenceImages(activeProject.id).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Estúdio de imagem (IA)</h1>
        <p className="mt-1 max-w-2xl text-sm text-psa-muted">
          Geração de imagem por IA (Gemini). Escreva um <strong className="text-white">prompt</strong>,
          escolha o <strong className="text-white">formato</strong> e, se quiser, use{" "}
          <strong className="text-white">referências</strong> da biblioteca como direção de estilo.
        </p>
      </div>

      {!configured && <SetupNotice />}
      {configured && !activeProject && <MigrationPendingNotice />}
      {configured && activeProject && <ImageStudio references={references} />}
    </div>
  );
}
