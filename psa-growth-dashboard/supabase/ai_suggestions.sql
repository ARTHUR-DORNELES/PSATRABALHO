-- =====================================================================
-- ai_suggestions — sugestões de melhoria por ação (geradas por IA)
-- Usa @anthropic-ai/sdk (mesmo pacote do psa-bonus-dashboard).
-- =====================================================================
do $$ begin
  create type suggestion_status_enum as enum ('NEW', 'ACCEPTED', 'DISMISSED', 'DONE');
exception when duplicate_object then null; end $$;

create table if not exists ai_suggestions (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid references experiments(id) on delete cascade,
  channel_id      uuid references channels(id),
  context         jsonb not null default '{}'::jsonb,  -- snapshot dos números enviado ao modelo
  title           text not null,
  body            text not null,
  rationale       text,
  expected_impact text,
  priority        int not null default 0,
  model           text,                                -- id do modelo (auditoria)
  status          suggestion_status_enum not null default 'NEW',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_suggestions_experiment_idx on ai_suggestions (experiment_id);
create index if not exists ai_suggestions_status_idx on ai_suggestions (status, priority desc);

do $$ begin
  create trigger ai_suggestions_set_updated_at before update on ai_suggestions
    for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;
