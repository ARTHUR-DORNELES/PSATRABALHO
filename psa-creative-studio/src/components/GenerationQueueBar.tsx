"use client";

import Link from "next/link";
import { Loader2, ImageIcon, X, AlertTriangle } from "lucide-react";
import { useGenerationQueue, type QueueItem } from "@/components/GenerationQueueProvider";

export function GenerationQueueBar() {
  const { queue, dismissItem } = useGenerationQueue();
  if (queue.length === 0) return null;

  return (
    <div className="max-h-56 space-y-1 overflow-y-auto border-t border-psa-border px-3 py-3">
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-psa-muted">
        Gerando criativos
      </p>
      {queue.map((item) => (
        <QueueRow key={item.id} item={item} onDismiss={() => dismissItem(item.id)} />
      ))}
    </div>
  );
}

function QueueRow({ item, onDismiss }: { item: QueueItem; onDismiss: () => void }) {
  if (item.status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-psa-muted">
        <Loader2 size={13} className="shrink-0 animate-spin text-psa-accent" />
        <span className="truncate">{item.label}</span>
      </div>
    );
  }

  if (item.status === "error") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-psa-danger">
        <span className="flex items-center gap-2 truncate">
          <AlertTriangle size={13} className="shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        <button onClick={onDismiss} className="shrink-0 hover:text-white" title="Dispensar">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <Link
      href={`/creatives?highlight=${item.creativeId}`}
      onClick={onDismiss}
      prefetch={false}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white transition-colors hover:bg-psa-card"
      title="Ver esse criativo"
    >
      <ImageIcon size={13} className="shrink-0 text-psa-success" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
