"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  CalendarDays,
  Target,
  BarChart3,
  Radio,
  RefreshCw,
  Plus,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/experiments", label: "Experimentos", icon: FlaskConical },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
  { href: "/channels", label: "Canais", icon: Radio },
  { href: "/admin/sync", label: "Sincronização", icon: RefreshCw },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-psa-border bg-psa-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-psa-grad font-display text-lg font-bold text-[#06231a]">
          G
        </span>
        <div className="leading-tight">
          <div className="font-display text-xl font-bold tracking-tight psa-grad-text">
            GROWTH
          </div>
          <div className="text-[10px] uppercase tracking-widest text-psa-muted">
            Experimentação
          </div>
        </div>
      </div>

      <Link
        href="/experiments/new"
        className="psa-btn-primary mx-4 mb-4"
        prefetch={false}
      >
        <Plus size={16} /> Novo experimento
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
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
        })}
      </nav>

      <div className="border-t border-psa-border px-5 py-4 text-[11px] leading-relaxed text-psa-muted">
        Growth Ops · experimentação contínua
      </div>
    </aside>
  );
}
