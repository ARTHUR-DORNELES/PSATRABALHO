"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

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
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Senha inválida.");
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-psa-bg p-6">
      <form onSubmit={submit} className="psa-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-psa-accent font-display text-2xl text-white">
          C
        </div>
        <h1 className="font-display text-2xl tracking-tight text-white">PSA CREATIVE STUDIO</h1>
        <p className="mt-1 text-sm text-psa-muted">Gerador de criativos com IA</p>

        <label className="mt-6 block text-left">
          <span className="psa-label">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="psa-input"
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-psa-danger/15 px-3 py-2 text-xs text-psa-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || !password} className="psa-btn-primary mt-4 w-full">
          <LogIn size={16} /> {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
