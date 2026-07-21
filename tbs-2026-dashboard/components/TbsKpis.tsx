'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';

// KPIs principais do TBS — as 4 etapas do funil (mesma fonte do "Funil de Leads").
const KPIS: { key: string; label: string }[] = [
  { key: 'inscricao_confirmada', label: 'Inscrição confirmada' },
  { key: 'completou_cadastro', label: 'Entrou na plataforma' },
  { key: 'upload_video_concluido', label: 'Upload vídeo concluído' },
  { key: 'analise_ia_pronto', label: 'Análise de IA pronto' },
];

export function TbsKpis({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const stages = data.funnel?.stages ?? [];
  const byKey = new Map(stages.map((s) => [s.key as string, s.value]));
  const topo = byKey.get('inscricao_confirmada') ?? 0;

  return (
    <section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((kpi, i) => {
          const value = byKey.get(kpi.key) ?? 0;
          const pct = topo > 0 ? value / topo : 0;
          const highlight = i === 0;
          return (
            <button
              key={kpi.key}
              onClick={() => open({ type: 'funnel', value: kpi.key })}
              className={`block w-full rounded-xl p-5 border text-left transition ${
                highlight
                  ? 'border-tbs-orange bg-gradient-to-br from-tbs-orange/15 to-tbs-orange/5 hover:from-tbs-orange/25 hover:to-tbs-orange/10'
                  : 'border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-surface hover:border-tbs-orange/60'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
                {kpi.label}
              </div>
              <div className={`kpi-value text-3xl mt-2 ${highlight ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : ''}`}>
                {formatNumber(value)}
              </div>
              <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 font-mono">
                {i === 0 ? 'topo do funil' : `${(pct * 100).toFixed(1)}% do topo`}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
