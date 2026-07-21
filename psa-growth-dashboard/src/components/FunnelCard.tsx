import Link from "next/link";
import clsx from "clsx";
import { Mail, MessageCircle, Globe, Megaphone, Search, Radio, ArrowRight } from "lucide-react";
import { Pill } from "./Pill";
import { ProgressBar } from "./ProgressBar";
import type { ExperimentFunnel, MetricDefinition, ChannelKind } from "@/lib/types";
import {
  CHANNEL_LABEL,
  RECO_LABEL,
  RECO_TONE,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/ui";
import { fmtCurrency, fmtDate, fmtInt, fmtLift, fmtPct } from "@/lib/format";

function ChannelIcon({ kind, className }: { kind: ChannelKind; className?: string }) {
  const Icon =
    kind === "EMAIL"
      ? Mail
      : kind === "WHATSAPP"
        ? MessageCircle
        : kind === "ORGANIC_CONTENT"
          ? Globe
          : kind === "META_ADS"
            ? Megaphone
            : kind === "GOOGLE_ADS"
              ? Search
              : Radio;
  return <Icon className={className} size={15} />;
}

function Stage({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-psa-accent/20 text-[11px] font-bold text-psa-accent">
          {n}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-psa-muted">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export function FunnelCard({
  funnel,
  targetMetric,
}: {
  funnel: ExperimentFunnel;
  targetMetric: MetricDefinition | null;
}) {
  const { experiment: e, channel, variants, result: r } = funnel;
  const isRate = targetMetric?.kind === "RATE";
  const goodDirection =
    r?.relativeLift != null &&
    r.relativeLift !== 0 &&
    (r.relativeLift > 0) === ((targetMetric?.higherIsBetter ?? 1) === 1);
  const treatmentCount = variants.filter((v) => !v.isControl).length;

  return (
    <article className="psa-card overflow-hidden transition-colors hover:border-psa-accent/40">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-psa-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-psa-muted">
            <ChannelIcon kind={channel?.kind ?? "OTHER"} />
            {channel ? CHANNEL_LABEL[channel.kind] : "—"}
            {e.code && <span className="text-psa-border">·</span>}
            {e.code && <span>{e.code}</span>}
          </div>
          <Link
            href={`/experiments/${e.id}`}
            className="mt-1 block truncate text-base font-semibold text-white hover:text-psa-accent"
          >
            {e.name}
          </Link>
        </div>
        <Pill tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Pill>
      </header>

      <div className="grid grid-cols-1 divide-y divide-psa-border md:grid-cols-5 md:divide-x md:divide-y-0">
        {/* 1 — Início */}
        <Stage n={1} title="Início do teste">
          <div className="text-sm font-semibold text-white">{fmtDate(e.startedAt)}</div>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-psa-muted">
            {e.hypothesis}
          </p>
        </Stage>

        {/* 2 — Execução */}
        <Stage n={2} title="O que está sendo feito">
          <p className="line-clamp-3 text-xs leading-relaxed text-psa-muted">
            {e.execution ?? "—"}
          </p>
          <div className="mt-2 text-[11px] text-psa-muted">
            Controle + {treatmentCount} variante{treatmentCount === 1 ? "" : "s"}
          </div>
        </Stage>

        {/* 3 — Números atuais */}
        <Stage n={3} title="Números atuais">
          <div className="text-[11px] text-psa-muted">{targetMetric?.label ?? "—"}</div>
          {isRate ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-psa-muted">Controle</span>
                <span className="font-semibold text-white">{fmtPct(r?.controlRate)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-psa-muted">Melhor</span>
                <span className="font-semibold text-psa-accent">{fmtPct(r?.bestRate)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-1 psa-kpi text-2xl">{fmtInt(r?.bestRate)}</div>
          )}
        </Stage>

        {/* 4 — Retorno */}
        <Stage n={4} title="Retorno que trouxe">
          <div className="flex items-baseline gap-1">
            <span className="psa-kpi text-2xl">{fmtInt(r?.leadsAttributed)}</span>
            <span className="text-[11px] text-psa-muted">leads</span>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-psa-muted">
            <div>Receita: <span className="text-white">{fmtCurrency(r?.revenueAttributed)}</span></div>
            {r?.cac != null && (
              <div>CAC: <span className="text-white">{fmtCurrency(r.cac, true)}</span></div>
            )}
            {r?.relativeLift != null && (
              <div>
                Lift:{" "}
                <span className={clsx("font-semibold", goodDirection ? "text-psa-success" : "text-psa-danger")}>
                  {fmtLift(r.relativeLift)}
                </span>
              </div>
            )}
          </div>
        </Stage>

        {/* 5 — Quanto falta para oficializar */}
        <Stage n={5} title="Quanto falta">
          {r?.recommendation && (
            <Pill tone={RECO_TONE[r.recommendation]} className="mb-2">
              {RECO_LABEL[r.recommendation]}
            </Pill>
          )}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[11px] text-psa-muted">
                <span>Confiança</span>
                <span className="font-semibold text-white">{fmtPct(r?.confidence)}</span>
              </div>
              <ProgressBar
                pct={r?.confidence != null ? r.confidence * 100 : 0}
                tone={r?.isSignificant ? "success" : "warning"}
                className="mt-1"
              />
            </div>
            {isRate && (
              <div className="text-[11px] text-psa-muted">
                {r?.remainingNPerArm != null && r.remainingNPerArm > 0
                  ? `Faltam ~${fmtInt(r.remainingNPerArm)}/braço`
                  : "Amostra suficiente"}
              </div>
            )}
          </div>
        </Stage>
      </div>

      <Link
        href={`/experiments/${e.id}`}
        className="flex items-center justify-end gap-1 border-t border-psa-border px-4 py-2 text-xs font-semibold text-psa-muted hover:text-psa-accent"
      >
        Ver detalhe <ArrowRight size={13} />
      </Link>
    </article>
  );
}
