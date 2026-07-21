import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCopyEntries } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { CopyImporter } from "@/components/CopyImporter";
import { CopyTable } from "@/components/CopyTable";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";

export const dynamic = "force-dynamic";

export default async function CopyPage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject().catch(() => null) : null;
  const entries = activeProject ? await listCopyEntries(activeProject.id).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-white">
            <span className="text-psa-muted">1 · </span>Copy por persona
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-psa-muted">
            Cole a tabela com as colunas Persona, Prioridade, #, Ângulo, Texto principal, Título
            (headline) e CTA. Cada linha vira uma mensagem pra gerar no Diretor de Arte.
          </p>
        </div>
        {entries.length > 0 && (
          <Link href="/diretor" className="psa-btn-primary px-4 py-2 text-sm">
            Próximo: Diretor de Arte <ArrowRight size={15} />
          </Link>
        )}
      </div>

      {!configured && <SetupNotice />}
      {configured && !activeProject && <MigrationPendingNotice />}
      {configured && activeProject && <CopyImporter />}

      {configured && activeProject && <CopyTable entries={entries} />}
    </div>
  );
}
