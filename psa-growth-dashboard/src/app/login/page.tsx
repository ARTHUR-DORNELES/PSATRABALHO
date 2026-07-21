import { LogIn } from "lucide-react";
import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  const hasError = !!searchParams.error;
  return (
    <div className="flex min-h-screen items-center justify-center bg-psa-bg p-6">
      <div className="psa-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-psa-accent font-display text-2xl text-white">
          G
        </div>
        <h1 className="font-display text-2xl tracking-tight text-white">PSA GROWTH</h1>
        <p className="mt-1 text-sm text-psa-muted">Painel de experimentação de growth</p>

        {hasError && (
          <p className="mt-4 rounded-lg bg-psa-danger/15 px-3 py-2 text-xs text-psa-danger">
            Acesso restrito a e-mails <strong>@profissionaissa.com</strong>.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: searchParams.from || "/" });
          }}
          className="mt-6"
        >
          <button type="submit" className="psa-btn-primary w-full">
            <LogIn size={16} /> Entrar com Google
          </button>
        </form>

        <p className="mt-4 text-[11px] text-psa-muted">
          Acesso exclusivo da equipe Profissionais SA.
        </p>
      </div>
    </div>
  );
}
