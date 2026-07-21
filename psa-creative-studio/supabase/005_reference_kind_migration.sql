-- =====================================================================
-- Migração: separa logo (kind = 'logo') de referência de estilo
-- (kind = 'style', valor padrão pras linhas já existentes). Rodar no
-- SQL Editor do projeto.
-- =====================================================================
alter table reference_images
  add column if not exists kind text not null default 'style';

alter table reference_images
  drop constraint if exists reference_images_kind_check;
alter table reference_images
  add constraint reference_images_kind_check check (kind in ('style', 'logo'));
