'use client';
import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; total2026: number; interesse2026: number }
  | { kind: 'error'; message: string };

const AUTO_INTERVAL_MS = 60_000; // 1 min

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [auto, setAuto] = useState(true);
  const busyRef = useRef(false);

  const isBusy = state.kind === 'loading' || pending;
  busyRef.current = isBusy;

  const refresh = useCallback(async () => {
    if (busyRef.current) return; // evita sobreposição
    setState({ kind: 'loading' });
    try {
      // Reconstrói o snapshot no servidor (dado novo do HubSpot)…
      const res = await fetch('/api/refresh-snapshot', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // …e força um reload DURO da página (equivalente seguro ao Ctrl+Shift+R): limpa caches do
      // app que o navegador guarda (Cache Storage) e recarrega sem cache, sem mexer no cookie de login.
      try {
        if (typeof caches !== 'undefined') { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
      } catch { /* sem suporte a Cache Storage — segue pro reload */ }
      const url = new URL(window.location.href);
      url.searchParams.set('_r', String(Date.now())); // cache-buster: garante HTML novo do servidor
      window.location.replace(url.toString());
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [router]);

  // Auto-refresh a cada 60s (sem precisar clicar). Pausa quando a aba está em background.
  // Usa router.refresh() (re-render leve, stale-while-revalidate) — não força invalidação total,
  // então nunca "zera" o painel mesmo se um fetch transitório falhar. O botão manual força o refetch completo.
  useEffect(() => {
    if (!auto) return;
    const tick = () => {
      if (busyRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      startTransition(() => router.refresh());
    };
    const id = setInterval(tick, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [auto, router]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setAuto((v) => !v)}
        title={auto ? 'Pausar atualização automática' : 'Ativar atualização automática (a cada 1 min)'}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70 hover:text-white transition"
      >
        <span className={`w-2 h-2 rounded-full ${auto ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
        <span className="hidden sm:inline">{auto ? 'ao vivo · 1 min' : 'pausado'}</span>
      </button>
      {state.kind === 'error' && (
        <span className="text-[11px] text-red-400 font-medium hidden sm:inline" title={state.message}>✗ erro</span>
      )}
      <button
        onClick={refresh}
        disabled={isBusy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider bg-tbs-orange text-tbs-bg hover:bg-tbs-orange-light disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isBusy ? 'animate-spin' : ''}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        {isBusy ? 'Atualizando' : 'Atualizar'}
      </button>
    </div>
  );
}
