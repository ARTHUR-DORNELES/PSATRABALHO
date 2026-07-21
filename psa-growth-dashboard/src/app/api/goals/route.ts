import { NextResponse } from "next/server";
import { z } from "zod";
import { listGoals, upsertGoal } from "@/lib/db";
import type { GoalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function computeStatus(actual: number, target: number): GoalStatus {
  if (target <= 0) return "ON_TRACK";
  const pct = (actual / target) * 100;
  if (pct >= 100) return "ACHIEVED";
  if (pct >= 80) return "ON_TRACK";
  if (pct >= 50) return "AT_RISK";
  return "OFF_TRACK";
}

const schema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channelId: z.string().nullable().optional(),
  metricKey: z.string().min(1),
  targetValue: z.number().nonnegative(),
  actualValue: z.number().nonnegative().optional(),
  note: z.string().nullable().optional(),
});

export async function GET() {
  return NextResponse.json(await listGoals());
}

export async function POST(req: Request) {
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
  const { referenceMonth, channelId, metricKey, targetValue, actualValue, note } = parsed.data;
  const actual = actualValue ?? 0;
  try {
    const goal = await upsertGoal({
      referenceMonth,
      channelId: channelId ?? null,
      metricKey,
      targetValue,
      actualValue: actual,
      status: computeStatus(actual, targetValue),
      note: note ?? null,
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
