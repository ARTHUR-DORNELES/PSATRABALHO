'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { TbsKpis } from './TbsKpis';
import { DailyMetricsChart } from './DailyMetricsChart';
import { Inscricoes30minChart } from './Inscricoes30minChart';
import { CanaisEntradaBlock } from './CanaisEntradaBlock';
import { OrigensDiariasBlock } from './OrigensDiariasBlock';
import { BrazilMap } from './BrazilMap';
import { TheBestSchoolBlock } from './TheBestSchoolBlock';
import { TheBestSchoolNaoInscritoBlock } from './TheBestSchoolNaoInscritoBlock';
import { PaidRoiBlock } from './PaidRoiBlock';
import { RoasHoraChart } from './RoasHoraChart';
import { ConversaoCanalChart } from './ConversaoCanalChart';
import { VendasPorCanalChart } from './VendasPorCanalChart';
import { DisparosCostBlock } from './DisparosCostBlock';
import { VisaoIntegradaBlock } from './VisaoIntegradaBlock';
import type { WhatsappCosts } from '@/lib/whatsapp-costs';
import { RegistrosBlock } from './RegistrosBlock';
import { PaceBlock } from './PaceBlock';
import { VotosBlock } from './VotosBlock';
import type { RefAdsDaily } from '@/lib/media-ref';

type TabKey = 'speaker' | 'school' | 'pace' | 'votos' | 'registros';

type Props = {
  data: Snapshot;
  meta: React.ComponentProps<typeof PaidRoiBlock>['meta'];
  google: React.ComponentProps<typeof PaidRoiBlock>['google'];
  refAds?: RefAdsDaily;
  whatsapp?: WhatsappCosts;
};

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: 'speaker', label: 'The Best Speaker', sub: 'inscrições · funil · canais' },
  { key: 'school', label: 'The Best School', sub: 'checkout · mídia · ROAS' },
  { key: 'pace', label: 'Pace', sub: 'meta 100k · ritmo' },
  { key: 'votos', label: 'Votos', sub: 'relatórios importáveis' },
  { key: 'registros', label: 'Registros', sub: 'atualizações · ocorrências' },
];

// Dashboards externos (abrem em nova aba) — NÃO são abas, são atalhos pra outros painéis.
const EXTERNAL_LINKS: { href: string; label: string; sub: string }[] = [
  { href: 'https://tbs-meta-ads.vercel.app/', label: 'Mídia paga', sub: 'painel Gustavo' },
  { href: 'https://dashboard-tbs.vercel.app/', label: 'Disparos', sub: 'painel Giovanna' },
];

export function DashboardTabs({ data, meta, google, refAds, whatsapp }: Props) {
  const [tab, setTab] = useState<TabKey>('speaker');

  return (
    <>
      {/* Barra de abas */}
      <div className="sticky top-0 z-20 -mx-8 px-8 py-3 bg-tbs-bg-light/85 dark:bg-tbs-bg/85 backdrop-blur border-b border-tbs-line-light dark:border-tbs-line">
        <div className="flex flex-nowrap items-stretch gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 text-left rounded-lg px-3 py-1.5 border transition ${
                  active
                    ? 'bg-tbs-orange text-white border-tbs-orange shadow-sm'
                    : 'border-tbs-line-light dark:border-tbs-line text-tbs-ink-light dark:text-white hover:border-tbs-orange/60 hover:bg-tbs-orange-50/40 dark:hover:bg-tbs-bg-3/60'
                }`}
              >
                <div className="text-[13px] font-semibold leading-tight whitespace-nowrap">{t.label}</div>
                <div className={`text-[9px] leading-tight whitespace-nowrap ${active ? 'text-white/80' : 'text-tbs-mute-light dark:text-tbs-mute'}`}>{t.sub}</div>
              </button>
            );
          })}
          {/* Atalhos pra dashboards externos (nova aba) — não são abas; empurrados pra direita */}
          {EXTERNAL_LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir ${l.label} em nova aba`}
              className={`shrink-0 group text-left rounded-lg px-3 py-1.5 border border-tbs-orange/40 bg-tbs-orange/10 text-tbs-orange-deep dark:text-tbs-orange-light hover:bg-tbs-orange/20 hover:border-tbs-orange transition ${i === 0 ? 'ml-auto' : ''}`}
            >
              <div className="text-[13px] font-semibold leading-tight whitespace-nowrap flex items-center gap-1">
                {l.label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100 transition">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </div>
              <div className="text-[9px] leading-tight whitespace-nowrap text-tbs-orange-deep/70 dark:text-tbs-orange-light/70">{l.sub}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-5 mt-5">
        {tab === 'speaker' && (
          <>
            <TbsKpis data={data} />
            <DailyMetricsChart data={data} />
            <Inscricoes30minChart data={data} />
            <CanaisEntradaBlock data={data} />
            <OrigensDiariasBlock data={data} />
            <BrazilMap data={data} />
            {/* Visão integrada (Speaker → School) — agora dentro da aba do TBS */}
            <div className="flex items-center gap-3 pt-3">
              <div className="h-px flex-1 bg-tbs-line-light dark:bg-tbs-line" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-tbs-orange-deep dark:text-tbs-orange-light whitespace-nowrap">Visão integrada · Speaker → School</span>
              <div className="h-px flex-1 bg-tbs-line-light dark:bg-tbs-line" />
            </div>
            <VisaoIntegradaBlock data={data} />
          </>
        )}

        {tab === 'school' && (
          <>
            <TheBestSchoolBlock data={data} meta={meta} />
            <TheBestSchoolNaoInscritoBlock data={data} />
            <PaidRoiBlock data={data} meta={meta} google={google} />
            <RoasHoraChart data={data} meta={meta} google={google} />
            <ConversaoCanalChart data={data} />
            <VendasPorCanalChart data={data} />
            {/* Relatório de custo & ROI dos disparos de WhatsApp (Max + Maria) — no final da aba */}
            <DisparosCostBlock data={data} whatsapp={whatsapp} />
          </>
        )}

        {tab === 'pace' && <PaceBlock data={data} meta={meta} google={google} refAds={refAds} />}

        {tab === 'votos' && <VotosBlock />}

        {tab === 'registros' && <RegistrosBlock />}
      </div>
    </>
  );
}
