import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { DrillClickable } from './DrillClickable';
import type { DrillQuery } from '@/lib/drill';

type CardDef = {
  title: string;
  value: number;
  sub: string;
  highlight?: boolean;
  query: DrillQuery;
};

const INSCRIPTION_OPENS = new Date('2026-06-01T00:00:00Z');

export function KpiCards({ data }: { data: Snapshot }) {
  const h = data.headline;
  const inscriptionsOpen = new Date() >= INSCRIPTION_OPENS;
  const inscritos = inscriptionsOpen ? h.edition2026.total : 0;
  const videoEnviado = data.funnel.stages.find((s) => s.key === 'upload_video_concluido')?.value ?? 0;
  const classificado = data.funnel.stages.find((s) => s.key === 'classificado')?.value ?? 0;
  const pedirVotos = data.funnel.stages.find((s) => s.key === 'pedir_votos')?.value ?? 0;

  const cards: CardDef[] = [
    {
      title: 'Inscritos TBS 2026',
      value: inscritos,
      sub: inscriptionsOpen ? 'inscrito TBS 2026 = Sim' : 'abrem em 01/06',
      highlight: inscriptionsOpen,
      query: { type: 'funnel', value: 'inscricao_confirmada' },
    },
    {
      title: 'Vídeos enviados',
      value: videoEnviado,
      sub: 'Upload vídeo concluído',
      query: { type: 'funnel', value: 'upload_video_concluido' },
    },
    {
      title: 'Em votação',
      value: pedirVotos,
      sub: 'Pedir votos',
      query: { type: 'stage', value: 'Pedir votos', edition: '2026' },
    },
    {
      title: 'Classificados',
      value: classificado,
      sub: 'Classificado',
      query: { type: 'stage', value: 'Classificado', edition: '2026' },
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => <Card key={c.title} card={c} />)}
      </div>
    </section>
  );
}

function Card({ card }: { card: CardDef }) {
  return (
    <DrillClickable
      query={card.query}
      className={`block w-full rounded-xl p-5 border transition text-left ${
        card.highlight
          ? 'border-tbs-orange bg-gradient-to-br from-tbs-orange/15 to-tbs-orange/5 hover:from-tbs-orange/25 hover:to-tbs-orange/10'
          : 'border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-surface hover:border-tbs-orange/60'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
        {card.title}
      </div>
      <div className={`kpi-value text-3xl mt-2 ${card.highlight ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : ''}`}>
        {formatNumber(card.value)}
      </div>
      <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 font-mono truncate" title={card.sub}>
        {card.sub}
      </div>
    </DrillClickable>
  );
}
