'use client';
import { useState } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { BRAZIL_VIEWBOX, BRAZIL_STATES } from '@/lib/brazil-geo';

type RegionKey = 'norte' | 'nordeste' | 'centro_oeste' | 'suldeste' | 'sul';

const REGION_LABELS: Record<RegionKey, { label: string; hubspotValue: string }> = {
  norte: { label: 'Norte', hubspotValue: 'Norte' },
  nordeste: { label: 'Nordeste', hubspotValue: 'Nordeste' },
  centro_oeste: { label: 'Centro-Oeste', hubspotValue: 'Centro-Oeste' },
  suldeste: { label: 'Sudeste', hubspotValue: 'Suldeste' },
  sul: { label: 'Sul', hubspotValue: 'Sul' },
};

// Centro aproximado de cada região (label position) — calculado dos estados
const REGION_CENTERS: Record<RegionKey, { x: number; y: number }> = {
  norte: { x: 175, y: 145 },
  nordeste: { x: 380, y: 215 },
  centro_oeste: { x: 215, y: 330 },
  suldeste: { x: 340, y: 405 },
  sul: { x: 220, y: 490 },
};

const STATES_BY_REGION: Record<RegionKey, string[]> = {
  norte: [],
  nordeste: [],
  centro_oeste: [],
  suldeste: [],
  sul: [],
};
for (const sigla of Object.keys(BRAZIL_STATES)) {
  const regiao = BRAZIL_STATES[sigla].regiao as RegionKey;
  STATES_BY_REGION[regiao].push(sigla);
}

