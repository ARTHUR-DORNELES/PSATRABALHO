-- PSA Growth - setup completo do banco (tabelas + carga base).

-- ====== schema.sql ======
-- =====================================================================
-- PSA Growth Dashboard â€” schema nÃºcleo (Supabase / Postgres)
-- ---------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase NESTA ORDEM:
--   1) schema.sql   (este arquivo)
--   2) sync_runs.sql (cria a FK tardia de metric_snapshots)
--   3) goals.sql / benchmarks.sql / ai_suggestions.sql
--
-- Modela o "funil horizontal de 5 etapas" de cada experimento:
--   1. InÃ­cio do teste        -> experiments.hypothesis + started_at
--   2. O que estÃ¡ realizado    -> experiments.execution + experiment_variants
--   3. NÃºmeros atuais          -> metric_snapshots (Ãºltima foto por variante)
--   4. Retorno que trouxe       -> experiment_results (derivado) + benchmarks
--   5. Quanto falta p/ oficial  -> decision_criteria + engine (lib/stats.ts)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type channel_kind_enum as enum (
    'EMAIL', 'WHATSAPP', 'ORGANIC_CONTENT', 'META_ADS', 'GOOGLE_ADS', 'OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_system_enum as enum ('HUBSPOT', 'N8N', 'META', 'GOOGLE', 'MANUAL', 'GA4');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experiment_status_enum as enum (
    'DRAFT', 'RUNNING', 'PAUSED', 'WON', 'LOST', 'INCONCLUSIVE'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type metric_kind_enum as enum ('RATE', 'COUNT', 'CURRENCY', 'RATIO');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- channels : canais/fontes de aquisiÃ§Ã£o
-- ---------------------------------------------------------------------
create table if not exists channels (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,          -- slug: 'email','whatsapp','meta_ads'
  name            text not null,
  kind            channel_kind_enum not null,
  source_system   source_system_enum not null,
  source_config   jsonb not null default '{}'::jsonb,  -- mapeamento p/ a fonte
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists channels_kind_idx on channels (kind, active);

-- ---------------------------------------------------------------------
-- metric_definitions : catÃ¡logo de mÃ©tricas (vocabulÃ¡rio dos snapshots)
-- ---------------------------------------------------------------------
create table if not exists metric_definitions (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,          -- 'sent','opens','clicks','leads','cost','mql','sql','deals','revenue'
  label           text not null,
  kind            metric_kind_enum not null,
  unit            text,                           -- 'BRL','%','leads'
  rate_of         jsonb not null default '{}'::jsonb,  -- {"numerator":"opens","denominator":"sent"}
  higher_is_better int not null default 1,        -- 1 = maior melhor; -1 = menor melhor
  source_field    jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- experiments : o teste (etapas 1 e 2)
-- ---------------------------------------------------------------------
create table if not exists experiments (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,                     -- 'EXP-2026-014'
  name          text not null,
  channel_id    uuid not null references channels(id),
  -- Etapa 1 â€” InÃ­cio
  hypothesis    text not null,
  started_at    date not null,
  ended_at      date,
  owner_email   text,
  -- Etapa 2 â€” ExecuÃ§Ã£o
  execution     text,
  audience      text,
  meta          jsonb not null default '{}'::jsonb,
  status        experiment_status_enum not null default 'DRAFT',
  -- DecisÃ£o final
  decided_at    timestamptz,
  decided_by    text,
  decision_note text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists experiments_channel_idx on experiments (channel_id);
create index if not exists experiments_status_idx  on experiments (status);
create index if not exists experiments_started_idx on experiments (started_at desc);

-- ---------------------------------------------------------------------
-- experiment_variants : braÃ§os do A/B (controle + tratamentos)
-- ---------------------------------------------------------------------
create table if not exists experiment_variants (
  id            uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  key           text not null,                   -- 'control','A','B'
  name          text not null,
  is_control    boolean not null default false,
  description   text,
  source_key    jsonb not null default '{}'::jsonb,  -- utm_content, id de variante HubSpot, tag N8N
  created_at    timestamptz not null default now(),
  unique (experiment_id, key)
);
create index if not exists variants_experiment_idx on experiment_variants (experiment_id);
-- No mÃ¡ximo um controle por experimento.
create unique index if not exists variants_one_control_idx
  on experiment_variants (experiment_id) where is_control = true;

-- ---------------------------------------------------------------------
-- metric_snapshots : SÃ‰RIE TEMPORAL por variante (etapa 3) â€” append-only
-- ---------------------------------------------------------------------
-- Cada linha Ã© uma foto imutÃ¡vel (taken_at). "NÃºmeros atuais" = Ãºltima
-- foto por (variant, metric). Mesmo padrÃ£o do monthly_snapshots do bonus.
create table if not exists metric_snapshots (
  id            uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_id    uuid not null references experiment_variants(id) on delete cascade,
  metric_key    text not null references metric_definitions(key),
  taken_at      timestamptz not null default now(),
  source_system source_system_enum not null,
  value         numeric(18, 4) not null default 0,  -- cumulativo desde started_at
  numerator     numeric(18, 4),                     -- p/ RATE: ex opens
  denominator   numeric(18, 4),                     -- p/ RATE: ex sent (amostra)
  meta          jsonb not null default '{}'::jsonb,
  sync_run_id   uuid,                               -- FK criada em sync_runs.sql
  created_at    timestamptz not null default now()
);
create index if not exists metric_snapshots_lookup_idx
  on metric_snapshots (variant_id, metric_key, taken_at desc);
create index if not exists metric_snapshots_experiment_idx
  on metric_snapshots (experiment_id, taken_at desc);

-- ---------------------------------------------------------------------
-- decision_criteria : critÃ©rio de decisÃ£o (etapa 5, como DADO)
-- ---------------------------------------------------------------------
create table if not exists decision_criteria (
  id                    uuid primary key default gen_random_uuid(),
  experiment_id         uuid not null unique references experiments(id) on delete cascade,
  target_metric_key     text not null references metric_definitions(key),
  min_detectable_effect numeric(8, 4) not null default 0.10,  -- MDE (lift relativo)
  confidence_level      numeric(5, 4) not null default 0.95,
  power                 numeric(5, 4) not null default 0.80,
  target_value          numeric(18, 4),                       -- alvo absoluto (nÃ£o-A/B)
  test_type             text not null default 'two-sided',
  decision_deadline     date,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- experiment_results : RESULTADO calculado pela engine (etapas 4 e 5)
-- ---------------------------------------------------------------------
-- Cache materializado da Ãºltima avaliaÃ§Ã£o (1 linha por experimento;
-- o histÃ³rico vive nos prÃ³prios metric_snapshots). Upsert por experiment_id.
create table if not exists experiment_results (
  id                  uuid primary key default gen_random_uuid(),
  experiment_id       uuid not null unique references experiments(id) on delete cascade,
  computed_at         timestamptz not null default now(),
  control_rate        numeric(18, 6),
  best_variant_id     uuid references experiment_variants(id),
  best_rate           numeric(18, 6),
  control_n           numeric(18, 4),
  best_n              numeric(18, 4),
  -- Etapa 4 â€” Retorno
  absolute_lift       numeric(18, 6),
  relative_lift       numeric(18, 6),
  leads_attributed    numeric(18, 4),
  mql_attributed      numeric(18, 4),
  sql_attributed      numeric(18, 4),
  deals_attributed    numeric(18, 4),
  revenue_attributed  numeric(18, 2),
  cost_total          numeric(18, 2),
  cac                 numeric(18, 2),
  -- Etapa 5 â€” ConfianÃ§a e "quanto falta"
  z_score             numeric(12, 6),
  p_value             numeric(12, 8),
  confidence          numeric(8, 6),
  is_significant      boolean not null default false,
  required_n_per_arm  numeric(18, 2),
  remaining_n_per_arm numeric(18, 2),
  progress_pct        numeric(6, 2),
  recommendation      text,
  detail              jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists experiment_results_sig_idx on experiment_results (is_significant);

-- ---------------------------------------------------------------------
-- updated_at trigger (mesmo padrÃ£o do bonus schema.sql)
-- ---------------------------------------------------------------------
create or replace function growth_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger channels_set_updated_at before update on channels for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger experiments_set_updated_at before update on experiments for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger criteria_set_updated_at before update on decision_criteria for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Views auxiliares (padrÃ£o v_* do bonus)
-- ---------------------------------------------------------------------
-- Ãšltima foto por (variant, metric) â€” alimenta "NÃºmeros atuais".
create or replace view v_latest_metric as
select distinct on (ms.variant_id, ms.metric_key)
  ms.variant_id, ms.experiment_id, ms.metric_key,
  ms.value, ms.numerator, ms.denominator, ms.taken_at
from metric_snapshots ms
order by ms.variant_id, ms.metric_key, ms.taken_at desc;

-- Funil das 5 etapas numa linha por experimento (alimenta a home).
create or replace view v_experiment_funnel as
select
  e.id, e.code, e.name, e.hypothesis, e.execution, e.audience,
  e.started_at, e.status,
  c.key as channel_key, c.name as channel_name, c.kind as channel_kind,
  dc.target_metric_key, dc.min_detectable_effect, dc.confidence_level,
  r.relative_lift, r.confidence, r.is_significant,
  r.progress_pct, r.remaining_n_per_arm, r.recommendation,
  r.leads_attributed, r.revenue_attributed, r.cost_total, r.cac
from experiments e
join channels c on c.id = e.channel_id
left join decision_criteria dc on dc.experiment_id = e.id
left join experiment_results r on r.experiment_id = e.id;


-- ====== sync_runs.sql ======
-- =====================================================================
-- sync_runs â€” log de cada sincronizaÃ§Ã£o (espelha hubspot_imports do bonus)
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


-- ====== goals.sql ======
-- =====================================================================
-- acquisition_goals â€” metas internas de aquisiÃ§Ã£o (meta vs realizado)
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


-- ====== benchmarks.sql ======
-- =====================================================================
-- benchmarks â€” referÃªncias p/ comparar resultados (etapa 4)
--   INTERNAL_HISTORICAL: mÃ©dia histÃ³rica da prÃ³pria PSA
--   MARKET: referÃªncias de mercado (faixa low..high)
-- =====================================================================
do $$ begin
  create type benchmark_kind_enum as enum ('INTERNAL_HISTORICAL', 'MARKET');
exception when duplicate_object then null; end $$;

create table if not exists benchmarks (
  id          uuid primary key default gen_random_uuid(),
  kind        benchmark_kind_enum not null,
  channel_id  uuid references channels(id),      -- null = qualquer canal
  metric_key  text not null references metric_definitions(key),
  value       numeric(18, 6) not null,           -- ex 0.22 = 22% open rate
  low         numeric(18, 6),                     -- mercado costuma vir em faixa
  high        numeric(18, 6),
  period      text,                               -- "2025", "Q1-2026"
  source      text,                               -- "histÃ³rico interno" / "relatÃ³rio X"
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists benchmarks_lookup_idx on benchmarks (metric_key, kind, channel_id);

do $$ begin
  create trigger benchmarks_set_updated_at before update on benchmarks
    for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;


-- ====== ai_suggestions.sql ======
-- =====================================================================
-- ai_suggestions â€” sugestÃµes de melhoria por aÃ§Ã£o (geradas por IA)
-- Usa @anthropic-ai/sdk (mesmo pacote do psa-bonus-dashboard).
-- =====================================================================
do $$ begin
  create type suggestion_status_enum as enum ('NEW', 'ACCEPTED', 'DISMISSED', 'DONE');
exception when duplicate_object then null; end $$;

create table if not exists ai_suggestions (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid references experiments(id) on delete cascade,
  channel_id      uuid references channels(id),
  context         jsonb not null default '{}'::jsonb,  -- snapshot dos nÃºmeros enviado ao modelo
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


-- ====== _seed.sql ======
-- =====================================================================
-- Carga base (NÃƒO Ã© dado fake de experimento): canais e catÃ¡logo de
-- mÃ©tricas que o formulÃ¡rio de cadastro precisa. Idempotente.
-- =====================================================================
insert into channels (key, name, kind, source_system, source_config) values
  ('email',      'E-mail Marketing',        'EMAIL',           'HUBSPOT', '{"hs_marketing_email":true}'),
  ('whatsapp',   'WhatsApp (N8N)',          'WHATSAPP',        'N8N',     '{"tag_prefix":"exp_"}'),
  ('organic',    'ConteÃºdo orgÃ¢nico / LPs', 'ORGANIC_CONTENT', 'HUBSPOT', '{"utm_medium":"organic"}'),
  ('meta_ads',   'Meta Ads',                'META_ADS',        'META',    '{"utm_source":"meta"}'),
  ('google_ads', 'Google Ads',              'GOOGLE_ADS',      'GOOGLE',  '{"utm_source":"google"}')
on conflict (key) do nothing;

insert into metric_definitions (key, label, kind, unit, rate_of, higher_is_better) values
  ('sent',        'Enviados',                  'COUNT',    'envios',    '{}', 1),
  ('delivered',   'Entregues',                 'COUNT',    'msgs',      '{}', 1),
  ('opens',       'Aberturas',                 'COUNT',    'aberturas', '{}', 1),
  ('clicks',      'Cliques',                   'COUNT',    'cliques',   '{}', 1),
  ('replies',     'Respostas',                 'COUNT',    'respostas', '{}', 1),
  ('impressions', 'ImpressÃµes',                'COUNT',    'impr.',     '{}', 1),
  ('sessions',    'SessÃµes',                   'COUNT',    'sessÃµes',   '{}', 1),
  ('leads',       'Leads',                     'COUNT',    'leads',     '{}', 1),
  ('mql',         'MQL',                       'COUNT',    'mql',       '{}', 1),
  ('sql',         'SQL',                       'COUNT',    'sql',       '{}', 1),
  ('deals',       'NegÃ³cios',                  'COUNT',    'deals',     '{}', 1),
  ('open_rate',   'Taxa de abertura',          'RATE',     '%',         '{"numerator":"opens","denominator":"sent"}',         1),
  ('click_rate',  'Taxa de clique',            'RATE',     '%',         '{"numerator":"clicks","denominator":"sent"}',        1),
  ('reply_rate',  'Taxa de resposta',          'RATE',     '%',         '{"numerator":"replies","denominator":"delivered"}',  1),
  ('lead_rate',   'Taxa de conversÃ£o (lead)',  'RATE',     '%',         '{"numerator":"leads","denominator":"clicks"}',       1),
  ('revenue',     'Receita',                   'CURRENCY', 'BRL',       '{}', 1),
  ('cost',        'Investimento',              'CURRENCY', 'BRL',       '{}', 1),
  ('cac',         'CAC',                       'RATIO',    'BRL',       '{}', -1)
on conflict (key) do nothing;


