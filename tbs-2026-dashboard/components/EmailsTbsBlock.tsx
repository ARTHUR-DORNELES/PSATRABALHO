'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { isInscriptionOpen } from '@/lib/dates';
import { AwaitingState } from './AwaitingState';

const COLOR_SEQ = ['#D14A0F', '#F08220', '#FFA52A', '#FFD580', '#FFE1BF'];

export function EmailsTbsBlock({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();

  if (!isOpen) {
    return (
      <section className="card">
        <div className="flex items-end justify-between mb-1">
          <h2 className="display uppercase text-lg">E-mails TBS · régua de disparos</h2>
          <span className="text-xs text-tbs-mute">em qual disparo cada contato está</span>
        </div>
        <div className="divider-gradient w-16 mb-4" />
        <AwaitingState
          title="Régua aguardando início"
          hint="Os disparos da régua (E-mail #0 → #5.1) começam quando o lead se inscreve. Distribuição vai aparecer pós 01/06."
        />
      </section>
    );
  }

  const e = data.emailsTbs;
  const max = Math.max(...e.distribuicao.map((d) => d.value));

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">E-mails TBS · régua de disparos</h2>
        <span className="text-xs text-tbs-mute">{e.label}</span>
      </div>
      <div className="divider-gradient w-16 mb-4" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <ol className="space-y-2">
            {e.distribuicao.map((step, i) => (
              <li key={step.rawValue}>
                <button
                  onClick={() => open({ type: 'disparo', value: step.rawValue, edition: '2025' })}
                  className="w-full text-left hover:bg-tbs-orange-50/40 px-2 py-1.5 -mx-2 rounded transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs w-12 shrink-0" style={{ color: COLOR_SEQ[i % COLOR_SEQ.length] }}>
                      {step.rawValue.replace('E-mail ', '')}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{step.label}</span>
                      <span className="block h-2 bg-tbs-orange-50 rounded-sm overflow-hidden mt-1">
                        <span className="block h-full" style={{ width: `${(step.value / max) * 100}%`, background: COLOR_SEQ[i % COLOR_SEQ.length] }} />
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-mono font-semibold">{formatNumber(step.value)}</span>
                      <span className="block text-[10px] text-tbs-mute">{formatPct(step.pct, 1)}</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-tbs-orange-50 border border-tbs-orange-100 rounded-lg">
            <div className="text-xs text-tbs-orange-deep uppercase tracking-wider font-medium">Cobertura da régua</div>
            <div className="display text-3xl text-tbs-orange-deep mt-1">{formatPct(e.respondedPct, 0)}</div>
            <div className="text-xs text-tbs-mute mt-1">
              {formatNumber(e.respondedAbsolute)} contatos da base TBS 2025 receberam pelo menos um disparo
            </div>
          </div>

          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <div className="text-xs text-red-700 uppercase tracking-wider font-medium">Drop na régua</div>
            <div className="display text-2xl text-red-700 mt-1">
              {(() => {
                const m2 = e.distribuicao.find((d) => d.rawValue === 'E-mail #2')?.value ?? 0;
                const m1 = e.distribuicao.find((d) => d.rawValue === 'E-mail #1')?.value ?? 1;
                return `-${(100 - (m2 / m1) * 100).toFixed(0)}%`;
              })()}
            </div>
            <div className="text-xs text-tbs-mute mt-1">
              entre E-mail #1 (lembrete) e E-mail #2 (envio de vídeo). Maior gargalo da régua.
            </div>
          </div>

          <p className="text-[11px] text-tbs-mute">{e.note}</p>
        </div>
      </div>
    </section>
  );
}