export function BrazilMap({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const regioes = data.regioes2026 ?? [];
  const [hovered, setHovered] = useState<RegionKey | null>(null);

  const byKey: Record<string, number> = {};
  for (const r of regioes) byKey[r.key] = r.count;

  const counts = Object.values(byKey);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts, 1);

  // Cor de fill estilo criativo: laranja vívido por intensidade (mínimo brilhante pra sempre "ler" laranja).
  // Região zerada fica em laranja translúcido (var --map-region-zero).
  const fillFor = (key: RegionKey): string => {
    const count = byKey[key] ?? 0;
    if (count === 0) return 'var(--map-region-zero)';
    const intensity = count / max;
    // De #F5A03C (baixa intensidade) até #D14A0F (alta) — sempre laranja saturado
    const r = Math.round(245 - intensity * (245 - 209));
    const g = Math.round(160 - intensity * (160 - 74));
    const b = Math.round(60 - intensity * (60 - 15));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Representação por região</h2>
          <p className="card-subtitle">
            as 5 regiões do Brasil serão representadas nessa edição · passe o mouse no mapa pra ver
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Com região preenchida</div>
          <div className="kpi-value text-2xl">{formatNumber(total)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Mapa SVG real (27 estados agrupados por região) sobre canvas dramático */}
        <div className="lg:col-span-3 relative map-canvas p-4">
          <svg viewBox={BRAZIL_VIEWBOX} className="w-full h-auto max-h-[480px] block relative z-10">
            <defs>
              {/* Glow + contorno luminoso por região (silhueta do grupo, sem linhas internas) */}
              <filter id="regionGlow" x="-30%" y="-30%" width="160%" height="160%">
                {/* glow externo laranja amplo */}
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FF7A28" floodOpacity="0.7" result="glow" />
                {/* borda clara fina (aproxima o contorno luminoso do criativo) */}
                <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodColor="#FFD8BE" floodOpacity="0.95" />
              </filter>
            </defs>
            {/* Renderizar 1 grupo por região: fill laranja sólido, sem stroke interno → silhueta unificada */}
            {(Object.keys(STATES_BY_REGION) as RegionKey[]).map((regionKey) => {
              const states = STATES_BY_REGION[regionKey];
              const region = REGION_LABELS[regionKey];
              const fill = fillFor(regionKey);
              const isHovered = hovered === regionKey;
              return (
                <g
                  key={regionKey}
                  onMouseEnter={() => setHovered(regionKey)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => open({ type: 'regiao', value: region.hubspotValue, edition: '2026' })}
                  className="cursor-pointer transition-all"
                  style={{
                    filter: `url(#regionGlow)${isHovered ? ' brightness(1.12)' : ''}`,
                  }}
                >
                  {states.map((sigla) => (
                    <path
                      key={sigla}
                      d={BRAZIL_STATES[sigla].path}
                      style={{ fill, stroke: 'none' }}
                    />
                  ))}
                </g>
              );
            })}
            {/* Labels e contagens em cima */}
            {(Object.keys(REGION_LABELS) as RegionKey[]).map((regionKey) => {
              const center = REGION_CENTERS[regionKey];
              const region = REGION_LABELS[regionKey];
              const count = byKey[regionKey] ?? 0;
              const isZero = count === 0;
              return (
                <g key={`label-${regionKey}`} className="pointer-events-none">
                  <text
                    x={center.x}
                    y={center.y}
                    textAnchor="middle"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: '#FFFFFF',
                      fillOpacity: isZero ? 0.75 : 1,
                      fontFamily: 'Inter, sans-serif',
                      paintOrder: 'stroke',
                      stroke: 'rgba(40,12,4,0.55)',
                      strokeWidth: 3,
                    }}
                  >
                    {region.label}
                  </text>
                  <text
                    x={center.x}
                    y={center.y + 18}
                    textAnchor="middle"
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      fill: '#FFFFFF',
                      fillOpacity: isZero ? 0.55 : 1,
                      fontFamily: 'monospace',
                      paintOrder: 'stroke',
                      stroke: 'rgba(40,12,4,0.55)',
                      strokeWidth: 3,
                    }}
                  >
                    {count}
                  </text>
                </g>
              );
            })}
          </svg>

          {hovered && (
            <div className="absolute top-3 right-3 z-20 bg-tbs-ink dark:bg-tbs-bg-2 border border-tbs-line dark:border-tbs-line text-white rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none">
              <div className="font-semibold">{REGION_LABELS[hovered].label}</div>
              <div className="font-mono text-base text-tbs-orange-light">
                {formatNumber(byKey[hovered] ?? 0)} contatos
              </div>
              <div className="text-[10px] text-tbs-mute mt-0.5">
                {total > 0 ? (((byKey[hovered] ?? 0) / total) * 100).toFixed(1) : 0}% do total
              </div>
            </div>
          )}
        </div>

        {/* Lista lateral */}
        <div className="lg:col-span-2">
          <ul className="divide-y divide-tbs-line-light dark:divide-tbs-line">
            {(Object.keys(REGION_LABELS) as RegionKey[])
              .map((key) => ({ key, region: REGION_LABELS[key], count: byKey[key] ?? 0 }))
              .sort((a, b) => b.count - a.count)
              .map(({ key, region, count }) => {
                const pct = total > 0 ? count / total : 0;
                const isZero = count === 0;
                return (
                  <li key={key}>
                    <button
                      onClick={() => open({ type: 'regiao', value: region.hubspotValue, edition: '2026' })}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      className="w-full flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3/60 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-3 h-3 rounded shrink-0" style={{ background: fillFor(key) }} />
                        <span className={`text-sm truncate ${isZero ? 'text-tbs-mute-light dark:text-tbs-mute' : ''}`}>
                          {region.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`kpi-value text-sm ${isZero ? 'text-tbs-mute-light dark:text-tbs-mute font-normal' : ''}`}>
                          {formatNumber(count)}
                        </span>
                        <span className="text-xs text-tbs-mute-light dark:text-tbs-mute font-mono w-12 text-right">
                          {isZero ? '0%' : `${(pct * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
            Mapa com os 27 estados do Brasil agrupados por região · cor mais intensa = mais inscritos · cinza = região
            sem nenhum inscrito ainda.
          </div>
        </div>
      </div>
    </section>
  );
}
