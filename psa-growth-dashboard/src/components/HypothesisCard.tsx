"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Beaker, Pencil, Check, X } from "lucide-react";

type Props = {
  experimentId: string;
  startedLabel: string;
  name: string;
  hypothesis: string;
  execution: string | null;
  audience: string | null;
};

export function HypothesisCard(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(props.name);
  const [hypothesis, setHypothesis] = useState(props.hypothesis);
  const [execution, setExecution] = useState(props.execution ?? "");
  const [audience, setAudience] = useState(props.audience ?? "");

  function start() {
    setName(props.name);
    setHypothesis(props.hypothesis);
    setExecution(props.execution ?? "");
    setAudience(props.audience ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (name.trim().length < 3) {
      setError("O título precisa de ao menos 3 caracteres.");
      return;
    }
    if (hypothesis.trim().length < 3) {
      setError("A hipótese precisa de ao menos 3 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/${props.experimentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          hypothesis: hypothesis.trim(),
          execution: execution.trim() || null,
          audience: audience.trim() || null,
        }),
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

  return (
    <section className="psa-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-psa-accent" />
          <h2 className="font-display text-lg tracking-tight text-white">Hipótese & execução</h2>
        </div>
        {!editing && (
          <button type="button" onClick={start} className="psa-btn-ghost px-2 py-1 text-xs">
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 text-sm">
          <div>
            <label className="psa-label">Título do experimento</label>
            <input className="psa-input" value={name} onChange={(e) => setName(e.target.value)} />
            <p className="mt-1 text-[11px] text-psa-muted">Aparece no topo da página.</p>
          </div>
          <div>
            <label className="psa-label">Hipótese</label>
            <textarea
              className="psa-textarea"
              rows={3}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Acreditamos que… porque…"
            />
          </div>
          <div>
            <label className="psa-label">O que está sendo feito</label>
            <textarea
              className="psa-textarea"
              rows={2}
              value={execution}
              onChange={(e) => setExecution(e.target.value)}
              placeholder="Como o teste está sendo executado…"
            />
          </div>
          <div>
            <label className="psa-label">Público</label>
            <input
              className="psa-input"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ex: B2C/B2B"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-psa-danger/15 px-3 py-2 text-xs text-psa-danger">{error}</div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={save} disabled={saving} className="psa-btn-primary">
              <Check size={15} /> {saving ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={cancel} disabled={saving} className="psa-btn-ghost">
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="psa-label">Hipótese (início {props.startedLabel})</dt>
            <dd className="whitespace-pre-wrap text-psa-ice">{props.hypothesis}</dd>
          </div>
          <div>
            <dt className="psa-label">O que está sendo feito</dt>
            <dd className="whitespace-pre-wrap text-psa-ice">{props.execution ?? "—"}</dd>
          </div>
          <div>
            <dt className="psa-label">Público</dt>
            <dd className="text-psa-muted">{props.audience ?? "—"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
