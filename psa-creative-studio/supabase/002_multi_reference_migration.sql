-- =====================================================================
-- Migração: permite gerar 1 criativo a partir de MÚLTIPLAS imagens de
-- referência (antes era só 1 por criativo). Rodar no SQL Editor do
-- projeto Supabase já provisionado — seguro porque a tabela `creatives`
-- está vazia neste momento (nenhum criativo real foi gerado ainda).
-- =====================================================================

-- Remove a coluna antiga (junto dela vai a FK e o unique constraint que
-- dependiam só dela — o Postgres derruba isso automaticamente).
alter table creatives drop column if exists reference_image_id;

-- Nova tabela de junção: 1 creative pode ter N referências.
create table if not exists creative_references (
  creative_id         uuid not null references creatives(id) on delete cascade,
  reference_image_id  uuid not null references reference_images(id) on delete cascade,
  primary key (creative_id, reference_image_id)
);
create index if not exists creative_references_reference_idx
  on creative_references (reference_image_id);
