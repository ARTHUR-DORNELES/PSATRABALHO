"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Channel, MetricDefinition } from "@/lib/types";

export function GoalForm({ channels, metrics }: { channels: Channel[]; metrics: MetricDefinition[] }) {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [channelId, setChannelId] = useState("");
  const [metricKey, setMetricKey] = useState("leads");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goalMetrics = metrics.filter((m) => m.kind !== "RATE");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!target) {
      setErr("Informe a meta.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          referenceMonth: `${month}-01`,
          channelId: channelId || null,
          metricKey,
          targetValue: Number(target),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falha");
      setTarget("");
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
        <label className="psa-label">Mês</label>
        <input type="month" className="psa-input" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div>
        <label className="psa-label">Canal</label>
        <select className="psa-select" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
          <option value="">Todos (agregado)</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="psa-label">Métrica</label>
        <select className="psa-select" value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
          {goalMetrics.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="psa-label">Meta</label>
        <input type="number" className="psa-input w-32" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ex: 4000" />
      </div>
      <button type="submit" disabled={busy} className="psa-btn-primary">
        <Plus size={15} /> {busy ? "Salvando…" : "Definir meta"}
      </button>
      {err && <span className="text-xs text-psa-danger">{err}</span>}
    </form>
  );
}
