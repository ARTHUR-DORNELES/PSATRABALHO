"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { SpecRenderer } from "@/components/html-creatives/SpecRenderer";
import { sanitizeSpec } from "@/lib/layout-spec";
import { getFormat } from "@/lib/formats";
import type { SavedCreative } from "@/lib/types";

const THUMB_W = 220;

export function SavedCreativesGrid({ initial }: { initial: SavedCreative[] }) {
  const [items, setItems] = useState<SavedCreative[]>(initial);

  async function remove(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id)); // otimista
    try {
      await fetch(`/api/saved-creatives?id=${id}`, { method: "DELETE" });
    } catch {
      /* se falhar, o próximo refresh reconcilia */
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-psa-muted">
        Nenhum criativo salvo ainda. Gere no{" "}
        <Link href="/diretor" className="text-psa-accent underline">Diretor de Arte</Link>{" "}
        e clique em <strong className="text-white">Salvar na biblioteca</strong>.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {items.map((s) => {
        const spec = sanitizeSpec(s.spec);
        const f = getFormat(s.format);
        const scale = THUMB_W / f.w;
        return (
          <div key={s.id} className="relative rounded-xl border border-psa-border bg-psa-card p-3" style={{ width: THUMB_W + 24 }}>
            <button
              onClick={() => remove(s.id)}
              className="absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-psa-border bg-psa-bg/80 text-psa-muted hover:text-red-400"
              aria-label="apagar"
              title="Apagar da biblioteca"
            >
              <Trash2 size={13} />
            </button>
            <div style={{ width: THUMB_W, height: f.h * scale }} className="overflow-hidden rounded-lg border border-psa-border bg-black">
              {spec ? (
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: f.w, height: f.h }}>
                  <SpecRenderer spec={spec} w={f.w} h={f.h} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-psa-muted">spec inválida</div>
              )}
            </div>
            <div className="mt-2">
              <div className="text-xs font-semibold text-white">{s.concept ?? "Criativo"}</div>
              <div className="text-[11px] text-psa-muted">
                {f.label}
                {s.persona ? ` · ${s.persona}` : ""}
              </div>
              {spec && (
                <Link
                  href={`/diretor/render/${s.format}?spec=${encodeURIComponent(JSON.stringify(spec))}`}
                  target="_blank"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-psa-accent hover:underline"
                >
                  <ExternalLink size={11} /> abrir / copiar HTML
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
