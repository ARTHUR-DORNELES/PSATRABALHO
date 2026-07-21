"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Wand2, ImagePlus, ExternalLink } from "lucide-react";
import type { CreativeWithDetails } from "@/lib/types";

const FIGMA_FILE_URL =
  process.env.NEXT_PUBLIC_FIGMA_FILE_URL || "https://www.figma.com/files/recent";

export function CreativeCard({
  creative,
  onRefine,
  refining,
  highlighted,
}: {
  creative: CreativeWithDetails;
  onRefine: (creativeId: string, instruction: string) => Promise<void>;
  refining: boolean;
  highlighted?: boolean;
}) {
  const router = useRouter();
  const [viewIndex, setViewIndex] = useState(creative.versions.length - 1);
  const [instruction, setInstruction] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [figmaBusy, setFigmaBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const current = creative.versions[viewIndex] ?? creative.versions[creative.versions.length - 1];

  if (!current) return null;

  const label = creative.copyEntry?.headline ?? "Variação visual (sem copy)";

  async function handlePromote() {
    setPromoting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/references/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: current.storagePath,
          name: `${label} · v${current.versionNumber}`.slice(0, 120),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao usar como referência.");
      setActionMessage("Adicionada às Referências.");
      router.refresh();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Erro ao usar como referência.");
    } finally {
      setPromoting(false);
    }
  }

  // Não existe API do Figma pra inserir imagem direto num arquivo — copia a
  // imagem pro clipboard (Ctrl/Cmd+V cola como imagem no canvas do Figma) e
  // abre o arquivo numa aba nova.
  async function handleOpenFigma() {
    setFigmaBusy(true);
    setActionMessage(null);
    try {
      const res = await fetch(current!.publicUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setActionMessage("Imagem copiada — cole com Ctrl/Cmd+V no Figma.");
    } catch {
      setActionMessage("Não deu pra copiar automaticamente — abri a imagem numa aba pra copiar manualmente.");
      window.open(current!.publicUrl, "_blank");
    } finally {
      window.open(FIGMA_FILE_URL, "_blank");
      setFigmaBusy(false);
    }
  }

  return (
    <div
      id={`creative-${creative.id}`}
      className={`psa-card overflow-hidden transition-shadow ${
        highlighted ? "ring-2 ring-psa-accent shadow-psa-glow" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.publicUrl} alt={label} className="aspect-square w-full object-cover" />

      <div className="space-y-2 p-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-psa-muted">
            {creative.copyEntry?.persona ?? "—"}
            {creative.copyEntry?.angulo ? ` · ${creative.copyEntry.angulo}` : ""} · ref.{" "}
            {creative.referenceImages.map((r) => r.name).join(" + ") || "—"}
          </p>
        </div>

        {creative.versions.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {creative.versions.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setViewIndex(i)}
                className={`h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 ${
                  i === viewIndex ? "border-psa-accent" : "border-transparent opacity-70"
                }`}
                title={`Versão ${v.versionNumber}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.publicUrl} alt={`v${v.versionNumber}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="psa-input text-xs"
            placeholder="Refinar (ex: deixe o laranja mais vibrante)…"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && instruction.trim() && !refining) {
                onRefine(creative.id, instruction.trim());
                setInstruction("");
              }
            }}
          />
          <button
            className="psa-btn-ghost shrink-0 px-3"
            disabled={refining || !instruction.trim()}
            onClick={() => {
              onRefine(creative.id, instruction.trim());
              setInstruction("");
            }}
            title="Refinar"
          >
            <Wand2 size={14} />
          </button>
          <a
            className="psa-btn-ghost shrink-0 px-3"
            href={current.publicUrl}
            download={`${creative.copyEntry?.persona ?? "variacao"}-v${current.versionNumber}.png`}
            title="Baixar"
          >
            <Download size={14} />
          </a>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            className="psa-btn-ghost w-full justify-start whitespace-nowrap px-2 py-1.5 text-xs"
            disabled={promoting}
            onClick={handlePromote}
            title="Usar essa imagem como referência de uma nova geração"
          >
            <ImagePlus size={13} className="shrink-0" />
            <span className="truncate">{promoting ? "Adicionando…" : "Usar como referência"}</span>
          </button>
          <button
            className="psa-btn-ghost w-full justify-start whitespace-nowrap px-2 py-1.5 text-xs"
            disabled={figmaBusy}
            onClick={handleOpenFigma}
            title="Copia a imagem e abre o Figma pra colar"
          >
            <ExternalLink size={13} className="shrink-0" />
            <span className="truncate">{figmaBusy ? "Copiando…" : "Abrir no Figma"}</span>
          </button>
        </div>

        {actionMessage && <p className="text-[11px] text-psa-muted">{actionMessage}</p>}
      </div>
    </div>
  );
}
