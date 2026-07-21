"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreativeCard } from "@/components/CreativeCard";
import type { CreativeWithDetails } from "@/lib/types";

const NO_PERSONA_LABEL = "Sem persona (imagem sem copy)";

export function CreativesGallery({ creatives }: { creatives: CreativeWithDetails[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [refiningId, setRefiningId] = useState<string | null>(null);

  const groupedCreatives = useMemo(() => {
    const byPersona = new Map<string, CreativeWithDetails[]>();
    for (const c of creatives) {
      const key = c.copyEntry?.persona ?? NO_PERSONA_LABEL;
      const list = byPersona.get(key) ?? [];
      list.push(c);
      byPersona.set(key, list);
    }
    return Array.from(byPersona.entries());
  }, [creatives]);

  // Rola até o criativo recém-gerado (link vindo da barra de progresso) e
  // destaca por alguns segundos.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`creative-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  async function handleRefine(creativeId: string, instruction: string) {
    setRefiningId(creativeId);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeId, instruction }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao refinar.");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao refinar.");
    } finally {
      setRefiningId(null);
    }
  }

  if (groupedCreatives.length === 0) {
    return (
      <p className="text-sm text-psa-muted">
        Nenhum criativo gerado ainda — vá em{" "}
        <a href="/studio" className="text-psa-accent underline">
          Estúdio
        </a>{" "}
        pra gerar o primeiro.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groupedCreatives.map(([persona, list]) => (
        <div key={persona}>
          <h3 className="mb-2 text-sm font-semibold text-white">{persona}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {list.map((creative) => (
              <CreativeCard
                key={creative.id}
                creative={creative}
                onRefine={handleRefine}
                refining={refiningId === creative.id}
                highlighted={highlightId === creative.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
