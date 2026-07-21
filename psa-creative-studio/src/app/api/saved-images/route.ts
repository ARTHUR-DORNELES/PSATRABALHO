import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listSavedImages, saveImage, deleteSavedImage } from "@/lib/db";
import { uploadImage, extensionFor } from "@/lib/storage";
import { resolveActiveProject } from "@/lib/active-project";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = await resolveActiveProject().catch(() => null);
  if (!project) return NextResponse.json({ images: [] });
  try {
    const images = await listSavedImages(project.id);
    return NextResponse.json({ images });
  } catch (e) {
    return NextResponse.json({ images: [], error: msg(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const project = await resolveActiveProject().catch(() => null);
  if (!project) return NextResponse.json({ error: "Nenhum projeto ativo" }, { status: 400 });

  let body: { image?: string; prompt?: string; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const m = /^data:(image\/[a-z+]+);base64,(.+)$/s.exec(body.image ?? "");
  if (!m) return NextResponse.json({ error: "imagem inválida (esperado data URI base64)" }, { status: 400 });
  const mime = m[1];
  const buffer = Buffer.from(m[2], "base64");

  try {
    const path = `saved-images/${project.id}/${randomUUID()}.${extensionFor(mime)}`;
    await uploadImage(path, buffer, mime);
    const image = await saveImage({
      projectId: project.id,
      storagePath: path,
      prompt: body.prompt ?? null,
      format: body.format ?? null,
    });
    return NextResponse.json({ image });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  try {
    await deleteSavedImage(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "erro";
}
