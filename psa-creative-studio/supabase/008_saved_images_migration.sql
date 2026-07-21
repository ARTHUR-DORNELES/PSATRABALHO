-- Imagens geradas por IA (Estúdio) salvas na Biblioteca de imagem.
-- O arquivo em si vai pro Storage (bucket creative-assets); aqui guardamos o
-- caminho + o prompt/formato usados.
create table if not exists saved_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  storage_path text not null,
  prompt text,
  format text,
  created_at timestamptz not null default now()
);

create index if not exists saved_images_project_idx
  on saved_images (project_id, created_at desc);
