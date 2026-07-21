'use client';
import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Senha inválida');
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao entrar');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-psa-bg p-6">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-psa-line w-full max-w-sm p-8"
      >
        <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-psa-mute mb-1.5">PSA · MKT OPS</div>
        <h1 className="text-xl font-semibold tracking-tight text-psa-ink">UTM Observability</h1>
        <p className="text-[12px] text-psa-mute mt-1">Dashboard restrito · entre com a senha do time.</p>

        <label className="block mt-6">
          <span className="text-[10px] uppercase tracking-[0.16em] text-psa-mute font-medium">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-1 w-full px-3 py-2.5 border border-psa-line rounded-lg text-sm focus:outline-none focus:border-psa-accent focus:ring-1 focus:ring-psa-accent"
            placeholder="••••••••"
          />
        </label>
        {error && <div className="mt-3 text-xs text-psa-bad">{error}</div>}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider bg-psa-ink text-white hover:bg-psa-accent disabled:opacity-50 transition-colors"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
