import { NextResponse } from "next/server";
import { z } from "zod";
import { listReferenceImages, createReferenceImage } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { MAX_REFERENCE_IMAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  storagePath: z.string().min(1),
  name: z.string().min(1).max(120),
});

// "Promove" uma imagem já gerada pra biblioteca de referências, sem
// reenviar o arquivo — só aponta um novo reference_images pro mesmo
// storage_path. Assim dá pra usar um resultado da IA como base de uma
// próxima geração.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Envie storagePath e name." }, { status: 400 });
  }

  try {
    const project = await resolveActiveProject();
    if (!project) {
      return NextResponse.json({ error: "Nenhum projeto ativo. Crie um projeto primeiro." }, { status: 400 });
    }
    const existing = await listReferenceImages(project.id);
    if (existing.length >= MAX_REFERENCE_IMAGES) {
      return NextResponse.json(
        { error: `Limite de ${MAX_REFERENCE_IMAGES} imagens de referência atingido.` },
        { status: 400 },
      );
    }
    const reference = await createReferenceImage({ projectId: project.id, ...parsed.data });
    return NextResponse.json(reference, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
