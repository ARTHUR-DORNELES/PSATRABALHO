import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteExperiment, getFunnel, updateExperiment } from "@/lib/db";

function revalidateLists(id: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
}

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const funnel = await getFunnel(params.id);
  if (!funnel) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json(funnel);
}

const patchSchema = z.object({
  status: z.enum(["DRAFT", "RUNNING", "PAUSED", "WON", "LOST", "INCONCLUSIVE"]).optional(),
  name: z.string().min(3).optional(),
  hypothesis: z.string().min(3).optional(),
  execution: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  decisionNote: z.string().nullable().optional(),
  decidedAt: z.string().nullable().optional(),
  decidedBy: z.string().nullable().optional(),
  front: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateExperiment(params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  revalidateLists(params.id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await deleteExperiment(params.id);
  revalidateLists(params.id);
  return NextResponse.json({ ok: true });
}
