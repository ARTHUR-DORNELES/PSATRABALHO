import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listReferenceImages, createReferenceImage } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { uploadImage, extensionFor } from "@/lib/storage";
import { MAX_REFERENCE_IMAGES, MAX_LOGO_IMAGES } from "@/lib/constants";
import type { ReferenceKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const project = await resolveActiveProject();
    if (!project) return NextResponse.json([]);
    return NextResponse.json(await listReferenceImages(project.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const project = await resolveActiveProject();
    if (!project) {
      return NextResponse.json({ error: "Nenhum projeto ativo. Crie um projeto primeiro." }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "").trim();
    const kindRaw = String(form.get("kind") ?? "style");
    const kind: ReferenceKind = kindRaw === "logo" ? "logo" : "style";

    if (!(file instanceof Blob) || !name) {
      return NextResponse.json({ error: "Envie um arquivo e um nome." }, { status: 400 });
    }

    const existing = await listReferenceImages(project.id);
    const existingOfKind = existing.filter((r) => r.kind === kind).length;
    const max = kind === "logo" ? MAX_LOGO_IMAGES : MAX_REFERENCE_IMAGES;
    if (existingOfKind >= max) {
      return NextResponse.json(
        {
          error:
            kind === "logo"
              ? `Limite de ${MAX_LOGO_IMAGES} variações de logo atingido.`
              : `Limite de ${MAX_REFERENCE_IMAGES} imagens de referência atingido.`,
        },
        { status: 400 },
      );
    }

    const contentType = file.type || "image/png";
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = kind === "logo" ? "logos" : "references";
    const storagePath = `${folder}/${randomUUID()}.${extensionFor(contentType)}`;

    await uploadImage(storagePath, buffer, contentType);
    const reference = await createReferenceImage({ projectId: project.id, name, storagePath, kind });

    return NextResponse.json(reference, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
