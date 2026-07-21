import Link from 'next/link';
import { fetchSegmentDetail, OBJECT_LABELS, OBJECT_TYPES, PERIOD_LABELS, type ObjectType, type Period } from '@/lib/data';

export const dynamic = 'force-dynamic';

const VALID_PERIODS: Period[] = ['7d', '30d', '90d', '180d', '365d', 'all'];

export default async function SegmentPage({
  params,
  searchParams,
}: {
  params: { dim: string; value: string };
  searchParams: { period?: string; page?: string; obj?: string };
}) {
  const raw = (searchParams?.period ?? '90d') as Period;
  const period: Period = VALID_PERIODS.includes(raw) ? raw : '90d';
  const rawO = (searchParams?.obj ?? 'contacts') as ObjectType;
  const objectType: ObjectType = (OBJECT_TYPES as string[]).includes(rawO) ? rawO : 'contacts';
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const value = decodeURIComponent(params.value);

  let detail;
  try {
    detail = await fetchSegmentDetail({ period, dim: params.dim, value, page, objectType });
  } catch (err) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card border-psa-bad/30 max-w-xl">
          <h1 className="text-lg font-semibold text-psa-bad">Falha ao buscar o segmento</h1>
          <p className="text-sm mono mt-2">{String(err)}</p>
        </div>
      </main>
    );
  }

  const fmt = new Intl.NumberFormat('pt-BR');
  const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return s; } };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-psa-line/80">
        <div className="max-w-[1320px] mx-auto px-6 py-4 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <Link href={`/?period=${period}&obj=${objectType}`} className="text-[11px] uppercase tracking-[0.2em] text-psa-mute hover:text-psa-ink">
              ← Voltar pro dashboard
            </Link>
            <h1 className="text-[24px] font-semibold tracking-tight text-psa-ink mt-2">
              {OBJECT_LABELS[objectType]} {detail.tagged ? 'com UTM' : 'sem UTM'} · {humanDim(params.dim)} = <span className="mono">{value}</span>
            </h1>
            <p className="text-sm text-psa-mute mt-1">
              Janela: <span className="mono text-psa-ink">{PERIOD_LABELS[period]}</span> · <strong className={detail.tagged ? 'text-psa-accent' : 'text-psa-bad'}>{fmt.format(detail.total)}</strong> {objectType === 'deals' ? 'negócios' : 'leads'} neste segmento no HubSpot.
              Listando os mais recentes — clique no nome pra abrir no CRM.
            </p>
          </div>
          <Link href={`/?period=${period}&obj=${objectType}`} className="text-xs px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-bg">
            ↺ Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-6 py-6">
        <div className="card overflow-x-auto -mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
                <th className="py-2 px-2 font-medium">Quando</th>
                <th className="py-2 px-2 font-medium">Contato</th>
                <th className="py-2 px-2 font-medium">{objectType === 'deals' ? 'Valor' : 'Email'}</th>
                <th className="py-2 px-2 font-medium">{objectType === 'deals' ? 'Dealstage' : 'Lifecycle'}</th>
                <th className="py-2 px-2 font-medium">Produto</th>
                {detail.tagged ? (
                  <>
                    <th className="py-2 px-2 font-medium">utm_source</th>
                    <th className="py-2 px-2 font-medium">utm_medium</th>
                    <th className="py-2 px-2 font-medium">utm_campaign</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 px-2 font-medium">Landing</th>
                    <th className="py-2 px-2 font-medium">Referrer</th>
                    <th className="py-2 px-2 font-medium">UTM sugerida</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {detail.contacts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-psa-mute italic">
                    Nenhum contato nesta página da amostra.
                  </td>
                </tr>
              )}
              {detail.contacts.map((c) => (
                <tr key={c.id} className="border-b border-psa-line/60 hover:bg-psa-bg/60 align-top">
                  <td className="py-2.5 px-2 mono text-[11px] text-psa-mute whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                  <td className="py-2.5 px-2">
                    <a href={c.hubspotUrl} target="_blank" rel="noopener noreferrer" className="text-psa-accent hover:underline text-[13px] font-medium">
                      {c.name}
                    </a>
                    <div className="mono text-[10px] text-psa-mute">#{c.id.slice(-6)} ↗</div>
                  </td>
                  <td className="py-2.5 px-2 text-[12px] text-psa-smoke truncate max-w-[200px]">{c.email}</td>
                  <td className="py-2.5 px-2 text-[12px] text-psa-mute">{c.lifecycle}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex flex-wrap gap-1">
                      {c.productHints.length === 0
                        ? <span className="text-[11px] text-psa-mute italic">—</span>
                        : c.productHints.map((h) => (
                            <span key={h} className="mono text-[10px] bg-psa-accent-soft text-psa-accent px-1.5 py-0.5 rounded">{h}</span>
                          ))
                      }
                    </div>
                  </td>
                  {detail.tagged ? (
                    <>
                      <td className="py-2.5 px-2 mono text-[11px] text-psa-ink">{c.utm_source || '—'}</td>
                      <td className="py-2.5 px-2 mono text-[11px] text-psa-ink">{c.utm_medium || '—'}</td>
                      <td className="py-2.5 px-2 mono text-[11px] text-psa-ink truncate max-w-[160px]" title={c.utm_campaign}>{c.utm_campaign || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-2 max-w-[180px] truncate">
                        {c.landingHref ? (
                          <a href={c.landingHref} target="_blank" rel="noopener noreferrer" className="mono text-[11px] text-psa-accent hover:underline" title={c.landingHref}>
                            {c.landing}
                          </a>
                        ) : (
                          <span className="mono text-[11px] text-psa-mute">{c.landing}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 mono text-[11px] text-psa-mute">{c.referrer}</td>
                      <td className="py-2.5 px-2">
                        {c.suggested ? (
                          <span className="mono text-[11px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded whitespace-nowrap">
                            {c.suggested.utm_source}/{c.suggested.utm_medium}
                          </span>
                        ) : (
                          <span className="text-[11px] text-psa-mute italic">—</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-psa-line">
            <p className="text-[12px] text-psa-mute">
              Mostrando {detail.contacts.length} de até {detail.sampleSize} (amostra recente) · {fmt.format(detail.total)} no total
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/segment/${params.dim}/${params.value}?period=${period}&obj=${objectType}&page=${page - 1}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-bg"
                >
                  ← Página anterior
                </Link>
              )}
              {detail.contacts.length === 50 && (
                <Link
                  href={`/segment/${params.dim}/${params.value}?period=${period}&obj=${objectType}&page=${page + 1}`}
                  className="text-xs px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-bg"
                >
                  Próxima página →
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-psa-mute text-center mt-6">
          A amostra é limitada às páginas mais recentes da busca do HubSpot.
          Para taggear todos os leads do segmento de uma vez, considere criar uma lista no HubSpot com o mesmo filtro.
        </p>
      </main>
    </div>
  );
}

function humanDim(dim: string): string {
  return {
    source:        'Categoria de origem (HubSpot)',
    lifecycle:     'Lifecycle / Dealstage',
    pipeline:      'Pipeline',
    product:       'Produto',
    origem:        'Origem',
    utm_source:    'utm_source',
    utm_medium:    'utm_medium',
    utm_campaign:  'utm_campaign',
    utm:           'UTM (filtro especial)',
  }[dim] ?? dim;
}
