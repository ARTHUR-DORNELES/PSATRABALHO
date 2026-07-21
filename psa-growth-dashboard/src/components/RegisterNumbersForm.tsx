"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import type { LatestMetrics, MetricDefinition } from "@/lib/types";

type V = { id: string; name: string; isControl: boolean };

export function RegisterNumbersForm({
  experimentId,
  variants,
  metricDefs,
  targetMetricKey,
  latestMetrics,
}: {
  experimentId: string;
  variants: V[];
  metricDefs: MetricDefinition[];
  targetMetricKey: string | null;
  latestMetrics: LatestMetrics;
}) {
  const router = useRouter();
  const byKey = new Map(metricDefs.map((m) => [m.key, m]));
  const target = targetMetricKey ? byKey.get(targetMetricKey) : undefined;

  // Campos a coletar: numerador/denominador do alvo (se RATE) + retorno essencial.
  const fieldKeys: string[] = [];
  if (target?.kind === "RATE") {
    if (target.rateOf.denominator) fieldKeys.push(target.rateOf.denominator);
    if (target.rateOf.numerator) fieldKeys.push(target.rateOf.numerator);
  } else if (target) {
    fieldKeys.push(target.key);
  }
  for (const k of ["leads", "revenue", "cost"]) {
    if (byKey.has(k) && !fieldKeys.includes(k)) fieldKeys.push(k);
  }
  const fields = fieldKeys.map((k) => byKey.get(k)!).filter(Boolean);

  const init: Record<string, Record<string, string>> = {};
  for (const v of variants) {
    init[v.id] = {};
    for (const f of fields) {
      const snap = latestMetrics[v.id]?.[f.key];
      init[v.id][f.key] = snap != null ? String(snap.value) : "";
    }
  }

  const [vals, setVals] = useState(init);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setVal(vid: string, key: string, value: string) {
    setVals((s) => ({ ...s, [vid]: { ...s[vid], [key]: value } }));
  }

  function rate(vid: string): string {
    if (target?.kind !== "RATE" || !target.rateOf.numerator || !target.rateOf.denominator) return "";
    const num = parseFloat(vals[vid]?.[target.rateOf.numerator] ?? "");
    const den = parseFloat(vals[vid]?.[target.rateOf.denominator] ?? "");
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return "";
    return ((num / den) * 100).toFixed(2) + "%";
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const rows = variants
        .map((v) => {
          const values: Record<string, number> = {};
          for (const f of fields) {
            const n = parseFloat(vals[v.id]?.[f.key] ?? "");
            if (Number.isFinite(n)) values[f.key] = n;
          }
          return { variantId: v.id, values };
        })
        .filter((r) => Object.keys(r.values).length > 0);
      if (rows.length === 0) {
        setError("Informe ao menos um número.");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/experiments/${experimentId}/snapshots`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Falha (${res.status})`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (fields.length === 0) return null;

  return (
    <section className="psa-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-psa-accent" />
          <h2 className="font-display text-lg tracking-tight text-white">Registrar números</h2>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="psa-btn-ghost px-2 py-1 text-xs">
            Lançar números de hoje
          </button>
        )}
      </div>

      {!open ? (
        <p className="text-sm text-psa-muted">
          Lance os números atuais de cada variante para calcular confiança, retorno e recomendação. Cada
          lançamento vira um ponto na série temporal.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-psa-border text-left text-[11px] uppercase tracking-wide text-psa-muted">
                  <th className="py-2 pr-3 font-semibold">Variante</th>
                  {fields.map((f) => (
                    <th key={f.key} className="py-2 pr-3 font-semibold">
                      {f.label}
                    </th>
                  ))}
                  {target?.kind === "RATE" && <th className="py-2 pr-3 font-semibold">{target.label}</th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-b border-psa-border/50">
                    <td className="py-2 pr-3 text-white">
                      {v.name}
                      {v.isControl && <span className="ml-1 text-psa-muted">(controle)</span>}
                    </td>
                    {fields.map((f) => (
                      <td key={f.key} className="py-2 pr-3">
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          className="psa-input w-28"
                          value={vals[v.id]?.[f.key] ?? ""}
                          onChange={(e) => setVal(v.id, f.key, e.target.value)}
                          placeholder={f.unit ?? ""}
                        />
                      </td>
                    ))}
                    {target?.kind === "RATE" && (
                      <td className="py-2 pr-3 font-semibold text-psa-accent">{rate(v.id) || "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {target?.kind === "RATE" && target.rateOf.numerator && target.rateOf.denominator && (
            <p className="text-[11px] text-psa-muted">
              {target.label} = {byKey.get(target.rateOf.numerator)?.label} ÷{" "}
              {byKey.get(target.rateOf.denominator)?.label} (calculada automaticamente).
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-psa-danger/15 px-3 py-2 text-xs text-psa-danger">{error}</div>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={saving} className="psa-btn-primary">
              <Check size={15} /> {saving ? "Salvando…" : "Salvar e recalcular"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={saving}
              className="psa-btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
