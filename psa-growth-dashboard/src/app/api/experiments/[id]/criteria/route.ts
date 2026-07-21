import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCriteria } from "@/lib/db";
import { recomputeExperiment } from "@/lib/results";

export const dynamic = "force-dynamic";

const schema = z.object({
  minDetectableEffect: z.number().min(0.001).max(5).optional(),
  confidenceLevel: z.number().min(0.5).max(0.999).optional(),
  targetValue: z.number().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateCriteria(params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Critério não encontrado." }, { status: 404 });
  const result = await recomputeExperiment(params.id);
  return NextResponse.json({ ok: true, criteria: updated, result });
}
