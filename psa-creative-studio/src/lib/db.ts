// =====================================================================
// Camada de acesso a dado — CRUD de projects, reference_images,
// copy_entries, creatives e creative_versions. Mapeia snake_case
// (Postgres) -> camelCase. Referências/copy/creatives são sempre
// filtrados por projectId (workspace ativo — ver lib/active-project.ts).
// =====================================================================
import { getSupabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/storage";
import type {
  Project,
  ReferenceImage,
  ReferenceKind,
  CopyEntry,
  Creative,
  CreativeVersion,
  CreativeWithDetails,
  SavedCreative,
  SavedImage,
} from "@/lib/types";

// ---------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------
function projectFromDb(row: any): Project {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function referenceImageFromDb(row: any): ReferenceImage {
  return {
    id: row.id,
    name: row.name,
    storagePath: row.storage_path,
    publicUrl: getPublicUrl(row.storage_path),
    kind: row.kind ?? "style",
    createdAt: row.created_at,
  };
}

function copyEntryFromDb(row: any): CopyEntry {
  return {
    id: row.id,
    persona: row.persona,
    prioridade: row.prioridade,
    numeroAngulo: row.numero_angulo,
    angulo: row.angulo,
    textoPrincipal: row.texto_principal,
    headline: row.headline,
    cta: row.cta,
    createdAt: row.created_at,
  };
}

function creativeVersionFromDb(row: any): CreativeVersion {
  return {
    id: row.id,
    creativeId: row.creative_id,
    versionNumber: row.version_number,
    storagePath: row.storage_path,
    publicUrl: getPublicUrl(row.storage_path),
    promptUsado: row.prompt_usado,
    instrucaoRefinamento: row.instrucao_refinamento,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------
export async function listProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(projectFromDb);
}

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await getSupabase()
    .from("projects")
    .insert({ name })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return projectFromDb(data);
}

// ---------------------------------------------------------------------
// reference_images
// ---------------------------------------------------------------------
export async function listReferenceImages(projectId: string): Promise<ReferenceImage[]> {
  const { data, error } = await getSupabase()
    .from("reference_images")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(referenceImageFromDb);
}

export async function getReferenceImageById(id: string): Promise<ReferenceImage> {
  const { data, error } = await getSupabase()
    .from("reference_images")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return referenceImageFromDb(data);
}

export async function getReferenceImagesByIds(ids: string[]): Promise<ReferenceImage[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase().from("reference_images").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  // Preserva a ordem em que o usuário selecionou.
  const byId = new Map((data ?? []).map((row: any) => [row.id, referenceImageFromDb(row)]));
  return ids.map((id) => byId.get(id)).filter((r): r is ReferenceImage => Boolean(r));
}

export async function createReferenceImage(input: {
  projectId: string;
  name: string;
  storagePath: string;
  kind?: ReferenceKind;
}): Promise<ReferenceImage> {
  const { data, error } = await getSupabase()
    .from("reference_images")
    .insert({
      project_id: input.projectId,
      name: input.name,
      storage_path: input.storagePath,
      kind: input.kind ?? "style",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return referenceImageFromDb(data);
}

// ---------------------------------------------------------------------
// copy_entries
// ---------------------------------------------------------------------
export async function listCopyEntries(projectId: string): Promise<CopyEntry[]> {
  const { data, error } = await getSupabase()
    .from("copy_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(copyEntryFromDb);
}

export async function getCopyEntryById(id: string): Promise<CopyEntry> {
  const { data, error } = await getSupabase()
    .from("copy_entries")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return copyEntryFromDb(data);
}

// Cascade apaga também os creatives (e creative_versions) gerados a partir
// dessa copy — os arquivos correspondentes ficam órfãos no Storage.
export async function deleteCopyEntry(id: string): Promise<void> {
  const { error } = await getSupabase().from("copy_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkInsertCopyEntries(
  projectId: string,
  entries: Array<{
    persona: string;
    prioridade: string | null;
    numeroAngulo: string | null;
    angulo: string | null;
    textoPrincipal: string;
    headline: string;
    cta: string | null;
  }>,
): Promise<CopyEntry[]> {
  if (entries.length === 0) return [];
  const rows = entries.map((e) => ({
    project_id: projectId,
    persona: e.persona,
    prioridade: e.prioridade,
    numero_angulo: e.numeroAngulo,
    angulo: e.angulo,
    texto_principal: e.textoPrincipal,
    headline: e.headline,
    cta: e.cta,
  }));
  const { data, error } = await getSupabase().from("copy_entries").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(copyEntryFromDb);
}

// ---------------------------------------------------------------------
// creatives
// ---------------------------------------------------------------------
// Cada geração vira um creative novo (mesmo que repita persona + referências) —
// assim dá pra comparar tentativas diferentes lado a lado na galeria.
export async function createCreative(input: {
  projectId: string;
  copyEntryId: string | null;
  referenceImageIds: string[];
}): Promise<Creative> {
  const supabase = getSupabase();
  const { data: created, error: insertError } = await supabase
    .from("creatives")
    .insert({ project_id: input.projectId, copy_entry_id: input.copyEntryId })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);

  const links = input.referenceImageIds.map((referenceImageId) => ({
    creative_id: created.id,
    reference_image_id: referenceImageId,
  }));
  const { error: linkError } = await supabase.from("creative_references").insert(links);
  if (linkError) throw new Error(linkError.message);

  return {
    id: created.id,
    copyEntryId: created.copy_entry_id,
    createdAt: created.created_at,
    versions: [],
  };
}

// ---------------------------------------------------------------------
// creative_versions
// ---------------------------------------------------------------------
export async function listCreativeVersions(creativeId: string): Promise<CreativeVersion[]> {
  const { data, error } = await getSupabase()
    .from("creative_versions")
    .select("*")
    .eq("creative_id", creativeId)
    .order("version_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(creativeVersionFromDb);
}

export async function getLatestVersion(creativeId: string): Promise<CreativeVersion | null> {
  const { data, error } = await getSupabase()
    .from("creative_versions")
    .select("*")
    .eq("creative_id", creativeId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? creativeVersionFromDb(data) : null;
}

export async function addCreativeVersion(input: {
  creativeId: string;
  storagePath: string;
  promptUsado?: string | null;
  instrucaoRefinamento?: string | null;
}): Promise<CreativeVersion> {
  const latest = await getLatestVersion(input.creativeId);
  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  const { data, error } = await getSupabase()
    .from("creative_versions")
    .insert({
      creative_id: input.creativeId,
      version_number: versionNumber,
      storage_path: input.storagePath,
      prompt_usado: input.promptUsado ?? null,
      instrucao_refinamento: input.instrucaoRefinamento ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return creativeVersionFromDb(data);
}

// ---------------------------------------------------------------------
// Listagem consolidada pra galeria do /studio
// ---------------------------------------------------------------------
export async function listCreativesWithDetails(projectId: string): Promise<CreativeWithDetails[]> {
  const { data, error } = await getSupabase()
    .from("creatives")
    .select(
      "*, copy_entries(*), creative_versions(*), creative_references(reference_images(*))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .order("version_number", { ascending: true, foreignTable: "creative_versions" });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    copyEntryId: row.copy_entry_id,
    createdAt: row.created_at,
    copyEntry: row.copy_entries ? copyEntryFromDb(row.copy_entries) : null,
    referenceImages: (row.creative_references ?? []).map((cr: any) =>
      referenceImageFromDb(cr.reference_images),
    ),
    versions: (row.creative_versions ?? []).map(creativeVersionFromDb),
  }));
}

// ── Criativos salvos na Biblioteca (LayoutSpec em jsonb) ─────────────────────
function savedCreativeFromDb(row: any): SavedCreative {
  return {
    id: row.id,
    projectId: row.project_id,
    spec: row.spec,
    concept: row.concept,
    format: row.format,
    persona: row.persona,
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function listSavedCreatives(projectId: string): Promise<SavedCreative[]> {
  const { data, error } = await getSupabase()
    .from("saved_creatives")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(savedCreativeFromDb);
}

export async function saveCreative(input: {
  projectId: string;
  spec: unknown;
  concept: string | null;
  format: string;
  persona: string | null;
  source: string;
}): Promise<SavedCreative> {
  const { data, error } = await getSupabase()
    .from("saved_creatives")
    .insert({
      project_id: input.projectId,
      spec: input.spec,
      concept: input.concept,
      format: input.format,
      persona: input.persona,
      source: input.source,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return savedCreativeFromDb(data);
}

export async function deleteSavedCreative(id: string): Promise<void> {
  const { error } = await getSupabase().from("saved_creatives").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Imagens salvas (Biblioteca de imagem — arquivo no Storage) ───────────────
function savedImageFromDb(row: any): SavedImage {
  return {
    id: row.id,
    projectId: row.project_id,
    storagePath: row.storage_path,
    publicUrl: getPublicUrl(row.storage_path),
    prompt: row.prompt,
    format: row.format,
    createdAt: row.created_at,
  };
}

export async function listSavedImages(projectId: string): Promise<SavedImage[]> {
  const { data, error } = await getSupabase()
    .from("saved_images")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(savedImageFromDb);
}

export async function saveImage(input: {
  projectId: string;
  storagePath: string;
  prompt: string | null;
  format: string | null;
}): Promise<SavedImage> {
  const { data, error } = await getSupabase()
    .from("saved_images")
    .insert({
      project_id: input.projectId,
      storage_path: input.storagePath,
      prompt: input.prompt,
      format: input.format,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return savedImageFromDb(data);
}

export async function deleteSavedImage(id: string): Promise<void> {
  const { error } = await getSupabase().from("saved_images").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
