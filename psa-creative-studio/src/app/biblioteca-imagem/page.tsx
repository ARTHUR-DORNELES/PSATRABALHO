import Link from "next/link";
import { SavedImagesGrid } from "@/components/SavedImagesGrid";
import { listSavedImages } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";
import type { SavedImage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BibliotecaImagemPage() {
  let images: SavedImage[] = [];
  if (isSupabaseConfigured()) {
    const project = await resolveActiveProject().catch(() => null);
    if (project) images = await listSavedImages(project.id).catch(() => []);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Biblioteca de imagem</h1>
        <p className="mt-1 max-w-2xl text-sm text-psa-muted">
          As imagens geradas por IA no{" "}
          <Link href="/studio" className="text-psa-accent underline">Estúdio de imagem</Link>{" "}
          que você salvou. Passe o mouse pra baixar ou apagar.
        </p>
      </div>
      <section className="space-y-4">
        <h2 className="font-display text-lg text-white">Salvas ({images.length})</h2>
        <SavedImagesGrid initial={images} />
      </section>
    </div>
  );
}
