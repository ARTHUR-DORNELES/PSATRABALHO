import Link from "next/link";
import { FileText, Sparkles, Library, ArrowRight, Wand2 } from "lucide-react";
import { listCopyEntries, listSavedCreatives } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";
import { SetupNotice } from "@/components/SetupNotice";
import { MigrationPendingNotice } from "@/components/MigrationPendingNotice";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const activeProject = configured ? await resolveActiveProject().catch(() => null) : null;

  if (!configured || !activeProject) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-8">
        <div>
          <h1 className="font-display text-2xl text-white">PSA Creative Studio</h1>
          <p className="mt-1 text-sm text-psa-muted">Gerador de criativos na marca TBS.</p>
        </div>
        {!configured ? <SetupNotice /> : <MigrationPendingNotice />}
      </div>
    );
  }

  const [copyEntries, saved] = await Promise.all([
    listCopyEntries(activeProject.id).catch(() => []),
    listSavedCreatives(activeProject.id).catch(() => []),
  ]);

  const steps = [
    {
      n: 1, href: "/copy", icon: FileText, label: "Copy",
      value: copyEntries.length, hint: "mensagens / personas",
      desc: "Defina as mensagens que viram criativo.",
    },
    {
      n: 2, href: "/diretor", icon: Sparkles, label: "Diretor de Arte",
      value: null, hint: "gerar com IA",
      desc: "A IA propõe layouts diferentes; você escolhe e evolui.",
    },
    {
      n: 3, href: "/biblioteca", icon: Library, label: "Biblioteca",
      value: saved.length, hint: "criativos salvos",
      desc: "Seus criativos salvos, com preview e export pro Figma.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-white">Visão geral</h1>
          <p className="mt-1 text-sm text-psa-muted">
            Projeto: <strong className="text-white">{activeProject.name}</strong>. O fluxo é simples —
            da copy ao criativo salvo, pronto pro Figma.
          </p>
        </div>
        <Link href="/diretor" className="psa-btn-primary px-5 py-2.5 text-sm">
          <Wand2 size={16} /> Criar agora
        </Link>
      </div>

      {/* funil de 3 passos */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {steps.map((s, i) => (
          <div key={s.href} className="flex flex-1 items-stretch gap-3">
            <Link href={s.href} className="psa-card group flex flex-1 flex-col justify-between p-5 hover:border-psa-accent">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-psa-accent/15 text-xs font-bold text-psa-accent">{s.n}</span>
                  <s.icon size={18} className="text-psa-accent" />
                </div>
                <div className="mt-3 text-sm font-semibold text-white">{s.label}</div>
                <p className="mt-1 text-xs text-psa-muted">{s.desc}</p>
              </div>
              <div className="mt-4">
                {s.value !== null ? (
                  <>
                    <span className="psa-kpi">{s.value}</span>
                    <span className="ml-2 text-xs text-psa-muted">{s.hint}</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-psa-accent">
                    {s.hint} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </div>
            </Link>
            {i < steps.length - 1 && (
              <div className="hidden items-center text-psa-border sm:flex">
                <ArrowRight size={18} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="psa-card p-5">
        <div className="text-sm font-semibold text-white">Como funciona</div>
        <ol className="mt-2 space-y-1 text-sm text-psa-muted">
          <li><strong className="text-white">1.</strong> Em <Link href="/copy" className="text-psa-accent underline">Copy</Link>, cole/importe suas mensagens por persona.</li>
          <li><strong className="text-white">2.</strong> No <Link href="/diretor" className="text-psa-accent underline">Diretor de Arte</Link>, gere levas de criativos, marque os melhores e evolua.</li>
          <li><strong className="text-white">3.</strong> Salve os preferidos na <Link href="/biblioteca" className="text-psa-accent underline">Biblioteca</Link> e leve pro Figma (Copiar HTML).</li>
        </ol>
      </div>
    </div>
  );
}
