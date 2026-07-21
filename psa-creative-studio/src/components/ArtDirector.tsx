"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Wand2, Check, RefreshCw, ExternalLink, Copy, X, Star, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { SAMPLE_COPIES, COLORWAYS } from "@/lib/html-creative-brand";
import { SpecRenderer } from "@/components/html-creatives/SpecRenderer";
import { BanlekPicker } from "@/components/BanlekPicker";
import { FORMATS, getFormat, type FormatId } from "@/lib/formats";
import type { LayoutSpec } from "@/lib/layout-spec";
import { ImagePlus } from "lucide-react";

const THUMB_W = 220;

export interface CopyOption {
  persona: string;
  headline: string;
  textoPrincipal: string;
  cta: string;
  angulo: string;
}

interface Card {
  id: string;
  spec: LayoutSpec;
  copyIndex: number;
}

let counter = 0;
const uid = () => `c${Date.now().toString(36)}${(counter++).toString(36)}`;

function Thumb({ card, formatId }: { card: Card; formatId: FormatId }) {
  const f = getFormat(formatId);
  const scale = THUMB_W / f.w;
  return (
    <div style={{ width: THUMB_W, height: f.h * scale }} className="overflow-hidden rounded-lg border border-psa-border bg-black">
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: f.w, height: f.h }}>
        <SpecRenderer spec={card.spec} w={f.w} h={f.h} />
      </div>
    </div>
  );
}

function renderUrl(card: Card, formatId: FormatId) {
  return `/diretor/render/${formatId}?spec=${encodeURIComponent(JSON.stringify(card.spec))}`;
}

