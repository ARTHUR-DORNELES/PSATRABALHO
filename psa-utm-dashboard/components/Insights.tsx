import clsx from 'clsx';
import { Section } from './Section';
import type { Dataset } from '@/lib/data';
import type { Insight, InsightTone } from '@/lib/insights';

const TONE_STYLES: Record<InsightTone, { wrap: string; chip: string; label: string; icon: string }> = {
  positive: {
    wrap: 'bg-psa-good-soft border-psa-good/20',
    chip: 'bg-psa-good text-white',
    label: 'positivo',
    icon: '✓',
  },
  negative: {
    wrap: 'bg-psa-bad-soft border-psa-bad/20',
    chip: 'bg-psa-bad text-white',
    label: 'crítico',
    icon: '!',
  },
  warning: {
    wrap: 'bg-psa-warn-soft border-psa-warn/20',
    chip: 'bg-psa-warn text-white',
    label: 'atenção',
    icon: '⚠',
  },
};

export function Insights({ data }: { data: Dataset }) {
  if (data.insights.length === 0) return null;
  const positives = data.insights.filter((i) => i.tone === 'positive');
  const negatives = data.insights.filter((i) => i.tone !== 'positive');

  return (
    <Section
      eyebrow="Executive summary"
      title="Insights gerados a partir dos dados"
      description="Leituras automáticas do que tá funcionando e do que precisa ser corrigido nesta janela. Recalcula a cada refresh."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Column title="O que está ruim" items={negatives} fallback="Nada crítico nesta janela." />
        <Column title="O que está funcionando" items={positives} fallback="Sem ganhos claros para destacar ainda." />
      </div>
    </Section>
  );
}

function Column({ title, items, fallback }: { title: string; items: Insight[]; fallback: string }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">{title}</h3>
      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-psa-mute italic">{fallback}</li>
        )}
        {items.map((it, i) => <InsightCard key={i} insight={it} />)}
      </ul>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const s = TONE_STYLES[insight.tone];
  return (
    <li className={clsx('rounded-xl border p-3', s.wrap)}>
      <div className="flex items-start gap-3">
        <span className={clsx('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0', s.chip)}>
          {s.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-psa-ink leading-snug">{renderInline(insight.headline)}</div>
          <p className="text-[13px] text-psa-smoke/80 mt-1 leading-snug">{renderInline(insight.detail)}</p>
          {insight.action && (
            <p className="text-[13px] text-psa-ink mt-2 leading-snug">
              <span className="text-[10px] uppercase tracking-wider text-psa-mute mr-2">ação</span>
              {renderInline(insight.action)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// Renderiza `back-ticked` como mono e mantém o resto como texto.
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('`') && p.endsWith('`') ? (
      <span key={i} className="mono text-[12px] bg-white/70 border border-psa-line px-1 py-0.5 rounded">
        {p.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
