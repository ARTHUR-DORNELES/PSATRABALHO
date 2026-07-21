-- =====================================================================
-- Migração: permite gerar um creative SEM linha de copy associada (modo
-- "mesclar referências, sem texto" com nenhuma copy selecionada, e outros
-- modos que dispensam persona). Rodar no SQL Editor do projeto — seguro
-- porque `creatives` está vazia neste momento.
-- =====================================================================
alter table creatives alter column copy_entry_id drop not null;
