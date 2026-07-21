import Link from 'next/link';
import { fetchListAnalysis, type RecoveryPath, type ListAnalysis } from '@/lib/list-analysis';

export const dynamic = 'force-dynamic';

const fmt = new Intl.NumberFormat('pt-BR');
const pct = (n: number, base: number) => (base > 0 ? `${((n / base) * 100).toFixed(1)}%` : '0%');

const PATH_LABEL: Record<RecoveryPath, { label: string; tone: string; how: string }> = {
  utm_in_url: {
    label: 'UTM no URL · 1-clique',
    tone: 'bg-psa-good-soft text-psa-good',
    how: 'Já tem utm_source/medium/campaign nos parâmetros do hs_analytics_first_url. É só extrair e setar nas propriedades do contato via workflow ou import CSV.',
  },
  lp_known: {
    label: 'LP conhecida · regra por landing',
    tone: 'bg-psa-accent-soft text-psa-accent',
    how: 'Você tem a URL da primeira visita mas a UTM não estava lá. Crie um workflow: "se hs_analytics_first_url contém X então set utm_source = Y, utm_medium = Z, utm_campaign = W".',
  },
  form_known: {
    label: 'Formulário conhecido',
    tone: 'bg-psa-warn-soft text-psa-warn',
    how: 'Você só sabe qual formulário foi preenchido. Crie um workflow por form (filtro: first_conversion_event_name EQ "X") e atribua UTM padronizada pra cada um.',
  },
  analytics_source_only: {
    label: 'Só source agrupado',
    tone: 'bg-psa-warn-soft text-psa-warn',
    how: 'Só sobrou o hs_analytics_source (Direct/Organic/Paid/etc). Atribuir UTM genérica por bucket: ORGANIC → utm_medium=social, PAID_SOCIAL → utm_medium=paid_social, etc.',
  },
  unrecoverable: {
    label: 'Não recuperável',
    tone: 'bg-psa-bad-soft text-psa-bad',
    how: 'OFFLINE ou cadastro manual via CRM_UI. Não dá pra inferir origem retroativa — taggear como utm_source=offline pra pelo menos sinalizar.',
  },
};

