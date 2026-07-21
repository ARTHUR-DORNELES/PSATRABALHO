// =====================================================================
// Helpers do Supabase Storage — bucket "creative-assets".
// Bucket precisa existir e estar marcado como público (ver supabase/schema.sql).
// =====================================================================
import { getSupabase } from "@/lib/supabase";

export const BUCKET = "creative-assets";

export async function uploadImage(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Falha no upload pro Storage (${path}): ${error.message}`);
  return path;
}

export function getPublicUrl(path: string): string {
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadImage(path: string): Promise<Buffer> {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Falha ao baixar imagem do Storage (${path}): ${error?.message ?? "vazio"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Extensão a partir do content-type (default png). */
export function extensionFor(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

/** Content-type a partir da extensão do storage_path (inverso de extensionFor). */
export function mimeTypeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}
