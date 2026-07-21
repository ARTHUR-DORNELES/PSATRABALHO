'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DrillQuery, DrillResult } from '@/lib/drill';
import { DrillDrawer } from './DrillDrawer';

type State =
  | { kind: 'closed' }
  | { kind: 'loading'; query: DrillQuery }
  | { kind: 'ready'; query: DrillQuery; result: DrillResult }
  | { kind: 'error'; query: DrillQuery; message: string };

type Ctx = {
  open: (q: DrillQuery) => void;
  close: () => void;
  state: State;
};

const DrillCtx = createContext<Ctx | null>(null);

export function useDrill(): Ctx {
  const ctx = useContext(DrillCtx);
  if (!ctx) throw new Error('useDrill fora do DrillProvider');
  return ctx;
}

export function DrillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'closed' });

  const open = useCallback((q: DrillQuery) => {
    setState({ kind: 'loading', query: q });
    fetch('/api/drill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setState({ kind: 'ready', query: q, result: data });
      })
      .catch((e) => setState({ kind: 'error', query: q, message: e instanceof Error ? e.message : String(e) }));
  }, []);

  const close = useCallback(() => setState({ kind: 'closed' }), []);

  useEffect(() => {
    if (state.kind === 'closed') return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.kind, close]);

  return (
    <DrillCtx.Provider value={{ open, close, state }}>
      {children}
      <DrillDrawer state={state} onClose={close} />
    </DrillCtx.Provider>
  );
}
