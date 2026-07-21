"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface QueueItem {
  id: string;
  label: string;
  status: "pending" | "done" | "error";
  creativeId?: string;
}

interface QueueContextValue {
  queue: QueueItem[];
  startItem: (id: string, label: string) => void;
  finishItem: (id: string, result: { status: "done" | "error"; creativeId?: string }) => void;
  dismissItem: (id: string) => void;
}

const GenerationQueueContext = createContext<QueueContextValue | null>(null);

// Mantém no máximo os N mais recentes, pra barra não crescer sem limite
// numa sessão longa gerando muita coisa.
const MAX_QUEUE_ITEMS = 8;

export function GenerationQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const startItem = useCallback((id: string, label: string) => {
    setQueue((prev) => [...prev, { id, label, status: "pending" as const }].slice(-MAX_QUEUE_ITEMS));
  }, []);

  const finishItem = useCallback(
    (id: string, result: { status: "done" | "error"; creativeId?: string }) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...result } : item)),
      );
    },
    [],
  );

  const dismissItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <GenerationQueueContext.Provider value={{ queue, startItem, finishItem, dismissItem }}>
      {children}
    </GenerationQueueContext.Provider>
  );
}

export function useGenerationQueue(): QueueContextValue {
  const ctx = useContext(GenerationQueueContext);
  if (!ctx) throw new Error("useGenerationQueue precisa estar dentro de GenerationQueueProvider.");
  return ctx;
}
