import { PeriodFilter } from './PeriodFilter';
import { ObjectTabs } from './ObjectTabs';
import { ShareButton } from './ShareButton';
import { OBJECT_LABELS, PERIOD_LABELS, type Dataset } from '@/lib/data';

export function Header({ data }: { data: Dataset }) {
  const generated = new Date(data.generatedAt);
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-psa-line/80">
      <div className="max-w-[1320px] mx-auto px-6 py-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-psa-mute mb-1.5">PSA · MKT OPS</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-psa-ink leading-none">UTM Observability</h1>
          <p className="text-sm text-psa-mute mt-1.5">
            Inteligência de UTM por objeto: contato ≠ negócio. Janela <span className="mono text-psa-ink">{PERIOD_LABELS[data.period]}</span> · vendo <span className="mono text-psa-ink">{OBJECT_LABELS[data.objectType]}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ObjectTabs current={data.objectType} period={data.period} />
          <PeriodFilter current={data.period} objectType={data.objectType} />
          <ShareButton />
          <div className="text-[10px] uppercase tracking-[0.16em] text-psa-mute text-right">
            atualizado<br />
            <span className="mono text-psa-ink normal-case tracking-normal">{generated.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
