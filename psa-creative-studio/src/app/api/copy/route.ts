import { NextResponse } from "next/server";
import { z } from "zod";
import { listCopyEntries, bulkInsertCopyEntries } from "@/lib/db";
import { resolveActiveProject } from "@/lib/active-project";
import { parseCopyPaste } from "@/lib/copy-parser";

export const dynamic = "force-dynamic";

const schema = z.object({ raw: z.string().min(1) });

export async function GET() {
  try {
    const project = await resolveActiveProject();
    if (!project) return NextResponse.json([]);
    return NextResponse.json(await listCopyEntries(project.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
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
    return NextResponse.json({ error: "Envie o texto colado em `raw`." }, { status: 400 });
  }

  const { rows, skipped } = parseCopyPaste(parsed.data.raw);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma linha válida encontrada na colagem." },
      { status: 400 },
    );
  }

  try {
    const project = await resolveActiveProject();
    if (!project) {
      return NextResponse.json({ error: "Nenhum projeto ativo. Crie um projeto primeiro." }, { status: 400 });
    }
    const created = await bulkInsertCopyEntries(project.id, rows);
    return NextResponse.json({ created, skipped }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
