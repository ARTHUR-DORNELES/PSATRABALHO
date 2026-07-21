// =====================================================================
// Projeto ativo (workspace) — guardado num cookie, lido só no server
// (Server Components e Route Handlers, via next/headers). O cookie pode
// estar ausente ou apontar pra um projeto que não existe mais; nesse
// caso cai pro primeiro projeto da lista (ordenado por created_at).
// =====================================================================
import { cookies } from "next/headers";
import { listProjects } from "@/lib/db";
import type { Project } from "@/lib/types";

export const ACTIVE_PROJECT_COOKIE = "psa_creative_project";

export async function resolveActiveProject(): Promise<Project | null> {
  // Tolerante a falha (ex: migração 006_projects_migration.sql ainda não
  // rodou) — cai pra "sem projeto" em vez de derrubar a página.
  const projects = await listProjects().catch(() => []);
  if (projects.length === 0) return null;
  const cookieId = cookies().get(ACTIVE_PROJECT_COOKIE)?.value;
  return projects.find((p) => p.id === cookieId) ?? projects[0];
}
