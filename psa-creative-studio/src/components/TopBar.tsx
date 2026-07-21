import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import type { Project } from "@/lib/types";

// Barra superior estilo editor (Figma/Photoshop): marca à esquerda,
// contexto do projeto à direita.
export function TopBar({
  projects,
  activeProjectId,
}: {
  projects: Project[];
  activeProjectId: string | null;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-psa-border bg-psa-surface px-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-psa-grad font-display text-sm font-bold text-[#06231a]">
          C
        </span>
        <span className="font-display text-sm font-bold tracking-tight psa-grad-text">CREATIVE</span>
        <span className="ml-1 rounded bg-psa-card px-2 py-0.5 text-[10px] uppercase tracking-widest text-psa-muted">
          Estúdio
        </span>
      </div>
      <ProjectSwitcher projects={projects} activeProjectId={activeProjectId} />
    </header>
  );
}
