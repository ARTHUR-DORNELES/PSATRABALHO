import { NextResponse } from "next/server";
import { listSavedCreatives, saveCreative, deleteSavedCreative } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { sanitizeSpec } from "@/lib/layout-spec";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = await resolveActiveProject();
  if (!project) return NextResponse.json({ saved: [] });
  try {
    const saved = await listSavedCreatives(project.id);
    return NextResponse.json({ saved });
  } catch (e) {
    return NextResponse.json({ saved: [], error: msg(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const project = await resolveActiveProject();
  if (!project) return NextResponse.json({ error: "Nenhum projeto ativo" }, { status: 400 });

  let body: { spec?: unknown; concept?: string; format?: string; persona?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const spec = sanitizeSpec(body.spec);
  if (!spec) return NextResponse.json({ error: "spec inválida" }, { status: 400 });

  try {
    const saved = await saveCreative({
      projectId: project.id,
      spec,
      concept: body.concept ?? spec.concept ?? null,
      format: body.format ?? "quadrado",
      persona: body.persona ?? null,
      source: body.source ?? "diretor",
    });
    return NextResponse.json({ saved });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  try {
    await deleteSavedCreative(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: msg(e) }, { status: 500 });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "erro";
}
