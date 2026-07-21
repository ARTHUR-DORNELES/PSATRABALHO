"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useGenerationQueue } from "@/components/GenerationQueueProvider";
import type { ReferenceImage, CopyEntry, CreativeVersion } from "@/lib/types";
import { MAX_MERGE_REFERENCES, GENERATION_MODES, GENERATION_MODE_INFO } from "@/lib/constants";
import type { GenerationMode } from "@/lib/constants";

interface GeneratedPreviewItem {
  label: string;
  version: CreativeVersion;
}

export function StudioWorkspace({
  references,
  copyEntries,
}: {
  references: ReferenceImage[];
  copyEntries: CopyEntry[];
}) {
  const router = useRouter();
  const { startItem, finishItem } = useGenerationQueue();
  const [mode, setMode] = useState<GenerationMode>("MERGE_LITERAL");
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<Set<string>>(new Set());
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastGenerated, setLastGenerated] = useState<GeneratedPreviewItem[]>([]);
  const [brandNotes, setBrandNotes] = useState("");

  const styleReferences = useMemo(() => references.filter((r) => r.kind === "style"), [references]);
  const logos = useMemo(() => references.filter((r) => r.kind === "logo"), [references]);

  const selectedReferences = useMemo(
    () => styleReferences.filter((r) => selectedReferenceIds.has(r.id)),
    [styleReferences, selectedReferenceIds],
  );
  const selectedLogo = useMemo(
    () => logos.find((l) => l.id === selectedLogoId) ?? null,
    [logos, selectedLogoId],
  );

  const needsReferences = mode !== "COPY_ONLY";
  const needsCopy = mode === "MERGE_LITERAL" || mode === "MERGE_INSPIRED" || mode === "COPY_ONLY";
  const copyOptional = mode === "MERGE_NO_TEXT";

  function toggleCopy(id: string) {
    setSelectedCopyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleReference(id: string) {
    setSelectedReferenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_MERGE_REFERENCES) {
        setErrors([
          `Máximo de ${MAX_MERGE_REFERENCES} referências por geração — desmarque uma pra trocar.`,
        ]);
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  function selectAllReferences() {
    setSelectedReferenceIds(
      new Set(styleReferences.slice(0, MAX_MERGE_REFERENCES).map((r) => r.id)),
    );
    if (styleReferences.length > MAX_MERGE_REFERENCES) {
      setErrors([
        `Você tem ${styleReferences.length} referências; selecionei as primeiras ${MAX_MERGE_REFERENCES} ` +
          `(o máximo por geração). Rode de novo com outro subconjunto pra comparar combinações diferentes.`,
      ]);
    }
  }

  function toggleLogo(id: string) {
    setSelectedLogoId((prev) => (prev === id ? null : id));
  }

  const canGenerate =
    (!needsReferences || selectedReferenceIds.size > 0) &&
    (!needsCopy || selectedCopyIds.size > 0);

  async function handleGenerate() {
    if (!canGenerate) return;
    const copyIds = Array.from(selectedCopyIds);
    const workItems: Array<string | null> = copyIds.length > 0 ? copyIds : [null];
    const refCount = selectedReferenceIds.size;
    const refText = needsReferences
      ? refCount > 1
        ? `mesclando ${refCount} referências`
        : "usando 1 referência"
      : "sem imagem de referência";
    if (
      !window.confirm(`Vai gerar ${workItems.length} imagem(ns) com o Gemini, ${refText}. Confirmar?`)
    )
      return;

    setGenerating(true);
    setErrors([]);
    setSelectedCopyIds(new Set());

    const newErrors: string[] = [];
    const newGenerated: GeneratedPreviewItem[] = [];

    // Sequencial e por item (não em lote) de propósito: respeita rate limit
    // da API do Gemini e permite mostrar progresso individual na barra da
    // sidebar (nome da peça sendo gerada, uma de cada vez).
    for (const copyEntryId of workItems) {
      const label = copyEntryId
        ? copyEntries.find((c) => c.id === copyEntryId)?.headline ?? "Variação"
        : "Variação visual";
      const queueId = `${copyEntryId ?? "novisual"}-${Math.random().toString(36).slice(2)}`;
      startItem(queueId, label);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            referenceImageIds: Array.from(selectedReferenceIds),
            copyEntryIds: copyEntryId ? [copyEntryId] : [],
            brandNotes: brandNotes.trim() || undefined,
            logoReferenceId: selectedLogoId ?? undefined,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Falha ao gerar.");

        const result = (body.results ?? [])[0] as
          | { creativeId: string | null; version: CreativeVersion | null; error: string | null }
          | undefined;

        if (!result || result.error || !result.version || !result.creativeId) {
          newErrors.push(result?.error ?? "Falha ao gerar.");
          finishItem(queueId, { status: "error" });
        } else {
          newGenerated.push({ label, version: result.version });
          finishItem(queueId, { status: "done", creativeId: result.creativeId });
        }
      } catch (e) {
        newErrors.push(e instanceof Error ? e.message : "Erro ao gerar.");
        finishItem(queueId, { status: "error" });
      }
    }

    setErrors(newErrors);
    setLastGenerated(newGenerated);
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {/* Passo 1: modo de geração */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-psa-muted">
            1. Modo de geração
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {GENERATION_MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  mode === m
                    ? "border-psa-accent bg-psa-accent/10"
                    : "border-psa-border hover:border-psa-muted",
                )}
              >
                <div className="font-semibold text-white">{GENERATION_MODE_INFO[m].label}</div>
                <div className="mt-0.5 text-psa-muted">{GENERATION_MODE_INFO[m].description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Passo 2: referência(s) */}
        {needsReferences && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-psa-muted">
                2. Escolha 1 ou mais referências (até {MAX_MERGE_REFERENCES}) — a IA mescla o
                estilo delas
              </h2>
              {styleReferences.length > 0 && (
                <div className="flex gap-2">
                  <button className="psa-btn-ghost px-2 py-1 text-xs" onClick={selectAllReferences}>
                    Selecionar até {MAX_MERGE_REFERENCES}
                  </button>
                  <button
                    className="psa-btn-ghost px-2 py-1 text-xs"
                    onClick={() => setSelectedReferenceIds(new Set())}
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
            {styleReferences.length === 0 ? (
              <p className="text-sm text-psa-muted">
                Nenhuma referência ainda — suba pelo menos uma em{" "}
                <a href="/references" className="text-psa-accent underline">
                  Referências
                </a>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {styleReferences.map((ref) => {
                  const selected = selectedReferenceIds.has(ref.id);
                  return (
                    <button
                      key={ref.id}
                      onClick={() => toggleReference(ref.id)}
                      className={clsx(
                        "relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border-2",
                        selected
                          ? "border-psa-accent"
                          : "border-psa-border opacity-90 hover:opacity-100",
                      )}
                      title={ref.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ref.publicUrl} alt={ref.name} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-psa-accent text-xs font-bold text-[#06231a]">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedReferenceIds.size > 0 && (
              <p className="mt-2 text-xs text-psa-muted">
                {selectedReferenceIds.size} referência(s) selecionada(s)
                {selectedReferenceIds.size > 1 ? " — o estilo delas será mesclado." : "."}
              </p>
            )}
          </section>
        )}

        {/* Passo 3: logo (opcional) */}
        {logos.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-psa-muted">
                3. Logo da marca (opcional) — anexado à parte, a IA reproduz sem redesenhar
              </h2>
              {selectedLogoId && (
                <button
                  className="psa-btn-ghost px-2 py-1 text-xs"
                  onClick={() => setSelectedLogoId(null)}
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {logos.map((logo) => {
                const selected = selectedLogoId === logo.id;
                return (
                  <button
                    key={logo.id}
                    onClick={() => toggleLogo(logo.id)}
                    className={clsx(
                      "relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-white/5",
                      selected
                        ? "border-psa-accent"
                        : "border-psa-border opacity-90 hover:opacity-100",
                    )}
                    title={logo.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.publicUrl}
                      alt={logo.name}
                      className="h-full w-full object-contain p-2"
                    />
                    {selected && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-psa-accent text-[10px] font-bold text-[#06231a]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Passo 4: copy */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-psa-muted">
            4. Selecione as linhas de copy pra gerar
            {copyOptional && " (opcional nesse modo — sem seleção, gera 1 variação só visual)"}
          </h2>
          {copyEntries.length === 0 ? (
            <p className="text-sm text-psa-muted">
              Nenhuma copy importada ainda — cole a tabela em{" "}
              <a href="/copy" className="text-psa-accent underline">
                Copy
              </a>
              .
            </p>
          ) : (
            <div className="psa-card max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-psa-surface text-psa-muted">
                  <tr>
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2">Persona</th>
                    <th className="px-3 py-2">Ângulo</th>
                    <th className="px-3 py-2">Headline</th>
                  </tr>
                </thead>
                <tbody>
                  {copyEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-t border-psa-border hover:bg-psa-cardHover"
                      onClick={() => toggleCopy(entry.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          readOnly
                          checked={selectedCopyIds.has(entry.id)}
                          className="accent-psa-accent"
                        />
                      </td>
                      <td className="px-3 py-2">{entry.persona}</td>
                      <td className="px-3 py-2 text-psa-muted">{entry.angulo ?? "—"}</td>
                      <td className="px-3 py-2">{entry.headline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Passo 5: ideia livre (opcional) */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-psa-muted">
            5. Descreva sua ideia (opcional)
          </h2>
          <p className="mb-2 text-xs text-psa-muted">
            Tem uma imagem na cabeça de como o criativo deveria ficar? Descreva aqui — pose,
            cenário, clima, algo específico que você quer ver — e a IA leva isso em conta na
            geração, além do modo e das referências escolhidas acima.
          </p>
          <textarea
            className="psa-textarea h-20 text-xs"
            placeholder="Ex: quero o palestrante sorrindo, olhando pra câmera, com a plateia desfocada ao fundo e o texto num cartão flutuante no canto inferior…"
            value={brandNotes}
            onChange={(e) => setBrandNotes(e.target.value)}
          />
        </section>

        <section>
          <button
            className="psa-btn-primary"
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
          >
            <Sparkles size={16} />
            {generating
              ? "Gerando…"
              : `Gerar ${selectedCopyIds.size > 0 ? selectedCopyIds.size : ""} criativo(s)`}
          </button>

          {errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-psa-danger">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Painel lateral: referências selecionadas + últimos gerados */}
      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <div className="psa-card p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-psa-muted">
            Referências selecionadas
          </h3>
          {selectedReferences.length === 0 ? (
            <p className="text-xs text-psa-muted">Nenhuma selecionada ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {selectedReferences.map((ref) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ref.id}
                  src={ref.publicUrl}
                  alt={ref.name}
                  title={ref.name}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {selectedLogo && (
          <div className="psa-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-psa-muted">
              Logo selecionado
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedLogo.publicUrl}
              alt={selectedLogo.name}
              className="aspect-square w-full rounded-md bg-white/5 object-contain p-3"
            />
          </div>
        )}

        <div className="psa-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-psa-muted">
              Últimos gerados
            </h3>
            <Link
              href="/creatives"
              className="flex items-center gap-1 text-[11px] text-psa-accent hover:underline"
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {generating && <p className="text-xs text-psa-muted">Gerando…</p>}
          {!generating && lastGenerated.length === 0 && (
            <p className="text-xs text-psa-muted">Nada gerado ainda nessa sessão.</p>
          )}
          {!generating && lastGenerated.length > 0 && (
            <div className="space-y-3">
              {lastGenerated.map((item) => (
                <div key={item.version.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.version.publicUrl}
                    alt={item.label}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <p className="mt-1 text-xs text-psa-muted">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
