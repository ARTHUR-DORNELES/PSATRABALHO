'use client';
import { useEffect, useState } from 'react';
import type { DrillContact, DrillResult, DrillQuery, UtmBreakdownDim } from '@/lib/drill';
import { useDrill } from './DrillProvider';

type State =
  | { kind: 'closed' }
  | { kind: 'loading'; query: DrillQuery }
  | { kind: 'ready'; query: DrillQuery; result: DrillResult }
  | { kind: 'error'; query: DrillQuery; message: string };

export function DrillDrawer({ state, onClose }: { state: State; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const isOpen = state.kind !== 'closed';
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 transition-opacity z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-full sm:w-[640px] bg-white dark:bg-tbs-bg-2 border-l border-tbs-line-light dark:border-tbs-line shadow-2xl z-50 transition-transform duration-200 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <DrawerHeader state={state} onClose={onClose} />
        <div className="flex-1 overflow-y-auto">
          <DrawerBody state={state} />
        </div>
      </aside>
    </>
  );
}

// Exportar CSV só faz sentido pro drill de NEGÓCIOS do The Best School (tem contato pra juntar dado de
// comprador) — os outros tipos de drill já são baseados em contato e não têm essa necessidade hoje.
function exportUrl(query: DrillQuery): string {
  const params = new URLSearchParams();
  if (query.value) params.set('value', query.value);
  if (query.month) params.set('month', query.month);
  if (query.produto) params.set('produto', query.produto);
  return `/api/export/tbschool-compradores?${params.toString()}`;
}

function DrawerHeader({ state, onClose }: { state: State; onClose: () => void }) {
  const title =
    state.kind === 'ready' ? state.result.title :
    state.kind === 'loading' ? 'Carregando…' :
    state.kind === 'error' ? 'Erro ao carregar' : '';
  const subtitle = state.kind === 'ready' ? state.result.subtitle : undefined;
  const canExport = state.kind === 'ready' && state.query.type === 'tbschool_deal';

  return (
    <div className="border-b border-tbs-line-light dark:border-tbs-line">
      <div className="h-[2px] bg-gradient-to-r from-tbs-orange-deep via-tbs-orange to-tbs-orange-light" />
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="card-title text-base">{title}</h2>
          {subtitle && <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute font-mono mt-1 break-all">{subtitle}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canExport && (
            <a
              href={exportUrl(state.query)}
              download
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold border border-tbs-orange-100 dark:border-tbs-orange/30 text-tbs-orange-deep dark:text-tbs-orange-light hover:bg-tbs-orange-50 dark:hover:bg-tbs-orange/10 transition"
              title="Baixa todos os compradores (não só a amostra) com e-mail, telefone, região, fonte e UTMs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Exportar CSV
            </a>
          )}
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full border border-tbs-line-light dark:border-tbs-line text-tbs-mute-light dark:text-tbs-mute hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3 hover:border-tbs-orange hover:text-tbs-orange-deep dark:hover:text-white transition"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawerBody({ state }: { state: State }) {
  if (state.kind === 'closed') return null;
  if (state.kind === 'loading') {
    return (
      <div className="p-6 space-y-3">
        <div className="h-24 rounded-xl bg-tbs-line-light dark:bg-tbs-bg-3/60 animate-pulse" />
        <div className="h-12 rounded-lg bg-tbs-line-light dark:bg-tbs-bg-3/60 animate-pulse" />
        <div className="h-12 rounded-lg bg-tbs-line-light dark:bg-tbs-bg-3/60 animate-pulse" />
        <div className="h-12 rounded-lg bg-tbs-line-light dark:bg-tbs-bg-3/60 animate-pulse" />
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          <div className="font-semibold mb-1">Falha ao carregar drill</div>
          <div className="text-xs">{state.message}</div>
        </div>
      </div>
    );
  }
  const { result } = state;
  return (
    <div className="p-5 space-y-4">
      <div className="rounded-xl p-5 bg-gradient-to-br from-tbs-orange-deep to-tbs-orange text-white shadow-lg">
        <div className="text-[11px] uppercase tracking-wider opacity-90">Total no HubSpot</div>
        <div className="display text-5xl mt-1">{result.total.toLocaleString('pt-BR')}</div>
        <div className="text-xs opacity-90 mt-2">
          mostrando os {result.sampleSize} mais recentes (sample top {Math.min(result.sampleSize, 50)})
        </div>
      </div>
      {result.utmBreakdown && result.utmBreakdown.length > 0 && (
        <UtmBreakdown dims={result.utmBreakdown} sampleSize={result.sampleSize} total={result.total} />
      )}
      {result.sample.length === 0 ? (
        <div className="p-4 rounded-lg bg-tbs-line-light dark:bg-tbs-bg-3/60 text-sm text-tbs-mute-light dark:text-tbs-mute border border-tbs-line-light dark:border-tbs-line">
          Nenhum contato no sample. Pode ter sido filtro inválido ou base vazia.
        </div>
      ) : (
        <ContactList contacts={result.sample} />
      )}
    </div>
  );
}

