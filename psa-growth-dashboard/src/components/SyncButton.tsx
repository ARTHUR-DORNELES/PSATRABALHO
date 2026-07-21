"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/sync", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha");
      setMsg(`${j.experimentsTouched} experimentos · ${j.snapshotsWritten} snapshots`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-psa-muted">{msg}</span>}
      <button type="button" onClick={run} disabled={busy} className="psa-btn-primary">
        <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
        {busy ? "Sincronizando…" : "Sincronizar agora"}
      </button>
    </div>
  );
}
