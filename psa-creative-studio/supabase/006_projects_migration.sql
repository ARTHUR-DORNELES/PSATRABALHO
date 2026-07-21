-- =====================================================================
-- Migração: adiciona projetos (workspaces) — cada referência/copy/creative
-- passa a pertencer a um projeto, pra separar campanhas diferentes (ex:
-- "TBS 2026" vs um produto novo) dentro da mesma instância.
--
-- Cria a tabela `projects`, adiciona project_id nas 3 tabelas existentes,
-- e migra todos os dados atuais pra um projeto "TBS 2026" recém-criado
-- (nada é perdido). Rodar no SQL Editor do projeto.
-- =====================================================================

create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table reference_images add column if not exists project_id uuid references projects(id) on delete cascade;
alter table copy_entries add column if not exists project_id uuid references projects(id) on delete cascade;
alter table creatives add column if not exists project_id uuid references projects(id) on delete cascade;

do $$
declare
  default_project_id uuid;
begin
  if not exists (select 1 from projects) then
    insert into projects (name) values ('TBS 2026') returning id into default_project_id;
  else
    select id into default_project_id from projects order by created_at asc limit 1;
  end if;

  update reference_images set project_id = default_project_id where project_id is null;
  update copy_entries set project_id = default_project_id where project_id is null;
  update creatives set project_id = default_project_id where project_id is null;
end $$;

alter table reference_images alter column project_id set not null;
alter table copy_entries alter column project_id set not null;
alter table creatives alter column project_id set not null;

create index if not exists reference_images_project_idx on reference_images (project_id);
create index if not exists copy_entries_project_idx on copy_entries (project_id);
create index if not exists creatives_project_idx on creatives (project_id);
