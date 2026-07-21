import { NextResponse } from "next/server";
import { recomputeExperiment } from "@/lib/results";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await recomputeExperiment(params.id);
    if (!result) {
      return NextResponse.json(
        { error: "Experimento sem critério de decisão ou variantes." },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao recalcular." },
      { status: 500 },
    );
  }
}
