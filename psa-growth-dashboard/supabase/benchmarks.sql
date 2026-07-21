-- =====================================================================
-- benchmarks — referências p/ comparar resultados (etapa 4)
--   INTERNAL_HISTORICAL: média histórica da própria PSA
--   MARKET: referências de mercado (faixa low..high)
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
  source      text,                               -- "histórico interno" / "relatório X"
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists benchmarks_lookup_idx on benchmarks (metric_key, kind, channel_id);

do $$ begin
  create trigger benchmarks_set_updated_at before update on benchmarks
    for each row execute function growth_set_updated_at();
exception when duplicate_object then null; end $$;
