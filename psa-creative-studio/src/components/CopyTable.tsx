"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CopyEntry } from "@/lib/types";

export function CopyTable({ entries }: { entries: CopyEntry[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteOne(id: string) {
    if (!window.confirm("Excluir esta copy? Criativos já gerados a partir dela também serão apagados.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/copy/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Falha ao excluir.");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Excluir ${selected.size} linha(s) de copy selecionada(s)? Criativos já gerados a partir delas também serão apagados.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) => fetch(`/api/copy/${id}`, { method: "DELETE" })),
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="psa-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-psa-border px-4 py-3">
        <span className="text-sm font-semibold text-white">Copy salva ({entries.length})</span>
        {selected.size > 0 && (
          <button
            className="psa-btn-ghost px-2 py-1 text-xs text-psa-danger"
            disabled={deleting}
            onClick={deleteSelected}
          >
            <Trash2 size={12} /> Excluir {selected.size} selecionada(s)
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-psa-surface text-psa-muted">
            <tr>
              <th className="w-8 px-4 py-2" />
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Prioridade</th>
              <th className="px-4 py-2">Ângulo</th>
              <th className="px-4 py-2">Headline</th>
              <th className="px-4 py-2">CTA</th>
              <th className="w-10 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-psa-border">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={() => toggle(entry.id)}
                    className="accent-psa-accent"
                  />
                </td>
                <td className="px-4 py-2">{entry.persona}</td>
                <td className="px-4 py-2 text-psa-muted">{entry.prioridade ?? "—"}</td>
                <td className="px-4 py-2 text-psa-muted">{entry.angulo ?? "—"}</td>
                <td className="px-4 py-2">{entry.headline}</td>
                <td className="px-4 py-2 text-psa-muted">{entry.cta ?? "—"}</td>
                <td className="px-4 py-2">
                  <button
                    className="text-psa-muted hover:text-psa-danger"
                    disabled={deleting}
                    onClick={() => deleteOne(entry.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-psa-muted">
                  Nenhuma copy importada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
