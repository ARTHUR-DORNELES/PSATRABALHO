import { NextResponse } from "next/server";
import { z } from "zod";
import { listProjects, createProject } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(1).max(80) });

export async function GET() {
  try {
    return NextResponse.json(await listProjects());
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
    return NextResponse.json({ error: "Envie um nome de projeto." }, { status: 400 });
  }
  try {
    const project = await createProject(parsed.data.name);
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro." }, { status: 500 });
  }
}
