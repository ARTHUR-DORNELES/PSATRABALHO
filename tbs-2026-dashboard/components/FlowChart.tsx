'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { TBS_FLOW, type FlowStage, type HubspotStatus, summarizeFlow } from '@/lib/tbs-flow';
import { isInscriptionOpen } from '@/lib/dates';

// Cores por número de página
const PAGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '1': { bg: 'bg-tbs-orange-50', border: 'border-tbs-orange-100', text: 'text-tbs-orange-deep' },
  '2': { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800' },
  '2.1': { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800' },
  '3': { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-800' },
  '4': { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-800' },
  '5': { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-800' },
  '6': { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800' },
};

export function FlowChart({ data }: { data: Snapshot }) {
  void data; // future: contagens por estágio via /api/flow-counts
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();
  const summary = summarizeFlow();

  // Agrupar etapas por página
  const groups: { page: string; pageLabel: string; stages: FlowStage[] }[] = [];
  for (const s of TBS_FLOW) {
    const key = String(s.page);
    const existing = groups.find((g) => g.page === key);
    if (existing) existing.stages.push(s);
    else groups.push({ page: key, pageLabel: s.pageLabel, stages: [s] });
  }

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">Fluxo de inscrição TBS 2026</h2>
        <span className="text-xs text-tbs-mute">
          6 páginas · {summary.total} status · {summary.existing} prontos no HubSpot
        </span>
      </div>
      <div className="divider-gradient w-16 mb-4" />

      <FlowLegend summary={summary} />

      <div className="my-3 p-3 rounded-lg bg-sky-50 border border-sky-100 text-xs">
        <span className="font-semibold text-sky-900">📌 Lógica nova (2026-05-19):</span>{' '}
        <span className="text-sky-900">
          O lead é contabilizado <strong>desde a pág 1</strong> (form fill), não mais só quando finaliza. Logo{' '}
          <code className="font-mono bg-white px-1 rounded">tbs___etapa = Concluir inscrição</code> é populado{' '}
          <strong>imediatamente</strong> após o submit do formulário principal. A pág 4 (perfil) deixou de mudar
          estágio — só coleta nome/bio/data/frase.
        </span>
      </div>

      {!isOpen && (
        <div className="my-4 p-3 rounded-lg bg-tbs-orange-50 border border-tbs-orange-100 text-xs">
          <span className="font-semibold text-tbs-orange-deep">Inscrições abrem em 01/06/2026.</span>{' '}
          <span className="text-tbs-orange-deep">
            Todos os status estão em 0 até lá. Use este mapa pra conferir quais já estão sendo rastreados no HubSpot
            vs quais ainda não — checklist completo em "Gaps de tagueamento" abaixo.
          </span>
        </div>
      )}

      <ol className="space-y-4 mt-4">
        {groups.map((g) => {
          const colors = PAGE_COLORS[g.page] ?? PAGE_COLORS['1'];
          return (
            <li key={g.page}>
              <div className={`flex items-center gap-3 mb-2`}>
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${colors.bg} ${colors.text} border ${colors.border}`}
                >
                  {g.page}
                </span>
                <div>
                  <div className="display uppercase text-sm">Página {g.page}</div>
                  <div className="text-xs text-tbs-mute">{g.pageLabel}</div>
                </div>
              </div>
              <ul className="space-y-1.5 ml-4 pl-5 border-l-2 border-tbs-line/60">
                {g.stages.map((s) => (
                  <FlowStageRow
                    key={s.id}
                    stage={s}
                    onDrill={() => {
                      if (s.drillStageValue) open({ type: 'stage', value: s.drillStageValue, edition: '2026' });
                    }}
                  />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FlowStageRow({ stage, onDrill }: { stage: FlowStage; onDrill: () => void }) {
  const canDrill = stage.drillStageValue && (stage.hubspot.kind === 'existing' || stage.hubspot.kind === 'rename_existing');
  const Tag = canDrill ? 'button' : 'div';

  return (
    <li>
      <Tag
        onClick={canDrill ? onDrill : undefined}
        className={`w-full text-left rounded-lg border p-3 transition ${
          stage.isDropoff
            ? 'bg-red-50/40 border-red-100 hover:bg-red-50'
            : 'bg-white border-tbs-line hover:bg-tbs-orange-50/30'
        } ${canDrill ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${stage.isDropoff ? 'text-red-900' : 'text-tbs-ink'}`}>
                {stage.status}
              </span>
              {stage.isDropoff && (
                <span className="tbs-pill bg-red-100 text-red-700 text-[10px] uppercase tracking-widest">
                  drop-off
                </span>
              )}
              {stage.hasReguaEmail && (
                <span className="tbs-pill bg-amber-100 text-amber-800 text-[10px] uppercase tracking-widest">
                  📧 {stage.reguaLabel}
                </span>
              )}
            </div>
            {stage.description && (
              <div className="text-[11px] text-tbs-mute mt-1">{stage.description}</div>
            )}
            <div className="mt-1.5">
              <HubspotBadge h={stage.hubspot} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="display text-xl text-tbs-line">{formatNumber(0)}</div>
            {canDrill && (
              <div className="text-[10px] text-tbs-orange-deep mt-0.5 font-mono">clicar →</div>
            )}
          </div>
        </div>
      </Tag>
    </li>
  );
}

function HubspotBadge({ h }: { h: HubspotStatus }) {
  switch (h.kind) {
    case 'existing':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          <span>✅</span>
          <span>{h.property} = "{h.value}"</span>
        </span>
      );
    case 'rename_existing':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
          <span>⚠️</span>
          <span>{h.property} = "{h.existingValue}" → renomear "{h.newName}" (validar)</span>
        </span>
      );
    case 'pending_new_value':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-violet-800 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
          <span>🆕</span>
          <span>novo valor em {h.property}: "{h.valueProposed}"</span>
        </span>
      );
    case 'pending_new_property':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-tbs-mute bg-tbs-line/30 px-2 py-0.5 rounded border border-tbs-line">
          <span>🔧</span>
          <span>ainda não rastreado no HubSpot</span>
        </span>
      );
    case 'click_tracking':
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
          <span>👆</span>
          <span>tracking de click no botão HubSpot embeddado</span>
        </span>
      );
  }
}

function FlowLegend({ summary }: { summary: ReturnType<typeof summarizeFlow> }) {
  const items = [
    { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '✅', label: 'Pronto no HubSpot', value: summary.existing },
    { color: 'bg-amber-50 text-amber-800 border-amber-100', icon: '⚠️', label: 'Renomear valor existente', value: summary.rename },
    { color: 'bg-violet-50 text-violet-800 border-violet-100', icon: '🆕', label: 'Novo valor em enum', value: summary.pendingValue },
    { color: 'bg-tbs-line/30 text-tbs-mute border-tbs-line', icon: '🔧', label: 'Aguardando tech criar', value: summary.pendingProp },
    { color: 'bg-sky-50 text-sky-800 border-sky-100', icon: '👆', label: 'Click tracking', value: summary.click },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it.label} className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border ${it.color}`}>
          <span>{it.icon}</span>
          <span>{it.label}</span>
          <span className="font-mono font-semibold">{it.value}</span>
        </span>
      ))}
    </div>
  );
}
