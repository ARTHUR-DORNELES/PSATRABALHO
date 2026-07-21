"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({
  projects,
  activeProjectId,
}: {
  projects: Project[];
  activeProjectId: string | null;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setActiveProject(projectId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Falha ao trocar de projeto.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao trocar de projeto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao criar projeto.");
      setName("");
      setCreating(false);
      await setActiveProject(body.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar projeto.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] uppercase tracking-widest text-psa-muted sm:inline">Projeto</span>
      {!creating ? (
        <>
          <select
            className="rounded-md border border-psa-border bg-psa-bg px-2 py-1 text-xs text-white focus:border-psa-accent focus:outline-none"
            value={activeProjectId ?? ""}
            disabled={busy || projects.length === 0}
            onChange={(e) => setActiveProject(e.target.value)}
          >
            {projects.length === 0 && <option value="">Nenhum projeto</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md border border-psa-border text-psa-muted hover:border-psa-accent hover:text-white"
            title="Novo projeto"
            onClick={() => setCreating(true)}
          >
            <Plus size={14} />
          </button>
        </>
      ) : (
        <div className="flex gap-1">
          <input
            className="rounded-md border border-psa-border bg-psa-bg px-2 py-1 text-xs text-white focus:border-psa-accent focus:outline-none"
            placeholder="Nome do projeto"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            onBlur={() => !name.trim() && setCreating(false)}
          />
          <button className="psa-btn-primary px-2 text-xs" disabled={busy || !name.trim()} onClick={handleCreate}>
            Criar
          </button>
        </div>
      )}
      {error && <span className="text-[11px] text-psa-danger">{error}</span>}
    </div>
  );
}
