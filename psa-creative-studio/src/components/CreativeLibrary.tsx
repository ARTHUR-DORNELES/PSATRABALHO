"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { TEMPLATES, buildSampleProps, type TemplateId } from "@/lib/html-creative-brand";
import { CreativeTemplate } from "@/components/html-creatives/CreativeTemplate";

type Format = "feed" | "story";

const THUMB_W = 240; // largura do cartão; a peça (1080px) é escalada pra caber

function Thumb({ templateId, format }: { templateId: TemplateId; format: Format }) {
  const h = format === "feed" ? 1080 : 1920;
  const scale = THUMB_W / 1080;
  return (
    <div
      style={{ width: THUMB_W, height: h * scale }}
      className="overflow-hidden rounded-lg border border-psa-border bg-black"
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1080, height: h }}>
        <CreativeTemplate templateId={templateId} {...buildSampleProps(format)} />
      </div>
    </div>
  );
}

export function CreativeLibrary() {
  const [format, setFormat] = useState<Format>("feed");
  const [selected, setSelected] = useState<Set<TemplateId>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggle = (id: TemplateId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function copyBrief() {
    const picked = TEMPLATES.filter((t) => selected.has(t.id));
    const lines = picked.map(
      (t) => `- ${t.label} (${t.id}) · ${format}${t.hasPhoto ? " · com placeholder de foto" : " · sem foto"}`,
    );
    const brief =
      `Levar pro Figma — ${picked.length} peça(s), formato ${format}:\n` +
      lines.join("\n") +
      `\n\nPeça pro Claude: "compõe esses tipos no Figma com a copy [persona/ângulo]".`;
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard bloqueado — ignore */
    }
  }

  return (
    <div className="space-y-5 pb-28">
      {/* toggle de formato */}
      <div className="flex items-center gap-2">
        {(["feed", "story"] as Format[]).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={
              "psa-btn px-3 py-1.5 text-xs " +
              (format === f ? "psa-btn-primary" : "psa-btn-ghost")
            }
          >
            {f === "feed" ? "Feed 1080×1080" : "Story 1080×1920"}
          </button>
        ))}
        <span className="ml-2 text-xs text-psa-muted">
          {TEMPLATES.length} tipos · clique pra selecionar, ou abra pra copiar o HTML
        </span>
      </div>

      {/* grade de tipos */}
      <div className="flex flex-wrap gap-5">
        {TEMPLATES.map((t) => {
          const isSel = selected.has(t.id);
          return (
            <div
              key={t.id}
              className={
                "relative rounded-xl border p-3 transition-colors " +
                (isSel ? "border-psa-accent bg-psa-accent/5" : "border-psa-border bg-psa-card")
              }
              style={{ width: THUMB_W + 24 }}
            >
              <button
                onClick={() => toggle(t.id)}
                className={
                  "absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border " +
                  (isSel
                    ? "border-psa-accent bg-psa-accent text-[#06231a]"
                    : "border-psa-border bg-psa-bg/80 text-transparent")
                }
                aria-label="selecionar"
              >
                <Check size={14} />
              </button>

              <button onClick={() => toggle(t.id)} className="block">
                <Thumb templateId={t.id} format={format} />
              </button>

              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{t.label}</span>
                  {!t.hasPhoto && (
                    <span className="rounded bg-psa-accent/15 px-1.5 py-0.5 text-[10px] text-psa-accent">
                      sem foto
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-psa-muted">{t.desc}</p>
                <Link
                  href={`/biblioteca/render/${t.id}/${format}`}
                  target="_blank"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-psa-accent hover:underline"
                >
                  <ExternalLink size={12} /> Abrir / copiar HTML
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* bandeja de seleção */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-psa-border bg-psa-surface/95 px-8 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <span className="text-sm text-white">
              <strong>{selected.size}</strong> tipo(s) selecionado(s) · formato {format}
            </span>
            <div className="flex items-center gap-2">
              <button className="psa-btn-ghost px-3 py-1.5 text-xs" onClick={() => setSelected(new Set())}>
                Limpar
              </button>
              <button className="psa-btn-primary px-3 py-1.5 text-xs" onClick={copyBrief}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Brief copiado" : "Levar pro Figma (copiar brief)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
