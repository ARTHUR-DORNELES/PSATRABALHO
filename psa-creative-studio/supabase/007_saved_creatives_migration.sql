-- Criativos salvos na Biblioteca (specs do Diretor de Arte / HTML).
-- Guarda a "planta" (LayoutSpec) em jsonb, então renderiza em qualquer formato.
create table if not exists saved_creatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  spec jsonb not null,
  concept text,
  format text not null default 'quadrado',
  persona text,
  source text not null default 'diretor',
  created_at timestamptz not null default now()
);

create index if not exists saved_creatives_project_idx
  on saved_creatives (project_id, created_at desc);