export default async function ListPage({ params }: { params: { listId: string } }) {
  let a: ListAnalysis;
  try {
    a = await fetchListAnalysis(params.listId);
  } catch (err) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card border-psa-bad/30 max-w-xl">
          <h1 className="text-lg font-semibold text-psa-bad">Falha ao buscar a lista</h1>
          <p className="text-sm mono mt-2">{String(err)}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-psa-line/80">
        <div className="max-w-[1320px] mx-auto px-6 py-4 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <Link href={`/`} className="text-[11px] uppercase tracking-[0.2em] text-psa-mute hover:text-psa-ink">
              ← Voltar pro dashboard
            </Link>
            <h1 className="text-[24px] font-semibold tracking-tight text-psa-ink mt-2">
              Análise + backfill · lista HubSpot <span className="mono text-psa-accent">#{a.listId}</span>
            </h1>
            <p className="text-sm text-psa-mute mt-1 max-w-3xl">
              <strong className="text-psa-bad">{fmt.format(a.totalInList)}</strong> contatos sem UTM mas com alguma atribuição preenchida. Análise feita em amostra de {fmt.format(a.sampleSize)}. Cada linha sugere a UTM e o caminho de fix.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={a.hubspotListUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-bg text-psa-ink">
              ↗ Abrir lista no HubSpot
            </a>
            <a href={`/api/list/${a.listId}/csv`} className="text-xs font-medium px-3 py-1.5 rounded-full bg-psa-ink text-white hover:bg-psa-accent">
              ↓ Baixar CSV com UTMs sugeridas
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-6 py-6 space-y-8">
        {/* Recovery distribution */}
        <section className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-psa-mute font-semibold mb-3">Quantos desses dá pra recuperar</div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <RecoveryCard label="UTM já no URL" count={a.recovery.utmInUrl} total={a.sampleSize} tone="good" />
            <RecoveryCard label="LP conhecida"  count={a.recovery.lpKnown} total={a.sampleSize} tone="accent" />
            <RecoveryCard label="Form conhecido" count={a.recovery.formKnown} total={a.sampleSize} tone="warn" />
            <RecoveryCard label="Só HubSpot source" count={a.recovery.analyticsOnly} total={a.sampleSize} tone="warn" />
            <RecoveryCard label="Não recuperável" count={a.recovery.unrecoverable} total={a.sampleSize} tone="bad" />
          </div>
          <p className="text-[12px] text-psa-mute mt-4">
            Os 3 primeiros são fáceis de backfill (workflow ou import CSV). Os 2 últimos só têm sinal grosseiro — atribua UTM genérica pra sinalizar a falta de dado em vez de deixar em branco.
          </p>
        </section>

        {/* Top LPs */}
        <section className="card">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-psa-ink">Top landing pages na lista — onde mais erra</h2>
            <span className="text-[10px] text-psa-mute">ranqueado por volume de contatos sem UTM</span>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
                  <th className="py-2 px-2 font-medium">Landing</th>
                  <th className="py-2 px-2 font-medium text-right">Contatos</th>
                  <th className="py-2 px-2 font-medium">Caminho de fix</th>
                  <th className="py-2 px-2 font-medium">UTM sugerida</th>
                  <th className="py-2 px-2 font-medium">Formulário top</th>
                </tr>
              </thead>
              <tbody>
                {a.landings.map((l, i) => {
                  const path = PATH_LABEL[l.recoveryPath];
                  return (
                    <tr key={i} className="border-b border-psa-line/60 hover:bg-psa-bg/60 align-top">
                      <td className="py-2.5 px-2 max-w-[280px]">
                        {l.landingHref ? (
                          <a href={l.landingHref} target="_blank" rel="noopener noreferrer" className="mono text-[12px] text-psa-accent hover:underline" title={l.landingHref}>{l.landing}</a>
                        ) : (
                          <span className="mono text-[12px] text-psa-ink">{l.landing}</span>
                        )}
                        {l.hasUtmInUrlCount > 0 && (
                          <div className="text-[10px] text-psa-good mt-0.5">{l.hasUtmInUrlCount} têm UTM nos params do URL ← extrair fácil</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right mono tabular-nums font-semibold">{fmt.format(l.count)}</td>
                      <td className="py-2.5 px-2"><span className={`pill ${path.tone}`}>{path.label}</span></td>
                      <td className="py-2.5 px-2">
                        {l.extractedUtm ? (
                          <span className="mono text-[11px] bg-psa-good-soft text-psa-good px-2 py-0.5 rounded">
                            {l.extractedUtm.utm_source}/{l.extractedUtm.utm_medium}/{l.extractedUtm.utm_campaign}
                          </span>
                        ) : l.suggested ? (
                          <span className="mono text-[11px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded">
                            {l.suggested.utm_source}/{l.suggested.utm_medium}
                          </span>
                        ) : (
                          <span className="text-[11px] text-psa-mute italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[12px] text-psa-smoke max-w-[260px] truncate" title={l.topConversion}>{l.topConversion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top conversions */}
        <section className="card">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-psa-ink">Top formulários / pontos de conversão</h2>
            <span className="text-[10px] text-psa-mute">campo first_conversion_event_name · sinaliza qual form precisa de UTM no link</span>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
                  <th className="py-2 px-2 font-medium">Formulário</th>
                  <th className="py-2 px-2 font-medium text-right">Contatos</th>
                  <th className="py-2 px-2 font-medium">Landings que disparam</th>
                  <th className="py-2 px-2 font-medium">UTM sugerida</th>
                </tr>
              </thead>
              <tbody>
                {a.conversions.map((c, i) => (
                  <tr key={i} className="border-b border-psa-line/60 hover:bg-psa-bg/60 align-top">
                    <td className="py-2.5 px-2 text-[12px] text-psa-ink max-w-[320px]">{c.name}</td>
                    <td className="py-2.5 px-2 text-right mono tabular-nums font-semibold">{fmt.format(c.count)}</td>
                    <td className="py-2.5 px-2 text-[11px] text-psa-mute">
                      {c.topLandings.slice(0, 2).map((l) => (
                        <div key={l.landing} className="mono truncate max-w-[300px]" title={l.landing}>{l.landing} <span className="text-psa-mute/60">({l.count})</span></div>
                      ))}
                    </td>
                    <td className="py-2.5 px-2">
                      {c.suggested ? (
                        <span className="mono text-[11px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded whitespace-nowrap">
                          {c.suggested.utm_source}/{c.suggested.utm_medium}
                        </span>
                      ) : (
                        <span className="text-[11px] text-psa-mute italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top referrers */}
        <section className="card">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-psa-ink">Top referrers</h2>
            <span className="text-[10px] text-psa-mute">de onde os contatos da lista vieram</span>
          </div>
          <ul className="space-y-1.5">
            {a.referrers.map((r) => (
              <li key={r.referrer} className="flex items-center justify-between gap-2">
                <span className="mono text-[12px] text-psa-ink">{r.referrer}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {r.suggested && (
                    <span className="mono text-[10px] bg-psa-accent-soft text-psa-accent px-1.5 py-0.5 rounded">{r.suggested.utm_source}/{r.suggested.utm_medium}</span>
                  )}
                  <span className="mono text-xs text-psa-mute tabular-nums">{fmt.format(r.count)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Backfill instructions */}
        <section className="card border-psa-accent/30 bg-psa-accent-soft/30">
          <h2 className="text-base font-semibold text-psa-ink mb-3">▶ Como aplicar o backfill</h2>
          <div className="space-y-4 text-[13px] text-psa-ink leading-relaxed">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-1">Opção 1 · Import CSV (recomendado pra one-shot)</div>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Clique em <strong>↓ Baixar CSV com UTMs sugeridas</strong> no topo desta página.</li>
                <li>O CSV traz: <span className="mono text-[11px]">Record ID, suggested_utm_source, suggested_utm_medium, suggested_utm_campaign, recovery_path</span>.</li>
                <li>No HubSpot: <strong>Settings → Import & Export → Import → File from computer → One object → Contact → An update</strong>.</li>
                <li>Mapeie <span className="mono text-[11px]">suggested_utm_*</span> → <span className="mono text-[11px]">utm_*</span>. <strong>Record ID</strong> é a chave de match.</li>
                <li>Revise os primeiros 100 antes de aplicar nos 61k. Se algo estiver estranho, ajusta as regras em <code>lib/list-analysis.ts</code> e gera CSV de novo.</li>
              </ol>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-1">Opção 2 · Workflow no HubSpot (recomendado pra fluxo contínuo)</div>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Cria workflow Contact-based com trigger "Contact is member of List #{a.listId}".</li>
                <li>Branching por <span className="mono text-[11px]">hs_analytics_first_url contains "X"</span> → Set property <span className="mono text-[11px]">utm_source = Y</span>, etc.</li>
                <li>Use a tabela <strong>Top landing pages</strong> acima como mapa: cada linha vira um branch do workflow.</li>
                <li>Vantagem: novos contatos que caírem na lista também são corrigidos automaticamente.</li>
              </ol>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-1">Opção 3 · Parar a sangria (a longo prazo é o que mais importa)</div>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Para cada landing no top, atualize o link <strong>de origem</strong> (anúncio, bio, parceiro) pra já vir com UTM.</li>
                <li>Para forms que disparam em landings sem UTM, configure o formulário a usar campos ocultos que capturam a UTM do URL.</li>
              </ol>
            </div>
          </div>
        </section>

        <footer className="text-[11px] text-psa-mute text-center pt-2 pb-6">
          Análise feita em amostra de {fmt.format(a.sampleSize)} contatos · total na lista: {fmt.format(a.totalInList)} · HubSpot tem limite de 10.000 resultados por busca, então para listas maiores a amostra é representativa do topo recente.
        </footer>
      </main>
    </div>
  );
}

function RecoveryCard({ label, count, total, tone }: { label: string; count: number; total: number; tone: 'good' | 'accent' | 'warn' | 'bad' }) {
  const colors = {
    good:   'border-psa-good/30 bg-psa-good-soft/40 text-psa-good',
    accent: 'border-psa-accent/30 bg-psa-accent-soft/40 text-psa-accent',
    warn:   'border-psa-warn/30 bg-psa-warn-soft/40 text-psa-warn',
    bad:    'border-psa-bad/30 bg-psa-bad-soft/40 text-psa-bad',
  }[tone];
  return (
    <div className={`rounded-xl border ${colors} p-4`}>
      <div className="text-[10px] uppercase tracking-[0.16em] opacity-80 font-medium">{label}</div>
      <div className="text-3xl font-semibold mt-1.5">{fmt.format(count)}</div>
      <div className="text-[11px] opacity-70 mt-1">{pct(count, total)} da amostra</div>
    </div>
  );
}
