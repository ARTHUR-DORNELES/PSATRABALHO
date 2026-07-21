import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createExperiment, listExperiments } from "@/lib/db";
import { recomputeExperiment } from "@/lib/results";

// Invalida o cache das páginas que listam experimentos (home, calendário, lista).
function revalidateLists() {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/experiments");
}

export const dynamic = "force-dynamic";

const variantSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  isControl: z.boolean(),
  description: z.string().optional().nullable(),
  sourceKey: z.record(z.unknown()).optional(),
});

const createSchema = z.object({
  name: z.string().min(3),
  code: z.string().optional().nullable(),
  channelId: z.string().min(1),
  hypothesis: z.string().min(3),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD"),
  ownerEmail: z.string().email().optional().nullable(),
  execution: z.string().optional().nullable(),
  audience: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "RUNNING", "PAUSED", "WON", "LOST", "INCONCLUSIVE"]).optional(),
  createdBy: z.string().optional().nullable(),
  front: z.string().optional().nullable(),
  variants: z.array(variantSchema).min(1),
  criteria: z.object({
    targetMetricKey: z.string().min(1),
    minDetectableEffect: z.number().positive(),
    confidenceLevel: z.number().min(0.5).max(0.999),
    power: z.number().min(0.5).max(0.999),
    targetValue: z.number().nullable().optional(),
    testType: z.enum(["two-sided", "one-sided"]).optional(),
    decisionDeadline: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
});

export async function GET() {
  return NextResponse.json(await listExperiments());
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const controls = parsed.data.variants.filter((v) => v.isControl).length;
  if (controls !== 1) {
    return NextResponse.json(
      { error: "Defina exatamente uma variante de controle." },
      { status: 400 },
    );
  }

  try {
    const exp = await createExperiment(parsed.data);
    // Gera um resultado inicial (mesmo sem snapshots ainda).
    await recomputeExperiment(exp.id).catch(() => null);
    revalidateLists();
    return NextResponse.json(exp, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar experimento." },
      { status: 500 },
    );
  }
}
