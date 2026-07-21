"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCopyPaste } from "@/lib/copy-parser";

export function CopyImporter() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const preview = useMemo(() => (raw.trim() ? parseCopyPaste(raw) : null), [raw]);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao salvar.");
      setSuccess(
        `${body.created.length} linha(s) importada(s)` +
          (body.skipped ? `, ${body.skipped} ignorada(s) por estarem incompletas.` : "."),
      );
      setRaw("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="psa-card space-y-3 p-5">
      <div>
        <label className="psa-label">Colar tabela de copy (TSV)</label>
        <textarea
          className="psa-textarea h-40 font-mono text-xs"
          placeholder="Cole aqui as linhas copiadas do Sheets/Excel: Persona, Prioridade, #, Ângulo, Texto principal, Título (headline), CTA…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>

      {preview && (
        <p className="text-xs text-psa-muted">
          Pré-visualização: <strong className="text-white">{preview.rows.length}</strong> linha(s)
          válida(s){preview.skipped > 0 && `, ${preview.skipped} ignorada(s) (faltando campo obrigatório)`}
          .
        </p>
      )}

      {preview && preview.rows.length > 0 && (
        <div className="max-h-64 overflow-auto rounded-lg border border-psa-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-psa-surface text-psa-muted">
              <tr>
                <th className="px-3 py-2">Persona</th>
                <th className="px-3 py-2">Ângulo</th>
                <th className="px-3 py-2">Headline</th>
                <th className="px-3 py-2">CTA</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i} className="border-t border-psa-border">
                  <td className="px-3 py-2">{r.persona}</td>
                  <td className="px-3 py-2 text-psa-muted">{r.angulo ?? "—"}</td>
                  <td className="px-3 py-2">{r.headline}</td>
                  <td className="px-3 py-2 text-psa-muted">{r.cta ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="psa-btn-primary"
          disabled={busy || !preview?.rows.length}
          onClick={handleSave}
        >
          {busy ? "Salvando…" : "Salvar linhas importadas"}
        </button>
        {error && <span className="text-xs text-psa-danger">{error}</span>}
        {success && <span className="text-xs text-psa-success">{success}</span>}
      </div>
    </div>
  );
}
