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
    <main className="min-h-screen flex items-center justify-center bg-tbs-gradient p-6">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <svg width="36" height="36" viewBox="0 0 80 80">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D14A0F" />
                <stop offset="50%" stopColor="#F08220" />
                <stop offset="100%" stopColor="#FFA52A" />
              </linearGradient>
            </defs>
            <ellipse cx="20" cy="40" rx="5" ry="14" fill="url(#lg)" />
            <ellipse cx="32" cy="40" rx="6" ry="22" fill="url(#lg)" />
            <ellipse cx="44" cy="40" rx="6" ry="28" fill="url(#lg)" />
            <ellipse cx="56" cy="40" rx="6" ry="22" fill="url(#lg)" />
            <ellipse cx="68" cy="40" rx="5" ry="14" fill="url(#lg)" />
          </svg>
          <div>
            <div className="display text-xl uppercase tracking-wide leading-none">
              The Best Speaker <span className="text-tbs-orange">2026</span>
            </div>
            <div className="text-xs text-tbs-mute mt-1">Dashboard restrito</div>
          </div>
        </div>
        <div className="divider-gradient w-12 mb-5" />
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-tbs-mute">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-1 w-full px-3 py-2 border border-tbs-line rounded-lg text-sm focus:outline-none focus:border-tbs-orange focus:ring-1 focus:ring-tbs-orange"
            placeholder="••••••••"
          />
        </label>
        {error && <div className="mt-3 text-xs text-tbs-danger">{error}</div>}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider bg-tbs-gradient-h text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
