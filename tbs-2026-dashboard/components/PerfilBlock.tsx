'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { isInscriptionOpen } from '@/lib/dates';
import { AwaitingState } from './AwaitingState';

const ORANGE = '#F08220';
const DEEP = '#D14A0F';

export function PerfilBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();

  if (!isOpen) {
    return (
      <section className="card">
        <div className="flex items-end justify-between mb-1">
          <h2 className="display uppercase text-lg">Perfil dos inscritos</h2>
          <span className="text-xs text-tbs-mute">idade · gênero · estado · área de atuação</span>
        </div>
        <div className="divider-gradient w-16 mb-4" />
        <AwaitingState
          title="Perfil aguardando inscrições"
          hint="Os dados de idade, gênero, UF e área de atuação só são preenchidos quando o inscrito completa o form oficial. Começa a popular pós 01/06."
        />
      </section>
    );
  }

  const { idade, estados, generoNorm, areaAtuacao } = data.perfil;

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">Perfil dos inscritos</h2>
        <span className="text-xs text-tbs-mute">{data.perfil.label} · clique pra ver no HubSpot</span>
      </div>
      <div className="divider-gradient w-16 mb-4" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Idade */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-semibold text-sm">Faixa etária</h3>
            <span className="text-[11px] text-tbs-mute">{formatNumber(idade.respondedAbsolute)} responderam ({formatPct(idade.respondedPct, 0)})</span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {idade.buckets.map((b) => (
              <li key={b.label}>
                <button
                  onClick={() => open({ type: 'idade', value: b.label, edition: '2025' })}
                  className="w-full text-left hover:bg-tbs-orange-50/40 px-2 py-1 -mx-2 rounded transition cursor-pointer"
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{b.label} anos</span>
                    <span className="text-tbs-mute">{formatNumber(b.value)} · {formatPct(b.pct, 0)}</span>
                  </div>
                  <div className="h-2 bg-tbs-orange-50 rounded-sm overflow-hidden">
                    <div className="h-full" style={{ width: `${b.pct * 100}%`, background: ORANGE }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-tbs-mute mt-2">{idade.note}</p>
        </div>

        {/* Gênero */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-semibold text-sm">Gênero</h3>
            <span className="text-[11px] text-tbs-mute">{formatNumber(generoNorm.respondedAbsolute)} responderam ({formatPct(generoNorm.respondedPct, 0)})</span>
          </div>
          <div className="flex gap-2 text-xs">
            {generoNorm.distribuicao.map((g, i) => (
              <button
                key={g.label}
                onClick={() => open({ type: 'genero', value: g.label, edition: '2025' })}
                className="flex-1 p-3 rounded-lg border border-tbs-line hover:border-tbs-orange hover:bg-tbs-orange-50/40 transition text-left cursor-pointer"
              >
                <div className="display text-2xl" style={{ color: i === 0 ? DEEP : ORANGE }}>{formatPct(g.pct, 0)}</div>
                <div className="font-medium text-tbs-ink mt-1">{g.label}</div>
                <div className="text-tbs-mute text-[11px]">{formatNumber(g.value)} contatos</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-tbs-mute mt-2 p-2 bg-amber-50 border border-amber-100 rounded">
            ⚠️ Grafias raw na sample: {generoNorm.rawDistinctValues.join(', ')}. {generoNorm.note}
          </p>
        </div>

        {/* Estados */}
        <div className="lg:col-span-1">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-semibold text-sm">Estados (UF) · top 14</h3>
            <span className="text-[11px] text-tbs-mute">{formatNumber(estados.respondedAbsolute)} responderam ({formatPct(estados.respondedPct, 0)})</span>
          </div>
          <ul className="space-y-1 text-xs">
            {estados.top.map((e) => (
              <li key={e.uf}>
                <button
                  onClick={() => open({ type: 'estado', value: e.uf, edition: '2025' })}
                  className="w-full flex items-center gap-3 hover:bg-tbs-orange-50/40 px-2 py-1 -mx-2 rounded transition cursor-pointer"
                >
                  <span className="w-8 font-mono font-semibold text-tbs-orange-deep">{e.uf}</span>
                  <span className="flex-1 h-3 bg-tbs-orange-50 rounded-sm overflow-hidden">
                    <span className="block h-full" style={{ width: `${e.pct * 100}%`, background: ORANGE }} />
                  </span>
                  <span className="w-20 text-right text-tbs-mute">
                    {formatNumber(e.value)} ({formatPct(e.pct, 1)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-tbs-mute mt-2">{estados.note}</p>
        </div>

        {/* Área de atuação */}
        <div className="lg:col-span-1">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-semibold text-sm">Área de atuação · top 15</h3>
            <span className="text-[11px] text-tbs-mute">{formatNumber(areaAtuacao.respondedAbsolute)} responderam ({formatPct(areaAtuacao.respondedPct, 0)})</span>
          </div>
          <ul className="space-y-1 text-xs">
            {areaAtuacao.top.map((a) => (
              <li key={a.label}>
                <button
                  onClick={() => open({ type: 'area', value: a.label, edition: '2025' })}
                  className="w-full flex items-center gap-3 hover:bg-tbs-orange-50/40 px-2 py-1 -mx-2 rounded transition cursor-pointer"
                >
                  <span className="flex-1 truncate text-left">{a.label.replace(/_/g, ' ')}</span>
                  <span className="w-16 h-2 bg-tbs-orange-50 rounded-sm overflow-hidden inline-block">
                    <span className="block h-full" style={{ width: `${a.pct * 100}%`, background: ORANGE }} />
                  </span>
                  <span className="w-24 text-right text-tbs-mute">
                    {formatNumber(a.value)} ({formatPct(a.pct, 1)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-tbs-mute mt-2 p-2 bg-amber-50 border border-amber-100 rounded">⚠️ {areaAtuacao.note}</p>
        </div>
      </div>
    </section>
  );
}
