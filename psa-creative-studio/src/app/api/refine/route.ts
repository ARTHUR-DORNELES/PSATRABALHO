import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getLatestVersion, addCreativeVersion } from "@/lib/db";
import { downloadImage, uploadImage, extensionFor, mimeTypeForPath } from "@/lib/storage";
import { refineCreative } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  creativeId: z.string().min(1),
  instruction: z.string().min(3),
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
    return NextResponse.json(
      { error: "Envie creativeId e uma instrução de refinamento." },
      { status: 400 },
    );
  }
  const { creativeId, instruction } = parsed.data;

  try {
    const latest = await getLatestVersion(creativeId);
    if (!latest) {
      return NextResponse.json(
        { error: "Gere a primeira versão desse criativo antes de refinar." },
        { status: 400 },
      );
    }

    const previousBytes = await downloadImage(latest.storagePath);
    const previousMimeType = mimeTypeForPath(latest.storagePath);

    const refined = await refineCreative({
      previousImageBytes: previousBytes,
      previousMimeType,
      instruction,
    });

    const storagePath = `generated/${creativeId}/${randomUUID()}.${extensionFor(refined.mimeType)}`;
    await uploadImage(storagePath, refined.imageBuffer, refined.mimeType);

    const version = await addCreativeVersion({
      creativeId,
      storagePath,
      promptUsado: refined.promptUsado,
      instrucaoRefinamento: instruction,
    });

    return NextResponse.json(version, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
