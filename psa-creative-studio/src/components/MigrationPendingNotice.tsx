export function MigrationPendingNotice() {
  return (
    <div className="psa-card p-6 text-sm text-psa-muted">
      <p className="font-semibold text-white">Migração de projetos pendente</p>
      <p className="mt-2">
        Seus dados estão salvos e intactos — só falta rodar a migração{" "}
        <code className="text-psa-accent">supabase/006_projects_migration.sql</code> no SQL
        Editor do Supabase pra criar o projeto padrão e liberar esta página de novo.
      </p>
    </div>
  );
}
