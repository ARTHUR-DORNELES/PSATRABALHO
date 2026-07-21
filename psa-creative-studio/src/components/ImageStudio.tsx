"use client";

import { useState } from "react";
import Link from "next/link";
import { Wand2, Loader2, Download, Check, ImageOff, Bookmark, BookmarkCheck } from "lucide-react";
import { FORMATS } from "@/lib/formats";
import type { ReferenceImage } from "@/lib/types";

export function ImageStudio({ references }: { references: ReferenceImage[] }) {
  const [prompt, setPrompt] = useState("");
  const [formatLabel, setFormatLabel] = useState(FORMATS[0].label);
  const [useRefs, setUseRefs] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const toggleRef = (id: string) =>
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function generate() {
    if (prompt.trim().length < 3) {
      setError("Escreva um prompt.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          formatLabel,
          referenceImageIds: useRefs ? [...selectedRefs] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setImage(data.image);
      setSaveState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = "criativo-ia.png";
    a.click();
  }

  async function saveToLibrary() {
    if (!image) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/saved-images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image, prompt, format: formatLabel }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      setSaveState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
      setSaveState("idle");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* controles */}
      <div className="space-y-5">
        <div>
          <span className="psa-label">Prompt</span>
          <textarea
            className="psa-textarea h-32 resize-none"
            placeholder="Descreva a imagem que você quer. Ex: palco de reality show com holofotes laranja, palestrante em pé, plateia ao fundo, clima épico…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <span className="psa-label">Formato</span>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormatLabel(f.label)}
                className={"psa-btn px-3 py-1.5 text-xs " + (formatLabel === f.label ? "psa-btn-primary" : "psa-btn-ghost")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={useRefs} onChange={(e) => setUseRefs(e.target.checked)} className="accent-psa-accent" />
            <span className="text-sm text-white">Usar referências da biblioteca</span>
          </label>
          {useRefs && (
            references.length === 0 ? (
              <p className="mt-2 text-xs text-psa-muted">
                Nenhuma referência na biblioteca. Suba imagens em <a href="/references" className="text-psa-accent underline">Marca</a>.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {references.map((r) => {
                  const sel = selectedRefs.has(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRef(r.id)}
                      className={"relative h-16 w-16 overflow-hidden rounded-md border " + (sel ? "border-psa-accent ring-2 ring-psa-accent/40" : "border-psa-border")}
                      title={r.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.publicUrl} alt={r.name} className="h-full w-full object-cover" />
                      {sel && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded bg-psa-accent text-[#06231a]">
                          <Check size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        <button className="psa-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50" onClick={generate} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {loading ? "Gerando imagem…" : "Gerar imagem"}
        </button>
        {error && <p className="text-xs text-red-400">Erro: {error}</p>}
      </div>

      {/* resultado */}
      <div className="psa-card flex min-h-[420px] items-center justify-center p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/15 border-t-psa-accent" />
            <p className="text-sm text-psa-muted">A IA está gerando a imagem…</p>
          </div>
        ) : image ? (
          <div className="flex w-full flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="criativo gerado" className="max-h-[70vh] max-w-full rounded-lg border border-psa-border" />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                className="psa-btn-primary px-4 py-2 text-sm disabled:opacity-50"
                onClick={saveToLibrary}
                disabled={saveState !== "idle"}
              >
                {saveState === "saving" ? <Loader2 size={15} className="animate-spin" /> : saveState === "saved" ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {saveState === "saved" ? "Salvo" : "Salvar na Biblioteca de imagem"}
              </button>
              <button className="psa-btn-ghost px-4 py-2 text-sm" onClick={download}>
                <Download size={15} /> Baixar PNG
              </button>
              {saveState === "saved" && (
                <Link href="/biblioteca-imagem" className="psa-btn-ghost px-4 py-2 text-sm">
                  Ver biblioteca →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center text-psa-muted">
            <ImageOff size={32} />
            <p className="text-sm">A imagem gerada aparece aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
