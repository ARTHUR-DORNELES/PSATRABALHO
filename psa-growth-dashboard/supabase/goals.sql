-- =====================================================================
-- acquisition_goals — metas internas de aquisição (meta vs realizado)
-- =====================================================================
do $$ begin
  create type goal_status_enum as enum ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED');
exception when duplicate_object then null; end $$;

create table if not exists acquisition_goals (
  id              uuid primary key default gen_random_uuid(),
  reference_month date not null,                 -- "2026-06-01"
  channel_id      uuid references channels(id),  -- null = meta agregada (todos canais)
  metric_key      text not null references metric_definitions(key),  -- 'leads','revenue','mql'
  target_value    numeric(18, 2) not null default 0,   -- META
  actual_value    numeric(18, 2) not null default 0,   -- REALIZADO (atualizado pelo sync)
  status          goal_status_enum not null default 'ON_TRACK',
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (reference_month, channel_id, metric_key)
);
create index if not exists goals_month_idx   on acquisition_goals (reference_month);
create index if not exists goals_channel_idx on acquisition_goals (channel_id);

do $$ begin
  create trigger goals_set_updated_at before update on acquisition_goals
    for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;
