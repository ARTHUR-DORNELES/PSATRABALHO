import type { Snapshot } from '@/lib/snapshot';
import { RefreshButton } from './RefreshButton';
import { ThemeToggle } from './ThemeProvider';
import { LiveClock } from './LiveClock';

export function Header({ data }: { data: Snapshot }) {
  const generated = new Date(data.generatedAt).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit',
  });
  return (
    <header className="relative overflow-hidden bg-[#0E0E14] text-white">
      {/* Padrão de ondas/barras laranja - identidade TBS */}
      <WaveBackground />
      <div className="relative max-w-[1280px] mx-auto px-8 py-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <TbsLogoMark />
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="display text-2xl uppercase tracking-wide leading-none">
                The Best Speaker <span className="text-tbs-orange">2026</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-tbs-orange-light font-semibold border border-tbs-orange-light/40 rounded px-2 py-0.5">
                3ª edição
              </span>
            </div>
            <div className="text-xs text-white/60 mt-1.5 tracking-wide">
              Dashboard de inscrições, canais e representação regional · HubSpot ao vivo
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <LiveClock />
            <span className="text-[10px] text-white/35 font-mono">atualizado {generated}</span>
          </div>
          <ThemeToggle />
          <RefreshButton />
        </div>
      </div>
    </header>
  );
}

function TbsLogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 80 80" aria-label="The Best Speaker">
      <defs>
        <linearGradient id="tbsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D14A0F" />
          <stop offset="100%" stopColor="#FFA52A" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="40" rx="5" ry="14" fill="url(#tbsGrad)" />
      <ellipse cx="32" cy="40" rx="6" ry="22" fill="url(#tbsGrad)" />
      <ellipse cx="44" cy="40" rx="6" ry="28" fill="url(#tbsGrad)" />
      <ellipse cx="56" cy="40" rx="6" ry="22" fill="url(#tbsGrad)" />
      <ellipse cx="68" cy="40" rx="5" ry="14" fill="url(#tbsGrad)" />
    </svg>
  );
}

function WaveBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 1280 120"
      aria-hidden
    >
      <defs>
        <linearGradient id="waveLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F08220" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#D14A0F" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#D14A0F" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveRight" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#F08220" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#D14A0F" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#D14A0F" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: 14 }, (_, i) => i + 1).map((i) => {
        const y = i * 8;
        return (
          <g key={i}>
            <rect x="0" y={y} width="600" height="2" fill="url(#waveLeft)" />
            <rect x="680" y={y} width="600" height="2" fill="url(#waveRight)" />
          </g>
        );
      })}
    </svg>
  );
}
