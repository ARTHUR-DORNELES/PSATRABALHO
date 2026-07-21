"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { ReferenceKind } from "@/lib/types";

export function ReferenceUploader({
  count,
  max,
  kind = "style",
  label = "referências",
}: {
  count: number;
  max: number;
  kind?: ReferenceKind;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = count >= max;

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const name = file.name.replace(/\.[^.]+$/, "");
        const form = new FormData();
        form.append("file", file);
        form.append("name", name);
        form.append("kind", kind);
        const res = await fetch("/api/references", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Falha ao subir imagem.");
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao subir imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (full) return;
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => !full && !busy && inputRef.current?.click()}
        className={`psa-card flex flex-col items-center justify-center gap-2 border-dashed p-6 text-center transition-colors ${
          full ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-psa-accent"
        }`}
      >
        <UploadCloud size={24} className="text-psa-accent" />
        <p className="text-sm text-white">
          {full
            ? `Limite de ${max} ${label} atingido.`
            : "Arraste imagens aqui ou clique para escolher (uma ou várias)."}
        </p>
        <p className="text-xs text-psa-muted">
          {count}/{max} {label} enviadas
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>
      {busy && <p className="mt-2 text-xs text-psa-muted">Enviando…</p>}
      {error && <p className="mt-2 text-xs text-psa-danger">{error}</p>}
    </div>
  );
}
