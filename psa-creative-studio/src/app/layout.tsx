import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GenerationQueueProvider } from "@/components/GenerationQueueProvider";
import { listProjects } from "@/lib/db";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project";
import { isSupabaseConfigured } from "@/lib/config-status";
import { cookies } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PSA Creative Studio",
  description: "Gerador de criativos estáticos com IA para campanhas de marketing da PSA.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";
  // páginas "sem chrome": login e todas as rotas de render/export de criativo
  const bare = pathname.startsWith("/login") || pathname.includes("/render");

  const configured = !bare && isSupabaseConfigured();
  // Tolerante a falha (ex: migração 006_projects_migration.sql ainda não
  // rodou) — o layout nunca pode quebrar o app inteiro por causa disso.
  const projects = configured ? await listProjects().catch(() => []) : [];
  const cookieProjectId = cookies().get(ACTIVE_PROJECT_COOKIE)?.value;
  const activeProject = projects.find((p) => p.id === cookieProjectId) ?? projects[0] ?? null;

  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-psa-bg font-sans text-psa-ice antialiased">
        {bare ? (
          children
        ) : (
          <GenerationQueueProvider>
            <div className="flex h-screen flex-col">
              <TopBar projects={projects} activeProjectId={activeProject?.id ?? null} />
              <div className="flex min-h-0 flex-1">
                <Sidebar />
                <main className="psa-canvas min-w-0 flex-1 overflow-auto">{children}</main>
              </div>
            </div>
          </GenerationQueueProvider>
        )}
      </body>
    </html>
  );
}
