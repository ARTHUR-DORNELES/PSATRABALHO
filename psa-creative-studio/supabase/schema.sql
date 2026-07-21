-- =====================================================================
-- PSA Creative Studio — schema (Supabase / Postgres)
-- ---------------------------------------------------------------------
-- Rodar no SQL Editor de um projeto Supabase DEDICADO a esta ferramenta
-- (isolado dos outros dashboards PSA).
--
-- Depois de rodar este arquivo, criar o bucket de Storage manualmente:
--   Supabase Dashboard -> Storage -> New bucket
--   nome: creative-assets
--   Public bucket: ON  (as peças geradas não são sensíveis; público
--   simplifica exibir/baixar direto por URL sem assinar cada request)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- projects : workspaces pra separar campanhas diferentes (ex: "TBS 2026"
-- vs um produto novo) dentro da mesma instância. Toda referência/copy/
-- creative pertence a um projeto.
-- ---------------------------------------------------------------------
create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- reference_images : as até 30 imagens de estilo/template enviadas, mais
-- as variações de logo da marca (kind = 'logo'). O logo é tratado à parte
-- do estilo porque o Gemini tende a "redesenhar" logos que só aparecem
-- dentro de uma foto de referência cheia de outros elementos — anexado
-- sozinho, com instrução de preservar exatamente, sai muito mais fiel.
-- ---------------------------------------------------------------------
create table if not exists reference_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  name          text not null,               -- rótulo dado pelo usuário
  storage_path  text not null,               -- caminho dentro do bucket creative-assets
  kind          text not null default 'style' check (kind in ('style', 'logo')),
  created_at    timestamptz not null default now()
);
create index if not exists reference_images_project_idx on reference_images (project_id);

-- ---------------------------------------------------------------------
-- copy_entries : linhas de copy por persona/ângulo (importadas via TSV ou
-- via texto solto título+parágrafo — ver src/lib/copy-parser.ts). No
-- formato solto não há CTA explícito, por isso a coluna é opcional.
-- ---------------------------------------------------------------------
create table if not exists copy_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  persona         text not null,
  prioridade      text,                       -- "Alta" | "Média" | "Nicho" etc (texto livre)
  numero_angulo   text,                       -- coluna "#" da planilha
  angulo          text,                       -- ex: "Identidade / orgulho"
  texto_principal text not null,
  headline        text not null,
  cta             text,
  created_at      timestamptz not null default now()
);
create index if not exists copy_entries_persona_idx on copy_entries (persona);
create index if not exists copy_entries_project_idx on copy_entries (project_id);

-- ---------------------------------------------------------------------
-- creatives : uma geração = 0..1 linha de copy + 0..N imagens de referência
-- (a lista de referências usadas fica em creative_references, abaixo).
-- copy_entry_id é opcional: modos de geração sem persona/texto (ex: "só
-- imagem, sem texto") não têm copy associada. Cada clique em "Gerar" cria
-- um creative novo — assim dá pra comparar tentativas lado a lado.
-- ---------------------------------------------------------------------
create table if not exists creatives (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  copy_entry_id   uuid references copy_entries(id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index if not exists creatives_project_idx on creatives (project_id);

-- ---------------------------------------------------------------------
-- creative_references : quais referências (1 a N) formaram este creative
-- ---------------------------------------------------------------------
create table if not exists creative_references (
  creative_id         uuid not null references creatives(id) on delete cascade,
  reference_image_id  uuid not null references reference_images(id) on delete cascade,
  primary key (creative_id, reference_image_id)
);
create index if not exists creative_references_reference_idx
  on creative_references (reference_image_id);

-- ---------------------------------------------------------------------
-- creative_versions : histórico de gerações/refinamentos de um creative
-- ---------------------------------------------------------------------
create table if not exists creative_versions (
  id                      uuid primary key default gen_random_uuid(),
  creative_id             uuid not null references creatives(id) on delete cascade,
  version_number          int not null,
  storage_path            text not null,       -- caminho dentro do bucket creative-assets
  prompt_usado            text,
  instrucao_refinamento   text,                -- null na v1 (geração inicial)
  created_at              timestamptz not null default now(),
  unique (creative_id, version_number)
);
create index if not exists creative_versions_creative_idx
  on creative_versions (creative_id, version_number desc);
