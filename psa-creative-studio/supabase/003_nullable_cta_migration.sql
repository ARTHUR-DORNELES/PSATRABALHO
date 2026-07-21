-- =====================================================================
-- Migração: permite importar copy em formato solto (título + parágrafo),
-- que não tem CTA explícito separado. Rodar no SQL Editor do projeto —
-- seguro porque `copy_entries` está vazia neste momento.
-- =====================================================================
alter table copy_entries alter column cta drop not null;
