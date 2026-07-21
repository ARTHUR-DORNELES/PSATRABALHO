"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import type { SavedImage } from "@/lib/types";

export function SavedImagesGrid({ initial }: { initial: SavedImage[] }) {
  const [items, setItems] = useState<SavedImage[]>(initial);

  async function remove(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/saved-images?id=${id}`, { method: "DELETE" });
    } catch {
      /* reconcilia no próximo refresh */
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-psa-muted">
        Nenhuma imagem salva ainda. Gere no{" "}
        <Link href="/studio" className="text-psa-accent underline">Estúdio de imagem</Link>{" "}
        e clique em <strong className="text-white">Salvar na Biblioteca de imagem</strong>.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((img) => (
        <div key={img.id} className="group relative overflow-hidden rounded-xl border border-psa-border bg-psa-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.publicUrl} alt={img.prompt ?? "imagem"} className="aspect-square w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              href={img.publicUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-psa-border bg-psa-bg/90 text-psa-muted hover:text-white"
              title="Baixar"
            >
              <Download size={13} />
            </a>
            <button
              onClick={() => remove(img.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-psa-border bg-psa-bg/90 text-psa-muted hover:text-red-400"
              title="Apagar"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {img.prompt && (
            <div className="p-2 text-[11px] text-psa-muted line-clamp-2">{img.prompt}</div>
          )}
        </div>
      ))}
    </div>
  );
}
