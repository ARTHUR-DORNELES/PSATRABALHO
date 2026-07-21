'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber, formatPct } from '@/lib/snapshot';
import { useDrill } from './DrillProvider';
import { isInscriptionOpen } from '@/lib/dates';
import { AwaitingState } from './AwaitingState';

export function PartnerTable({ data }: { data: Snapshot }) {
  const { open } = useDrill();
  const isOpen = isInscriptionOpen();

  if (!isOpen) {
    return (
      <section className="card">
        <div className="flex items-end justify-between mb-1">
          <h2 className="display uppercase text-lg">Parceiros — ranking</h2>
          <span className="text-xs text-tbs-mute">inscritos trazidos por parceiro</span>
        </div>
        <div className="divider-gradient w-16 mb-4" />
        <AwaitingState
          title="Ranking aguardando inscrições"
          hint="Quando 01/06 chegar, os parceiros oficiais começam a trazer inscritos e este ranking fica vivo. ⚠️ Lembre de converter `nome_do_parceiro` em dropdown antes de 01/06 (vide gaps de tagueamento)."
        />
      </section>
    );
  }

  const ranking = data.parceiros.ranking;
  const total = ranking.reduce((s, p) => s + p.count, 0);
  return (
    <section className="card">
      <div className="flex items-end justify-between mb-1">
        <h2 className="display uppercase text-lg">Parceiros — ranking</h2>
        <span className="text-xs text-tbs-mute">{data.parceiros.label}</span>
      </div>
      <div className="divider-gradient w-16 mb-4" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-tbs-mute border-b border-tbs-line">
            <th className="py-2 font-medium">#</th>
            <th className="py-2 font-medium">Parceiro</th>
            <th className="py-2 font-medium text-right">Inscritos</th>
            <th className="py-2 font-medium text-right">% do total</th>
            <th className="py-2 font-medium">Aliases (clique pra ver no HubSpot)</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((p, i) => (
            <tr key={p.partner} className="border-b border-tbs-line/50 last:border-0">
              <td className="py-2 text-tbs-mute font-mono text-xs">{i + 1}</td>
              <td className="py-2 font-semibold">{p.partner}</td>
              <td className="py-2 text-right font-mono">{formatNumber(p.count)}</td>
              <td className="py-2 text-right text-tbs-mute">{formatPct(p.count / total, 1)}</td>
              <td className="py-2 text-xs">
                <div className="flex flex-wrap gap-1">
                  {p.aliases.map((a) => (
                    <button
                      key={a}
                      onClick={() => open({ type: 'partner', value: a })}
                      className="tbs-pill bg-tbs-orange-50 text-tbs-orange-deep hover:bg-tbs-orange-100 text-[10px] cursor-pointer transition"
                      title={`Ver contatos com nome_do_parceiro = "${a}"`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-tbs-orange-50 rounded-lg">
          <div className="text-tbs-orange-deep font-semibold">{data.parceiros.validosAposNormalizacao}</div>
          <div className="text-tbs-mute">contatos válidos após normalização</div>
        </div>
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
          <div className="text-red-700 font-semibold">{data.parceiros.trash.length}</div>
          <div className="text-tbs-mute">
            lixo descartado: {data.parceiros.trash.map((t) => `"${t.label}"`).join(', ')}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-tbs-mute mt-3">{data.parceiros.note}</p>
    </section>
  );
}
