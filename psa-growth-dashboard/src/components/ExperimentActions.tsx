"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";

export function ExperimentActions({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "recompute" | "suggest">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "recompute" | "suggest") {
    setBusy(action);
    setError(null);
    try {
      const url =
        action === "recompute"
          ? `/api/experiments/${experimentId}/recompute`
          : `/api/ai/suggest`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: action === "suggest" ? JSON.stringify({ experimentId }) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Falha (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => run("recompute")}
          disabled={busy !== null}
          className="psa-btn-ghost"
        >
          <RefreshCw size={15} className={busy === "recompute" ? "animate-spin" : ""} />
          Recalcular
        </button>
        <button
          type="button"
          onClick={() => run("suggest")}
          disabled={busy !== null}
          className="psa-btn-primary"
        >
          <Sparkles size={15} className={busy === "suggest" ? "animate-pulse" : ""} />
          Gerar sugestões
        </button>
      </div>
      {error && <span className="text-xs text-psa-danger">{error}</span>}
    </div>
  );
}
