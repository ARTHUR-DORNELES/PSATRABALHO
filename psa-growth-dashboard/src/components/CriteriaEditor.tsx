"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

export function CriteriaEditor({
  experimentId,
  mde,
  confidence,
}: {
  experimentId: string;
  mde: number;
  confidence: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mdePct, setMdePct] = useState(Math.round(mde * 100));
  const [conf, setConf] = useState(confidence);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/${experimentId}/criteria`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minDetectableEffect: mdePct / 100, confidenceLevel: conf }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Falha (${res.status})`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-3 flex items-center justify-between border-t border-psa-border pt-3 text-xs">
        <span className="text-psa-muted">
          Critério: MDE {Math.round(mde * 100)}% · confiança {Math.round(confidence * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            setMdePct(Math.round(mde * 100));
            setConf(confidence);
            setError(null);
            setEditing(true);
          }}
          className="flex items-center gap-1 font-semibold text-psa-muted hover:text-psa-accent"
        >
          <Pencil size={12} /> Editar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-psa-border pt-3 text-xs">
      <div className="flex items-center gap-2">
        <label className="w-28 text-psa-muted">MDE (% de lift)</label>
        <input
          type="number"
          min={1}
          max={100}
          className="psa-input w-20"
          value={mdePct}
          onChange={(e) => setMdePct(Number(e.target.value))}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="w-28 text-psa-muted">Confiança</label>
        <select
          className="psa-select w-24"
          value={conf}
          onChange={(e) => setConf(Number(e.target.value))}
        >
          <option value={0.9}>90%</option>
          <option value={0.95}>95%</option>
          <option value={0.99}>99%</option>
        </select>
      </div>
      {error && <div className="text-psa-danger">{error}</div>}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={save} disabled={saving} className="psa-btn-primary px-2 py-1 text-xs">
          <Check size={13} /> {saving ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={saving}
          className="psa-btn-ghost px-2 py-1 text-xs"
        >
          <X size={13} /> Cancelar
        </button>
      </div>
    </div>
  );
}
