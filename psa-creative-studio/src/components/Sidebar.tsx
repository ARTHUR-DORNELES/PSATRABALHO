"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Images, FileText, Library, Sparkles, Wand2, LayoutGrid, Camera } from "lucide-react";
import clsx from "clsx";
import { GenerationQueueBar } from "@/components/GenerationQueueBar";

// Fluxo natural, numerado: Copy → gerar → salvar. Marca (logo/fotos) é apoio.
// As telas do fluxo antigo de imagem (Estúdio, Criativos gerados, Criativos
// HTML) foram aposentadas do menu — as páginas seguem existindo por URL.
const FLOW = [
  { href: "/copy", label: "1 · Copy", icon: FileText },
  { href: "/diretor", label: "2 · Diretor de Arte", icon: Sparkles },
  { href: "/biblioteca", label: "3 · Biblioteca de criativos", icon: Library },
];
const IMAGE = [
  { href: "/studio", label: "Estúdio de imagem", icon: Wand2 },
  { href: "/fotos-banlek", label: "Fotos (Banlek)", icon: Camera },
  { href: "/biblioteca-imagem", label: "Biblioteca de imagem", icon: LayoutGrid },
];
const OTHER = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/references", label: "Marca", icon: Images },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  const item = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof FileText }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        prefetch={false}
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-psa-accent/10 text-white shadow-[inset_2px_0_0_0_#00C86F]"
            : "text-psa-muted hover:bg-psa-card hover:text-white",
        )}
      >
        <Icon size={17} className={active ? "text-psa-accent" : ""} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-psa-border bg-psa-surface">
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-4">
        <div className="px-3 pb-1 text-[10px] uppercase tracking-widest text-psa-muted/70">Fluxo</div>
        {FLOW.map(item)}
        <div className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-widest text-psa-muted/70">Imagem</div>
        {IMAGE.map(item)}
        <div className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-widest text-psa-muted/70">Geral</div>
        {OTHER.map(item)}
      </nav>

      <GenerationQueueBar />

      <div className="border-t border-psa-border px-4 py-3 text-[11px] leading-relaxed text-psa-muted">
        PSA · criativos na marca TBS
      </div>
    </aside>
  );
}
