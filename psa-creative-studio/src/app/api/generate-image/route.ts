import { NextResponse } from "next/server";
import { z } from "zod";
import { getReferenceImagesByIds } from "@/lib/db";
import { downloadImage, mimeTypeForPath } from "@/lib/storage";
import { generateFromPrompt } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  prompt: z.string().trim().min(3, "Escreva um prompt."),
  formatLabel: z.string().trim().default("Quadrado 1:1"),
  referenceImageIds: z.array(z.string().min(1)).max(6).default([]),
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
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const { prompt, formatLabel, referenceImageIds } = parsed.data;

  try {
    let referenceImages: Array<{ bytes: Buffer; mimeType: string }> = [];
    if (referenceImageIds.length > 0) {
      const refs = await getReferenceImagesByIds(referenceImageIds);
      referenceImages = await Promise.all(
        refs.map(async (r) => ({ bytes: await downloadImage(r.storagePath), mimeType: mimeTypeForPath(r.storagePath) })),
      );
    }

    const generated = await generateFromPrompt({ prompt, formatLabel, referenceImages });
    const dataUri = `data:${generated.mimeType};base64,${generated.imageBuffer.toString("base64")}`;
    return NextResponse.json({ image: dataUri });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar imagem." },
      { status: 500 },
    );
  }
}
