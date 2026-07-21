"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("next") || "/";
      } else {
        setErr("Senha incorreta. Tente de novo.");
        setLoading(false);
      }
    } catch {
      setErr("Falha de conexão. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 22 }}>
      <form onSubmit={submit} className="login-card">
        <div className="brandmark"><span className="dot" />PSA · Custos & Uso Claude</div>
        <h1 style={{ margin: "14px 0 6px", fontSize: 24, letterSpacing: "-.02em" }}>Acesso restrito</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 20px" }}>
          Painel interno do grupo PSA. Informe a senha compartilhada para continuar.
        </p>

        <label className="lbl">Senha</label>
        <input
          className="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {err && <div className="err">{err}</div>}

        <button className="submit" type="submit" disabled={loading || !password}>
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p style={{ color: "var(--ink-faint)", fontSize: 11.5, marginTop: 16, lineHeight: 1.5 }}>
          A verificação acontece no servidor; a senha não fica salva no navegador. Sessão válida por 30 dias neste dispositivo.
        </p>
      </form>

      <style>{`
        .login-card{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--line);
          border-radius:16px;padding:30px 28px;box-shadow:var(--shadow)}
        .lbl{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
          color:var(--ink-faint);margin-bottom:6px}
        .pw{width:100%;font-family:var(--mono);font-size:16px;border:1px solid var(--line);background:var(--surface-2);
          color:var(--ink);border-radius:10px;padding:11px 13px;letter-spacing:.15em}
        .pw:focus{outline:none;border-color:var(--accent)}
        .err{margin-top:12px;font-size:13px;color:var(--spend);background:var(--spend-soft);
          border:1px solid color-mix(in srgb,var(--spend) 35%,transparent);border-radius:9px;padding:9px 12px}
        .submit{width:100%;margin-top:18px;background:var(--accent);border:1px solid var(--accent);color:#fff;
          border-radius:10px;padding:12px;font-size:15px;font-weight:600;cursor:pointer}
        .submit:hover{opacity:.92}
        .submit:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
