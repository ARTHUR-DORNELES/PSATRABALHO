import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSuggestions } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ experimentId: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe experimentId." }, { status: 400 });
  }
  try {
    const suggestions = await generateSuggestions(parsed.data.experimentId);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar sugestões." },
      { status: 500 },
    );
  }
}
