import Link from "next/link";
import { CreativeLibrary } from "@/components/CreativeLibrary";
import { SavedCreativesGrid } from "@/components/SavedCreativesGrid";
import { listSavedCreatives } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";
import type { SavedCreative } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  let saved: SavedCreative[] = [];
  if (isSupabaseConfigured()) {
    const project = await resolveActiveProject().catch(() => null);
    if (project) saved = await listSavedCreatives(project.id).catch(() => []);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Biblioteca de criativos</h1>
        <p className="mt-1 max-w-2xl text-sm text-psa-muted">
          Os criativos que você salvou no{" "}
          <Link href="/diretor" className="text-psa-accent underline">Diretor de Arte</Link>, com
          preview e opção de levar pro Figma. Abaixo, o catálogo de modelos da marca.
        </p>
      </div>

      {/* seção 1: criativos salvos */}
      <section className="space-y-4">
        <h2 className="font-display text-lg text-white">Meus criativos salvos ({saved.length})</h2>
        <SavedCreativesGrid initial={saved} />
      </section>

      {/* seção 2: catálogo de modelos */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg text-white">Catálogo de modelos</h2>
          <p className="mt-1 text-sm text-psa-muted">
            Tipos de criativo na marca TBS, sem foto (a foto entra depois, do Banlek). Copy
            ilustrativa — pra gerar com sua matriz real, use o Diretor de Arte.
          </p>
        </div>
        <CreativeLibrary />
      </section>
    </div>
  );
}
