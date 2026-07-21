-- =====================================================================
-- sync_runs — log de cada sincronização (espelha hubspot_imports do bonus)
-- Rodar DEPOIS de schema.sql: cria a FK tardia de metric_snapshots.
-- =====================================================================
do $$ begin
  create type sync_status_enum as enum ('PENDING', 'SUCCESS', 'FAILED', 'PARTIAL');
exception when duplicate_object then null; end $$;

create table if not exists sync_runs (
  id                  uuid primary key default gen_random_uuid(),
  source_system       source_system_enum not null,
  status              sync_status_enum not null default 'PENDING',
  snapshots_written   int not null default 0,
  experiments_touched int not null default 0,
  errors              jsonb not null default '[]'::jsonb,
  summary             jsonb not null default '{}'::jsonb,
  triggered_by        text,                         -- 'cron' | email
  started_at          timestamptz not null default now(),
  finished_at         timestamptz
);
create index if not exists sync_runs_started_idx on sync_runs (started_at desc);

-- FK tardia (mesmo truque do bonus: monthly_bonus -> hubspot_imports).
alter table metric_snapshots
  drop constraint if exists metric_snapshots_sync_run_fk;
alter table metric_snapshots
  add constraint metric_snapshots_sync_run_fk
  foreign key (sync_run_id) references sync_runs(id) on delete set null;
