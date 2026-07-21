export function SetupNotice() {
  return (
    <div className="psa-card p-6 text-sm text-psa-muted">
      <p className="font-semibold text-white">Supabase ainda não configurado</p>
      <p className="mt-2">
        Preencha <code className="text-psa-accent">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="text-psa-accent">SUPABASE_SERVICE_ROLE_KEY</code> no{" "}
        <code className="text-psa-accent">.env.local</code> (veja <code>.env.example</code>) e
        rode <code className="text-psa-accent">supabase/schema.sql</code> no projeto Supabase —
        além de criar o bucket público <code className="text-psa-accent">creative-assets</code>.
      </p>
    </div>
  );
}