function UtmBreakdown({ dims, sampleSize, total }: { dims: UtmBreakdownDim[]; sampleSize: number; total: number }) {
  const { open } = useDrill();
  return (
    <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30 p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[11px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">
          De onde converteram · UTM
        </h3>
        {total > sampleSize && (
          <span className="text-[10px] text-tbs-mute-light dark:text-tbs-mute">sobre os {sampleSize} mais recentes</span>
        )}
      </div>
      <div className="divider-accent mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
        {dims.map((dim) => (
          <div key={dim.drillType}>
            <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-mono mb-1">{dim.label}</div>
            <ul className="space-y-0.5">
              {dim.items.map((it) => (
                <li key={it.label}>
                  <button
                    onClick={() => open({ type: dim.drillType, value: it.label, edition: '2026' })}
                    className="w-full flex items-center justify-between gap-2 text-xs px-2 py-1 rounded hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3 cursor-pointer transition"
                  >
                    <span className="font-mono truncate max-w-[180px] text-tbs-ink-light dark:text-white" title={it.label}>{it.label}</span>
                    <span className="font-semibold text-tbs-orange-deep dark:text-tbs-orange-light shrink-0">{it.value}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactList({ contacts }: { contacts: DrillContact[] }) {
  return (
    <ul className="divide-y divide-tbs-line-light dark:divide-tbs-line border border-tbs-line-light dark:border-tbs-line rounded-lg overflow-hidden bg-white dark:bg-tbs-bg-3/30">
      {contacts.map((c) => (
        <li key={c.id}>
          <a
            href={c.hubspotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 hover:bg-tbs-orange-50 dark:hover:bg-tbs-bg-3 transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-tbs-ink-light dark:text-white truncate group-hover:text-tbs-orange-deep dark:group-hover:text-tbs-orange-light">
                  {c.displayName}
                </div>
                {c.email && c.email !== c.displayName && (
                  <div className="text-xs text-tbs-mute-light dark:text-tbs-mute truncate">{c.email}</div>
                )}
                {c.valor && (
                  <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">{c.valor}</div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {c.tbs_etapa && (
                    <span className="tbs-pill bg-tbs-orange-50 dark:bg-tbs-orange/20 text-tbs-orange-deep dark:text-tbs-orange-light border border-tbs-orange-100 dark:border-tbs-orange/30">{c.tbs_etapa}</span>
                  )}
                  {c.nome_do_parceiro && (
                    <span className="tbs-pill bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">parceiro: {c.nome_do_parceiro}</span>
                  )}
                  {c.regiao_tbs && (
                    <span className="tbs-pill bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">{c.regiao_tbs}</span>
                  )}
                  {c.hs_analytics_source && (
                    <span className="tbs-pill bg-tbs-line-light dark:bg-tbs-bg-3 text-tbs-mute-light dark:text-tbs-mute border border-tbs-line-light dark:border-tbs-line">{c.hs_analytics_source}</span>
                  )}
                  {c.utm_campaign_tbs && (
                    <span className="tbs-pill bg-tbs-orange-50 dark:bg-tbs-orange/10 text-tbs-orange-deep dark:text-tbs-orange-light border border-tbs-orange-100 dark:border-tbs-orange/20" title="utm_campaign_tbs">📣 {c.utm_campaign_tbs}</span>
                  )}
                  {c.utm_source_tbs && (
                    <span className="tbs-pill bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20" title="utm_source_tbs">{c.utm_source_tbs}</span>
                  )}
                  {c.utm_medium_tbs && (
                    <span className="tbs-pill bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20" title="utm_medium_tbs">{c.utm_medium_tbs}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {c.compraDate ? (
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold" title="horário da compra (data do pagamento)">
                    🛒 {new Date(c.compraDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : c.createdate ? (
                  <div className="text-[10px] text-tbs-mute font-mono">
                    {new Date(c.createdate).toLocaleDateString('pt-BR')}
                  </div>
                ) : null}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto mt-1 text-tbs-mute group-hover:text-tbs-orange-deep">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
