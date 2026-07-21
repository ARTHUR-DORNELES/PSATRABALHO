"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Channel, MetricDefinition } from "@/lib/types";
import { FRONTS } from "@/lib/ui";

type VariantDraft = { key: string; name: string; isControl: boolean };

export function NewExperimentForm({
  channels,
  metrics,
  initialDate,
}: {
  channels: Channel[];
  metrics: MetricDefinition[];
  initialDate?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [hypothesis, setHypothesis] = useState("");
  const [execution, setExecution] = useState("");
  const [audience, setAudience] = useState("");
  const [startedAt, setStartedAt] = useState(initialDate ?? today);
  const [ownerEmail, setOwnerEmail] = useState("crm.psa@profissionaissa.com");
  const [front, setFront] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([
    { key: "control", name: "Controle", isControl: true },
    { key: "A", name: "Variante A", isControl: false },
  ]);
  const [targetMetricKey, setTargetMetricKey] = useState(
    metrics.find((m) => m.kind === "RATE")?.key ?? metrics[0]?.key ?? "",
  );
  const [mdePct, setMdePct] = useState(10);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [power] = useState(0.8);
  const [targetValue, setTargetValue] = useState<string>("");
  const [decisionDeadline, setDecisionDeadline] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetMetric = useMemo(
    () => metrics.find((m) => m.key === targetMetricKey),
    [metrics, targetMetricKey],
  );
  const isRate = targetMetric?.kind === "RATE";

  function setControl(idx: number) {
    setVariants((vs) => vs.map((v, i) => ({ ...v, isControl: i === idx })));
  }
  function updateVariant(idx: number, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }
  function addVariant() {
    const letter = String.fromCharCode(65 + variants.filter((v) => !v.isControl).length); // A, B, C
    setVariants((vs) => [...vs, { key: letter, name: `Variante ${letter}`, isControl: false }]);
  }
  function removeVariant(idx: number) {
    setVariants((vs) => (vs.length <= 2 ? vs : vs.filter((_, i) => i !== idx)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !hypothesis.trim() || !channelId) {
      setError("Preencha nome, canal e hipótese.");
      return;
    }
    if (variants.filter((v) => v.isControl).length !== 1) {
      setError("Marque exatamente uma variante como controle.");
      return;
    }
    if (!isRate && !targetValue) {
      setError("Para métricas de contagem/valor, informe a meta (alvo absoluto).");
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim() || null,
      channelId,
      hypothesis: hypothesis.trim(),
      execution: execution.trim() || null,
      audience: audience.trim() || null,
      startedAt,
      ownerEmail: ownerEmail.trim() || null,
      front: front || null,
      variants: variants.map((v) => ({ key: v.key, name: v.name, isControl: v.isControl })),
      criteria: {
        targetMetricKey,
        minDetectableEffect: mdePct / 100,
        confidenceLevel,
        power,
        targetValue: !isRate && targetValue ? Number(targetValue) : null,
        testType: "two-sided" as const,
        decisionDeadline: decisionDeadline || null,
      },
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Falha (${res.status})`);
      router.push(`/experiments/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {/* O teste */}
      <fieldset className="psa-card space-y-4 p-5">
        <legend className="px-1 font-display text-lg tracking-tight text-white">O teste</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="psa-label">Nome do experimento *</label>
            <input className="psa-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: E-mail de boas-vindas — assunto curto vs. longo" />
          </div>
          <div>
            <label className="psa-label">Código (opcional)</label>
            <input className="psa-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="EXP-2026-006" />
          </div>
          <div>
            <label className="psa-label">Canal *</label>
            <select className="psa-select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="psa-label">Frente</label>
            <select className="psa-select" value={front} onChange={(e) => setFront(e.target.value)}>
              <option value="">Sem frente</option>
              {FRONTS.map((f) => (
                <option key={f.key} value={f.key}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="psa-label">Hipótese * (etapa 1)</label>
            <textarea className="psa-textarea" rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Acreditamos que… porque…" />
          </div>
          <div className="md:col-span-2">
            <label className="psa-label">O que está sendo feito (etapa 2)</label>
            <textarea className="psa-textarea" rows={2} value={execution} onChange={(e) => setExecution(e.target.value)} placeholder="Como o teste está sendo executado (split, canais, criativos)…" />
          </div>
          <div>
            <label className="psa-label">Público</label>
            <input className="psa-input" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div>
            <label className="psa-label">Início</label>
            <input type="date" className="psa-input" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="psa-label">Responsável (e-mail)</label>
            <input className="psa-input" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Variantes */}
      <fieldset className="psa-card space-y-3 p-5">
        <legend className="px-1 font-display text-lg tracking-tight text-white">Variantes</legend>
        <p className="text-xs text-psa-muted">Marque uma como controle (a hipótese a ser batida).</p>
        {variants.map((v, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-psa-muted">
              <input type="radio" name="control" checked={v.isControl} onChange={() => setControl(i)} />
              controle
            </label>
            <input className="psa-input w-20" value={v.key} onChange={(e) => updateVariant(i, { key: e.target.value })} placeholder="chave" />
            <input className="psa-input flex-1" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} placeholder="nome da variante" />
            <button type="button" onClick={() => removeVariant(i)} disabled={variants.length <= 2} className="psa-btn-ghost px-2" title="Remover">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addVariant} className="psa-btn-ghost">
          <Plus size={15} /> Adicionar variante
        </button>
      </fieldset>

      {/* Critério de decisão */}
      <fieldset className="psa-card space-y-4 p-5">
        <legend className="px-1 font-display text-lg tracking-tight text-white">
          Critério de decisão (etapa 5)
        </legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="psa-label">Métrica-alvo</label>
            <select className="psa-select" value={targetMetricKey} onChange={(e) => setTargetMetricKey(e.target.value)}>
              <optgroup label="Taxas (A/B)">
                {metrics.filter((m) => m.kind === "RATE").map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Contagem / valor (meta absoluta)">
                {metrics.filter((m) => m.kind !== "RATE").map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {isRate ? (
            <>
              <div>
                <label className="psa-label">Efeito mínimo relevante (MDE)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={100} className="psa-input" value={mdePct} onChange={(e) => setMdePct(Number(e.target.value))} />
                  <span className="text-sm text-psa-muted">% de lift</span>
                </div>
              </div>
              <div>
                <label className="psa-label">Confiança desejada</label>
                <select className="psa-select" value={confidenceLevel} onChange={(e) => setConfidenceLevel(Number(e.target.value))}>
                  <option value={0.9}>90%</option>
                  <option value={0.95}>95%</option>
                  <option value={0.99}>99%</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="psa-label">Meta (alvo absoluto) *</label>
              <input type="number" className="psa-input" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="Ex: 50" />
            </div>
          )}

          <div>
            <label className="psa-label">Prazo de decisão (opcional)</label>
            <input type="date" className="psa-input" value={decisionDeadline} onChange={(e) => setDecisionDeadline(e.target.value)} />
          </div>
        </div>
      </fieldset>

      {error && <div className="rounded-lg bg-psa-danger/15 px-4 py-2 text-sm text-psa-danger">{error}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="psa-btn-primary">
          {submitting ? "Salvando…" : "Criar experimento"}
        </button>
        <button type="button" onClick={() => router.back()} className="psa-btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
