"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({ url, title = "Remover" }: { url: string; title?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (!confirm("Confirmar remoção?")) return;
    setBusy(true);
    try {
      await fetch(url, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={onClick} disabled={busy} title={title} className="text-psa-muted hover:text-psa-danger">
      <Trash2 size={15} />
    </button>
  );
}
