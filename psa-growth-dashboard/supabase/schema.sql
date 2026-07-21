-- =====================================================================
-- PSA Growth Dashboard — schema núcleo (Supabase / Postgres)
-- ---------------------------------------------------------------------
-- Rodar no SQL Editor do Supabase NESTA ORDEM:
--   1) schema.sql   (este arquivo)
--   2) sync_runs.sql (cria a FK tardia de metric_snapshots)
--   3) goals.sql / benchmarks.sql / ai_suggestions.sql
--
-- Modela o "funil horizontal de 5 etapas" de cada experimento:
--   1. Início do teste        -> experiments.hypothesis + started_at
--   2. O que está realizado    -> experiments.execution + experiment_variants
--   3. Números atuais          -> metric_snapshots (última foto por variante)
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
-- channels : canais/fontes de aquisição
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
-- metric_definitions : catálogo de métricas (vocabulário dos snapshots)
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
  -- Etapa 1 — Início
  hypothesis    text not null,
  started_at    date not null,
  ended_at      date,
  owner_email   text,
  -- Etapa 2 — Execução
  execution     text,
  audience      text,
  meta          jsonb not null default '{}'::jsonb,
  status        experiment_status_enum not null default 'DRAFT',
  -- Decisão final
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
-- experiment_variants : braços do A/B (controle + tratamentos)
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
-- No máximo um controle por experimento.
create unique index if not exists variants_one_control_idx
  on experiment_variants (experiment_id) where is_control = true;

-- ---------------------------------------------------------------------
-- metric_snapshots : SÉRIE TEMPORAL por variante (etapa 3) — append-only
-- ---------------------------------------------------------------------
-- Cada linha é uma foto imutável (taken_at). "Números atuais" = última
-- foto por (variant, metric). Mesmo padrão do monthly_snapshots do bonus.
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
-- decision_criteria : critério de decisão (etapa 5, como DADO)
-- ---------------------------------------------------------------------
create table if not exists decision_criteria (
  id                    uuid primary key default gen_random_uuid(),
  experiment_id         uuid not null unique references experiments(id) on delete cascade,
  target_metric_key     text not null references metric_definitions(key),
  min_detectable_effect numeric(8, 4) not null default 0.10,  -- MDE (lift relativo)
  confidence_level      numeric(5, 4) not null default 0.95,
  power                 numeric(5, 4) not null default 0.80,
  target_value          numeric(18, 4),                       -- alvo absoluto (não-A/B)
  test_type             text not null default 'two-sided',
  decision_deadline     date,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- experiment_results : RESULTADO calculado pela engine (etapas 4 e 5)
-- ---------------------------------------------------------------------
-- Cache materializado da última avaliação (1 linha por experimento;
-- o histórico vive nos próprios metric_snapshots). Upsert por experiment_id.
create table if not exists experiment_results (
  id                  uuid primary key default gen_random_uuid(),
  experiment_id       uuid not null unique references experiments(id) on delete cascade,
  computed_at         timestamptz not null default now(),
  control_rate        numeric(18, 6),
  best_variant_id     uuid references experiment_variants(id),
  best_rate           numeric(18, 6),
  control_n           numeric(18, 4),
  best_n              numeric(18, 4),
  -- Etapa 4 — Retorno
  absolute_lift       numeric(18, 6),
  relative_lift       numeric(18, 6),
  leads_attributed    numeric(18, 4),
  mql_attributed      numeric(18, 4),
  sql_attributed      numeric(18, 4),
  deals_attributed    numeric(18, 4),
  revenue_attributed  numeric(18, 2),
  cost_total          numeric(18, 2),
  cac                 numeric(18, 2),
  -- Etapa 5 — Confiança e "quanto falta"
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
-- updated_at trigger (mesmo padrão do bonus schema.sql)
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
-- Views auxiliares (padrão v_* do bonus)
-- ---------------------------------------------------------------------
-- Última foto por (variant, metric) — alimenta "Números atuais".
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
