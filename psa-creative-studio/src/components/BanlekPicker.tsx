"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

interface Photo {
  id: number;
  mini: string;
  med: string;
  original: string;
}

// álbum padrão (retratos PSA) — dá pra colar qualquer URL de álbum do Banlek
const DEFAULT_ALBUM = "https://banlek.com/album/1f71ad-the-best-weekend-retratos";

export function BanlekPicker({
  onPick,
  pickLabel = "Usar",
}: {
  onPick?: (photoUrl: string) => void;
  pickLabel?: string;
}) {
  const [album, setAlbum] = useState(DEFAULT_ALBUM);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/banlek?album=${encodeURIComponent(album)}&page=${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPhotos((prev) => (p === 1 ? data.photos : [...prev, ...data.photos]));
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao buscar.");
    } finally {
      setLoading(false);
    }
  }

  // carrega o álbum padrão ao abrir
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="w-full rounded-md border border-psa-border bg-psa-bg px-3 py-2 text-sm text-white placeholder:text-psa-muted/60 focus:border-psa-accent focus:outline-none"
          placeholder="Cole a URL do álbum do Banlek (ex: banlek.com/album/1f71ad-...)"
          value={album}
          onChange={(e) => setAlbum(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="psa-btn-primary shrink-0 px-4 py-2 text-sm" onClick={() => load(1)} disabled={loading}>
          {loading && page === 1 ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
        </button>
      </div>
      {error && <p className="text-xs text-red-400">Erro: {error}</p>}

      <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
        {photos.map((ph) => (
          <button
            key={ph.id}
            onClick={() => onPick?.(ph.med)}
            className="group relative aspect-square overflow-hidden rounded-md border border-psa-border hover:border-psa-accent"
            title={onPick ? pickLabel : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.mini} alt="" loading="lazy" className="h-full w-full object-cover" />
            {onPick && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {pickLabel}
              </span>
            )}
          </button>
        ))}
      </div>

      {photos.length > 0 && (
        <div className="flex justify-center">
          <button className="psa-btn-ghost px-4 py-2 text-sm" onClick={() => load(page + 1)} disabled={loading}>
            {loading && page > 1 ? <Loader2 size={15} className="animate-spin" /> : null} Carregar mais
          </button>
        </div>
      )}
      {!loading && photos.length === 0 && !error && (
        <p className="text-sm text-psa-muted">Nenhuma foto encontrada nesse álbum.</p>
      )}
    </div>
  );
}
