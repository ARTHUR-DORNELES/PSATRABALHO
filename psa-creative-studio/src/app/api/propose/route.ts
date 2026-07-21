import { NextResponse } from "next/server";
import { proposeLayouts } from "@/lib/gemini-layouts";
import type { CopyInput, LayoutSpec } from "@/lib/layout-spec";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { count?: number; copy?: CopyInput; basedOn?: LayoutSpec[]; brief?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const copy = body.copy;
  if (!copy?.headline || !copy?.persona) {
    return NextResponse.json({ error: "copy (persona, headline) é obrigatório" }, { status: 400 });
  }
  const count = Math.min(Math.max(Number(body.count) || 8, 1), 12);

  try {
    const { specs, source } = await proposeLayouts(copy, count, body.basedOn, body.brief);
    return NextResponse.json({ specs, source });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao propor layouts" },
      { status: 500 },
    );
  }
}