export function ArtDirector({ copies = [] }: { copies?: CopyOption[] }) {
  // usa a copy real importada; se não houver nenhuma, cai nos exemplos
  const COPIES: CopyOption[] = copies.length > 0 ? copies : SAMPLE_COPIES;

  const [format, setFormat] = useState<FormatId>("quadrado");
  const [pool, setPool] = useState<Card[]>([]);
  const [roundSel, setRoundSel] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Card[]>([]);
  const [gen, setGen] = useState(0);
  const [copyIndex, setCopyIndex] = useState(0);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [photoFor, setPhotoFor] = useState<Card | null>(null);

  async function saveOne(c: Card): Promise<boolean> {
    try {
      const res = await fetch("/api/saved-creatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spec: c.spec,
          concept: c.spec.concept,
          format,
          persona: COPIES[c.copyIndex]?.persona ?? null,
          source: "diretor",
        }),
      });
      if (!res.ok) return false;
      setSavedIds((prev) => new Set(prev).add(c.id));
      return true;
    } catch {
      return false;
    }
  }

  async function saveAllFavorites() {
    setSavingAll(true);
    for (const c of favorites) {
      if (!savedIds.has(c.id)) await saveOne(c);
    }
    setSavingAll(false);
  }

  async function propose(ci: number, basedOn?: LayoutSpec[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count: 8, copy: COPIES[ci], basedOn, brief }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      const data = (await res.json()) as { specs: LayoutSpec[]; source: "ai" | "fallback" };
      setSource(data.source);
      setPool(data.specs.map((spec) => ({ id: uid(), spec, copyIndex: ci })));
      setGen((g) => g + 1);
      setRoundSel(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  const start = () => propose(copyIndex);

  // gera uma leva com a copy + brief atuais (novos layouts)
  const newBatch = () => propose(copyIndex);

  // trocar a copy NÃO gera na hora — só seleciona, pra dar tempo de escrever o
  // brief antes de clicar em Gerar.
  const chooseCopy = (i: number) => setCopyIndex(i);

  const discard = (id: string) => {
    setPool((prev) => prev.filter((c) => c.id !== id));
    setRoundSel((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggle = (id: string) =>
    setRoundSel((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selected = pool.filter((c) => roundSel.has(c.id));

  const evolveNext = () => {
    if (selected.length === 0) return;
    setFavorites((prev) => {
      const seen = new Set(prev.map((c) => c.id));
      return [...prev, ...selected.filter((c) => !seen.has(c.id))];
    });
    propose(copyIndex, selected.map((c) => c.spec));
  };

  const removeFav = (id: string) => setFavorites((prev) => prev.filter((c) => c.id !== id));

  async function copyBrief() {
    const lines = favorites.map((c) => {
      const cp = COPIES[c.copyIndex] ?? COPIES[0];
      return `- "${c.spec.concept}" · ${COLORWAYS[c.spec.colorway].label} · ${cp.persona} · foto:${c.spec.photo} · ${format}`;
    });
    const brief = `Favoritas do Diretor de Arte — ${favorites.length} peça(s), ${format}:\n` + lines.join("\n");
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard bloqueado */
    }
  }

  const personaLabel = COPIES[copyIndex]?.persona ?? "";

  return (
    <div className="space-y-6 pb-28">
      {/* overlay central "pensando" enquanto a IA gera */}
      {loading && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-sm">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-white/15 border-t-psa-accent" />
          <p className="font-display text-sm text-white">A IA está pensando nos criativos…</p>
        </div>
      )}

      {/* seletor de foto do Banlek pra testar num criativo */}
      {photoFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPhotoFor(null)}>
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-psa-border bg-psa-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="font-display text-sm text-white">
                Testar <span className="text-psa-accent">{photoFor.spec.concept}</span> com uma foto do Banlek
              </h3>
              <button onClick={() => setPhotoFor(null)} className="text-psa-muted hover:text-white" aria-label="fechar">
                <X size={18} />
              </button>
            </div>
            <BanlekPicker
              pickLabel="Usar no criativo"
              onPick={(url) => {
                window.open(`${renderUrl(photoFor, format)}&photo=${encodeURIComponent(url)}`, "_blank");
                setPhotoFor(null);
              }}
            />
          </div>
        </div>
      )}

      {/* seletor de copy — a leva usa SEMPRE a copy escolhida aqui */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-psa-muted">Copy</span>
        <select
          className="max-w-[22rem] rounded-md border border-psa-border bg-psa-bg px-2 py-1.5 text-xs text-white focus:border-psa-accent focus:outline-none disabled:opacity-50"
          value={copyIndex}
          disabled={loading}
          onChange={(e) => chooseCopy(Number(e.target.value))}
        >
          {COPIES.map((c, i) => (
            <option key={i} value={i}>
              {c.persona}
              {c.angulo ? ` · ${c.angulo}` : ` · ${c.headline.slice(0, 28)}`}
            </option>
          ))}
        </select>
        {copies.length === 0 && (
          <span className="text-[11px] text-yellow-500">copy de exemplo — importe a sua em Copy</span>
        )}
      </div>

      {/* brief opcional — guia a IA na próxima leva */}
      <div>
        <span className="psa-label">Direção pra IA (opcional)</span>
        <div className="flex gap-2">
          <input
            type="text"
            className="w-full rounded-md border border-psa-border bg-psa-bg px-3 py-2 text-sm text-white placeholder:text-psa-muted/60 focus:border-psa-accent focus:outline-none"
            placeholder="Ex.: 'foco em urgência e prazo', 'use números grandes', 'estilo minimalista claro'…"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && (pool.length ? newBatch() : start())}
          />
          <button className="psa-btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50" onClick={() => (pool.length ? newBatch() : start())} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {pool.length ? "Gerar leva" : "Gerar"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-psa-muted">Escolha a copy e o formato, escreva a direção (opcional) e clique em Gerar.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {FORMATS.map((f) => (
          <button key={f.id} onClick={() => setFormat(f.id)} className={"psa-btn px-3 py-1.5 text-xs " + (format === f.id ? "psa-btn-primary" : "psa-btn-ghost")}>
            {f.label}
          </button>
        ))}
        {gen > 0 && <span className="ml-1 text-xs text-psa-muted">Leva {gen} · {personaLabel}</span>}
        {source === "fallback" && (
          <span className="rounded bg-yellow-500/15 px-2 py-0.5 text-[11px] text-yellow-500">IA indisponível — usando layouts base</span>
        )}
        {source === "ai" && <span className="rounded bg-psa-accent/15 px-2 py-0.5 text-[11px] text-psa-accent">propostas por IA</span>}
      </div>

      {error && <p className="text-xs text-red-400">Erro: {error}</p>}

      {pool.length === 0 && !loading ? (
        <div className="psa-card flex flex-col items-center justify-center gap-4 p-14 text-center">
          <Sparkles size={32} className="text-psa-accent" />
          <div>
            <h2 className="font-display text-lg text-white">Gerar criativos</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-psa-muted">
              A IA propõe uma leva de layouts diferentes entre si. Você marca os que curtiu, ela evolui
              a partir deles, você marca de novo — até chegar nos preferidos.
            </p>
          </div>
          <button className="psa-btn-primary px-5 py-2.5 text-sm" onClick={start}>
            <Wand2 size={16} /> Gerar criativos
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-psa-muted">
            Marque os que gostou e clique em <strong className="text-white">Evoluir</strong> pra a IA
            propor variações deles. <strong className="text-white">Gerar nova leva</strong> = novos
            layouts da copy + direção atuais. Passe o mouse num card e clique no{" "}
            <strong className="text-white">✕</strong> pra descartar.
          </p>

          <div className="flex flex-wrap gap-4">
            {loading && pool.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-psa-border bg-psa-card" style={{ width: THUMB_W + 24, height: (getFormat(format).h / getFormat(format).w) * THUMB_W + 80 }} />
                ))
              : pool.map((c) => {
                  const cp = COPIES[c.copyIndex] ?? COPIES[0];
                  const isSel = roundSel.has(c.id);
                  return (
                    <div key={c.id} className={"relative rounded-xl border p-3 transition-colors " + (isSel ? "border-psa-accent bg-psa-accent/5" : "border-psa-border bg-psa-card")} style={{ width: THUMB_W + 24 }}>
                      <button onClick={() => discard(c.id)} className="absolute left-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-psa-border bg-psa-bg/80 text-psa-muted hover:text-red-400" aria-label="descartar" title="Descartar este criativo">
                        <X size={14} />
                      </button>
                      <button onClick={() => toggle(c.id)} className={"absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border " + (isSel ? "border-psa-accent bg-psa-accent text-[#06231a]" : "border-psa-border bg-psa-bg/80 text-transparent")} aria-label="selecionar">
                        <Check size={14} />
                      </button>
                      <button onClick={() => toggle(c.id)} className="block">
                        <Thumb card={c} formatId={format} />
                      </button>
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-white">{c.spec.concept}</div>
                        <div className="text-[11px] text-psa-muted">{COLORWAYS[c.spec.colorway].label} · {cp.persona}</div>
                        <div className="mt-1 flex flex-col gap-0.5">
                          <Link href={renderUrl(c, format)} target="_blank" className="inline-flex items-center gap-1 text-[11px] text-psa-accent hover:underline">
                            <ExternalLink size={11} /> abrir / copiar HTML
                          </Link>
                          {c.spec.photo !== "none" && (
                            <button onClick={() => setPhotoFor(c)} className="inline-flex items-center gap-1 text-[11px] text-psa-accent hover:underline">
                              <ImagePlus size={11} /> testar com foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="psa-btn-primary px-4 py-2 text-sm disabled:opacity-40" onClick={evolveNext} disabled={selected.length === 0 || loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Evoluir a partir das selecionadas ({selected.length})
            </button>
            <button className="psa-btn-ghost px-4 py-2 text-sm disabled:opacity-40" onClick={newBatch} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Gerar nova leva
            </button>
          </div>
        </>
      )}

      {favorites.length > 0 && (
        <div className="space-y-3 border-t border-psa-border pt-6">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-psa-accent" />
            <h2 className="font-display text-lg text-white">Favoritas ({favorites.length})</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {favorites.map((c) => {
              const cp = COPIES[c.copyIndex] ?? COPIES[0];
              return (
                <div key={c.id} className="relative rounded-xl border border-psa-border bg-psa-card p-3" style={{ width: THUMB_W + 24 }}>
                  <button onClick={() => saveOne(c)} className={"absolute left-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border " + (savedIds.has(c.id) ? "border-psa-accent bg-psa-accent text-[#06231a]" : "border-psa-border bg-psa-bg/80 text-psa-muted hover:text-white")} aria-label="salvar" title={savedIds.has(c.id) ? "Salvo na biblioteca" : "Salvar na biblioteca"}>
                    {savedIds.has(c.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                  <button onClick={() => removeFav(c.id)} className="absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border border-psa-border bg-psa-bg/80 text-psa-muted hover:text-white" aria-label="remover">
                    <X size={14} />
                  </button>
                  <Thumb card={c} formatId={format} />
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-white">{c.spec.concept}</div>
                    <div className="text-[11px] text-psa-muted">{COLORWAYS[c.spec.colorway].label} · {cp.persona}</div>
                    <Link href={renderUrl(c, format)} target="_blank" className="mt-1 inline-flex items-center gap-1 text-[11px] text-psa-accent hover:underline">
                      <ExternalLink size={11} /> abrir / copiar HTML
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favorites.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-psa-border bg-psa-surface/95 px-8 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <span className="text-sm text-white"><strong>{favorites.length}</strong> favorita(s) · {format}</span>
            <div className="flex items-center gap-2">
              <button className="psa-btn-ghost px-3 py-1.5 text-xs" onClick={() => setFavorites([])}>Limpar</button>
              <button className="psa-btn-ghost px-3 py-1.5 text-xs" onClick={copyBrief}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Brief copiado" : "Copiar brief"}
              </button>
              <button className="psa-btn-primary px-3 py-1.5 text-xs disabled:opacity-50" onClick={saveAllFavorites} disabled={savingAll}>
                {savingAll ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                Salvar na biblioteca
              </button>
              <Link href="/biblioteca" className="psa-btn-ghost px-3 py-1.5 text-xs">Ver biblioteca →</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
