import { Suspense } from "react";
import { listCreativesWithDetails } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { CreativesGallery } from "@/components/CreativesGallery";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";

export const dynamic = "force-dynamic";

export default async function CreativesPage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject() : null;
  const creatives = activeProject ? await listCreativesWithDetails(activeProject.id) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Criativos gerados</h1>
        <p className="mt-1 text-sm text-psa-muted">
          Todas as imagens geradas no Estúdio, agrupadas por persona. Refine, baixe, use como
          referência ou abra no Figma direto daqui.
        </p>
      </div>

      {!configured && <SetupNotice />}
      {configured && !activeProject && <MigrationPendingNotice />}
      {configured && activeProject && (
        <Suspense fallback={<p className="text-sm text-psa-muted">Carregando…</p>}>
          <CreativesGallery creatives={creatives} />
        </Suspense>
      )}
    </div>
  );
}
