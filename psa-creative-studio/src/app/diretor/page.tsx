import { ArtDirector, type CopyOption } from "@/components/ArtDirector";
import { listCopyEntries } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";

export const dynamic = "force-dynamic";

export default async function DiretorPage() {
  let copies: CopyOption[] = [];
  if (isSupabaseConfigured()) {
    const project = await resolveActiveProject().catch(() => null);
    if (project) {
      const entries = await listCopyEntries(project.id).catch(() => []);
      copies = entries.map((e) => ({
        persona: e.persona,
        headline: e.headline,
        textoPrincipal: e.textoPrincipal,
        cta: e.cta ?? "Inscreva-se",
        angulo: e.angulo ?? "",
      }));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Diretor de Arte</h1>
        <p className="mt-1 max-w-2xl text-sm text-psa-muted">
          Escolha a <strong className="text-white">copy</strong> e a{" "}
          <strong className="text-white">IA propõe</strong> layouts diferentes entre si, na marca TBS
          (logo, selo e fonte reais, sem foto). Marque os que gostou, evolua, e salve na Biblioteca.
        </p>
      </div>
      <ArtDirector copies={copies} />
    </div>
  );
}
