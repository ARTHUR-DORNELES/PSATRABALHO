import { listReferenceImages } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { ReferenceUploader } from "@/components/ReferenceUploader";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";
import { MAX_REFERENCE_IMAGES, MAX_LOGO_IMAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject() : null;
  const all = activeProject ? await listReferenceImages(activeProject.id) : [];
  const styleReferences = all.filter((r) => r.kind === "style");
  const logos = all.filter((r) => r.kind === "logo");

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Imagens de referência</h1>
        <p className="mt-1 text-sm text-psa-muted">
          Suba até {MAX_REFERENCE_IMAGES} peças que representem o estilo visual que a IA deve
          seguir (paleta, tipografia, composição). Elas serão usadas como base no Estúdio.
        </p>
      </div>

      {!configured && <SetupNotice />}
      {configured && !activeProject && <MigrationPendingNotice />}

      {configured && activeProject && (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-psa-muted">
              Referências de estilo
            </h2>
            <ReferenceUploader
              count={styleReferences.length}
              max={MAX_REFERENCE_IMAGES}
              kind="style"
              label="referências"
            />
            {styleReferences.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {styleReferences.map((ref) => (
                  <div key={ref.id} className="psa-card overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.publicUrl}
                      alt={ref.name}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-2 text-xs text-psa-muted">{ref.name}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-psa-muted">
                Logo da marca
              </h2>
              <p className="mt-1 text-xs text-psa-muted">
                Suba variações do logo oficial (fundo escuro, fundo claro, só o ícone…). No
                Estúdio você escolhe qual usar em cada geração — a IA recebe o logo à parte e é
                instruída a reproduzi-lo exatamente, sem redesenhar.
              </p>
            </div>
            <ReferenceUploader
              count={logos.length}
              max={MAX_LOGO_IMAGES}
              kind="logo"
              label="variações de logo"
            />
            {logos.length > 0 && (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {logos.map((ref) => (
                  <div key={ref.id} className="psa-card overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.publicUrl}
                      alt={ref.name}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-2 text-xs text-psa-muted">{ref.name}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
