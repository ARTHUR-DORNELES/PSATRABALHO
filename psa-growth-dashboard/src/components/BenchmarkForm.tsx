"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Channel, MetricDefinition } from "@/lib/types";

export function BenchmarkForm({ channels, metrics }: { channels: Channel[]; metrics: MetricDefinition[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"INTERNAL_HISTORICAL" | "MARKET">("MARKET");
  const [channelId, setChannelId] = useState("");
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!value) {
      setErr("Informe o valor.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          channelId: channelId || null,
          metricKey,
          value: Number(value),
          source: source || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha");
      setValue("");
      setSource("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="psa-card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="psa-label">Tipo</label>
        <select className="psa-select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="MARKET">Mercado</option>
          <option value="INTERNAL_HISTORICAL">Interno (histórico)</option>
        </select>
      </div>
      <div>
        <label className="psa-label">Canal</label>
        <select className="psa-select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
          <option value="">Qualquer</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="psa-label">Métrica</label>
        <select className="psa-select" value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
          {metrics.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="psa-label">Valor</label>
        <input type="number" step="any" className="psa-input w-28" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.26 ou 40" />
      </div>
      <div className="flex-1">
        <label className="psa-label">Fonte</label>
        <input className="psa-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex: relatório de mercado 2025" />
      </div>
      <button type="submit" disabled={busy} className="psa-btn-primary">
        <Plus size={15} /> {busy ? "Salvando…" : "Adicionar"}
      </button>
      {err && <span className="w-full text-xs text-psa-danger">{err}</span>}
    </form>
  );
}
