import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getReferenceImagesByIds,
  getReferenceImageById,
  getCopyEntryById,
  createCreative,
  addCreativeVersion,
} from "@/lib/db";
import { downloadImage, uploadImage, extensionFor, mimeTypeForPath } from "@/lib/storage";
import { generateCreative } from "@/lib/gemini";
import { resolveActiveProject } from "@/lib/active-project";
import { MAX_MERGE_REFERENCES, GENERATION_MODES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  mode: z.enum(GENERATION_MODES).default("MERGE_LITERAL"),
  referenceImageIds: z.array(z.string().min(1)).max(MAX_MERGE_REFERENCES).default([]),
  copyEntryIds: z.array(z.string().min(1)).max(20).default([]),
  brandNotes: z.string().trim().max(500).optional(),
  logoReferenceId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { mode, referenceImageIds, copyEntryIds, brandNotes, logoReferenceId } = parsed.data;

  const project = await resolveActiveProject();
  if (!project) {
    return NextResponse.json({ error: "Nenhum projeto ativo. Crie um projeto primeiro." }, { status: 400 });
  }

  // Cada modo exige uma combinação diferente de referência(s)/copy.
  if (mode !== "COPY_ONLY" && referenceImageIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione pelo menos 1 imagem de referência para esse modo." },
      { status: 400 },
    );
  }
  if (mode === "COPY_ONLY" && copyEntryIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione pelo menos 1 linha de copy para gerar sem referência." },
      { status: 400 },
    );
  }
  if ((mode === "MERGE_LITERAL" || mode === "MERGE_INSPIRED") && copyEntryIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione pelo menos 1 linha de copy para esse modo." },
      { status: 400 },
    );
  }

  let referenceImages: Awaited<ReturnType<typeof getReferenceImagesByIds>> = [];
  let referenceInputs: Array<{ bytes: Buffer; mimeType: string }> = [];
  if (mode !== "COPY_ONLY") {
    referenceImages = await getReferenceImagesByIds(referenceImageIds);
    if (referenceImages.length === 0) {
      return NextResponse.json({ error: "Nenhuma imagem de referência encontrada." }, { status: 404 });
    }
    referenceInputs = await Promise.all(
      referenceImages.map(async (ref) => ({
        bytes: await downloadImage(ref.storagePath),
        mimeType: mimeTypeForPath(ref.storagePath),
      })),
    );
  }

  // Logo é independente do modo — pode ser anexado mesmo em COPY_ONLY, pra
  // manter a marca presente mesmo numa peça criada do zero.
  let logo: { bytes: Buffer; mimeType: string } | undefined;
  let logoReference: Awaited<ReturnType<typeof getReferenceImageById>> | null = null;
  if (logoReferenceId) {
    try {
      logoReference = await getReferenceImageById(logoReferenceId);
      logo = {
        bytes: await downloadImage(logoReference.storagePath),
        mimeType: mimeTypeForPath(logoReference.storagePath),
      };
    } catch {
      return NextResponse.json({ error: "Logo selecionado não encontrado." }, { status: 404 });
    }
  }

  // MERGE_NO_TEXT sem nenhuma copy selecionada: gera 1 variação puramente
  // visual (sem persona associada). Nos demais casos, 1 item por copy.
  const workItems: Array<string | null> = copyEntryIds.length > 0 ? copyEntryIds : [null];

  const allReferenceIds = logoReference
    ? [...referenceImages.map((r) => r.id), logoReference.id]
    : referenceImages.map((r) => r.id);

  // Sequencial (não em paralelo) de propósito: respeita rate limit da API do Gemini
  // e evita estourar cota num lote grande.
  const results = [];
  for (const copyEntryId of workItems) {
    try {
      const copyEntry = copyEntryId ? await getCopyEntryById(copyEntryId) : null;
      const creative = await createCreative({
        projectId: project.id,
        copyEntryId,
        referenceImageIds: allReferenceIds,
      });

      const generated = await generateCreative({
        mode,
        referenceImages: referenceInputs,
        copyEntry,
        brandNotes: brandNotes || undefined,
        logo,
      });

      const storagePath = `generated/${creative.id}/${randomUUID()}.${extensionFor(generated.mimeType)}`;
      await uploadImage(storagePath, generated.imageBuffer, generated.mimeType);

      const version = await addCreativeVersion({
        creativeId: creative.id,
        storagePath,
        promptUsado: generated.promptUsado,
      });

      results.push({ copyEntryId, creativeId: creative.id, version, error: null });
    } catch (e) {
      results.push({
        copyEntryId,
        creativeId: null,
        version: null,
        error: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    }
  }

  return NextResponse.json({ results });
}
