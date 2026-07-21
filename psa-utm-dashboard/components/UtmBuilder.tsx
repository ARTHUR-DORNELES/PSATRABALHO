'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

const VALID_MEDIUMS = ['social', 'paid_social', 'cpc', 'email'] as const;
const CANONICAL_SOURCES = [
  'meta', 'facebook', 'instagram', 'linkedin', 'google', 'whatsapp',
  'youtube', 'tiktok', 'email', 'newsletter',
];

type Props = {
  historySources: string[];
  historyMediums: string[];
  historyCampaigns: string[];
  historyLandings: string[];
};

export function UtmBuilder({ historySources, historyMediums, historyCampaigns, historyLandings }: Props) {
  const [target, setTarget] = useState<string>(historyLandings[0] ?? 'https://thebestspeaker.com.br/');
  const [source, setSource] = useState<string>('');
  const [medium, setMedium] = useState<typeof VALID_MEDIUMS[number] | ''>('');
  const [campaign, setCampaign] = useState<string>('');
  const [term, setTerm] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Combina canonical + history (history primeiro pra sugerir o que já é usado)
  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    historySources.forEach((s) => set.add(s));
    CANONICAL_SOURCES.forEach((s) => set.add(s));
    return [...set];
  }, [historySources]);

  const sourceCanonical = source && CANONICAL_SOURCES.includes(source);
  const sourceFromHistory = source && historySources.includes(source) && !sourceCanonical;

  const finalUrl = useMemo(() => {
    if (!target) return '';
    try {
      const u = new URL(target);
      if (source) u.searchParams.set('utm_source', source);
      if (medium) u.searchParams.set('utm_medium', medium);
      if (campaign) u.searchParams.set('utm_campaign', campaign);
      if (term) u.searchParams.set('utm_term', term);
      if (content) u.searchParams.set('utm_content', content);
      return u.toString();
    } catch {
      return '';
    }
  }, [target, source, medium, campaign, term, content]);

  const canCopy = !!finalUrl && !!source && !!medium && !!campaign;

  const copy = async () => {
    try { await navigator.clipboard.writeText(finalUrl); }
    catch { /* fallback in DOM */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sugestões de campanha baseadas no histórico
  const campaignSuggestions = useMemo(() => {
    if (!campaign) return historyCampaigns.slice(0, 6);
    return historyCampaigns.filter((c) => c.toLowerCase().includes(campaign.toLowerCase())).slice(0, 6);
  }, [campaign, historyCampaigns]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="URL de destino (sem UTMs)" hint="cole a URL da landing — termina em /inscricao, /drops, /conference, etc.">
          <input
            type="url"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            list="landings-dl"
            className="w-full mono text-[12px] bg-white border border-psa-line rounded-lg px-3 py-2 focus:outline-none focus:border-psa-accent"
            placeholder="https://thebestspeaker.com.br/"
          />
          <datalist id="landings-dl">
            {historyLandings.map((l) => <option key={l} value={l} />)}
          </datalist>
        </Field>

        <Field label="utm_source" hint={source ? (sourceCanonical ? '✓ canônico — agrupa direito no HubSpot' : sourceFromHistory ? '⚠ existe no histórico mas não é canônico — considere padronizar' : '✗ fora da lista oficial — vai cair em Other Campaigns') : 'escolha o nome do canal/site'}>
          <div className="flex gap-2">
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value.toLowerCase().trim())}
              list="sources-dl"
              className={clsx(
                'flex-1 mono text-[12px] border rounded-lg px-3 py-2 focus:outline-none',
                source
                  ? sourceCanonical
                    ? 'border-psa-good bg-psa-good-soft/50 focus:border-psa-good'
                    : 'border-psa-bad bg-psa-bad-soft/50 focus:border-psa-bad'
                  : 'border-psa-line bg-white focus:border-psa-accent',
              )}
              placeholder="meta · google · linkedin · whatsapp · ..."
            />
            <datalist id="sources-dl">
              {sourceOptions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {CANONICAL_SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={clsx(
                  'mono text-[11px] px-2 py-0.5 rounded',
                  source === s
                    ? 'bg-psa-accent text-white'
                    : 'bg-psa-accent-soft text-psa-accent hover:bg-psa-accent hover:text-white',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="utm_medium" hint="só 4 valores válidos pelo padrão PSA">
          <div className="flex flex-wrap gap-1.5">
            {VALID_MEDIUMS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMedium(m)}
                className={clsx(
                  'mono text-[11px] px-3 py-1.5 rounded-lg border',
                  medium === m
                    ? 'bg-psa-ink text-white border-psa-ink'
                    : 'bg-white text-psa-ink border-psa-line hover:border-psa-ink',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        <Field label="utm_campaign" hint="kebab-case · sem espaços/emojis · inclua o ano se for sazonal">
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, ''))}
            list="campaigns-dl"
            className="w-full mono text-[12px] bg-white border border-psa-line rounded-lg px-3 py-2 focus:outline-none focus:border-psa-accent"
            placeholder="tbs-2026 · drops-mar-2026 · ..."
          />
          <datalist id="campaigns-dl">
            {historyCampaigns.map((c) => <option key={c} value={c} />)}
          </datalist>
          {campaignSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] uppercase tracking-wider text-psa-mute mr-1 self-center">do histórico:</span>
              {campaignSuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCampaign(c)}
                  className="mono text-[11px] px-2 py-0.5 rounded bg-psa-bg text-psa-smoke hover:bg-psa-accent-soft hover:text-psa-accent"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="utm_term (opcional)" hint="ex.: variação A · 25-35 · interesse-X">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full mono text-[12px] bg-white border border-psa-line rounded-lg px-3 py-2 focus:outline-none focus:border-psa-accent"
              placeholder="opcional"
            />
          </Field>
          <Field label="utm_content (opcional)" hint="ex.: cta-principal · banner-topo · email1.1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full mono text-[12px] bg-white border border-psa-line rounded-lg px-3 py-2 focus:outline-none focus:border-psa-accent"
              placeholder="opcional"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">URL final · clique pra copiar</div>
          <div className={clsx(
            'rounded-xl border p-4 transition-colors',
            canCopy ? 'border-psa-accent/40 bg-psa-accent-soft/30' : 'border-psa-line bg-psa-bg',
          )}>
            <code className="block mono text-[12px] text-psa-ink break-all leading-relaxed min-h-[3em]">
              {finalUrl || (
                <span className="text-psa-mute italic">preencha source + medium + campaign pra gerar a URL</span>
              )}
            </code>
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-psa-line/60">
              <ValidationStrip source={source} medium={medium} campaign={campaign} />
              <button
                type="button"
                onClick={copy}
                disabled={!canCopy}
                className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                  canCopy
                    ? copied
                      ? 'bg-psa-good text-white'
                      : 'bg-psa-ink text-white hover:bg-psa-accent'
                    : 'bg-psa-line text-psa-mute cursor-not-allowed',
                )}
              >
                {copied ? '✓ Copiado' : '↗ Copiar URL'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-psa-line bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">Mais usadas no seu histórico</div>
          {historyCampaigns.length === 0 ? (
            <p className="text-[12px] text-psa-mute italic">Sem histórico de campanhas no período atual.</p>
          ) : (
            <ul className="space-y-1">
              {historyCampaigns.slice(0, 5).map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => setCampaign(c)}
                    className="w-full text-left flex items-center justify-between gap-2 text-[12px] py-1 px-2 -mx-2 rounded hover:bg-psa-bg group"
                  >
                    <span className="mono text-psa-ink">{c}</span>
                    <span className="text-[10px] text-psa-accent opacity-0 group-hover:opacity-100">usar →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label className="text-[11px] uppercase tracking-[0.16em] text-psa-ink font-medium">{label}</label>
        <span className="text-[10px] text-psa-mute">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function ValidationStrip({ source, medium, campaign }: { source: string; medium: string; campaign: string }) {
  const items = [
    { name: 'source',   v: !!source && CANONICAL_SOURCES.includes(source) },
    { name: 'medium',   v: !!medium && (VALID_MEDIUMS as readonly string[]).includes(medium) },
    { name: 'campaign', v: !!campaign && !/[\s|]/.test(campaign) && /^[a-z0-9\-_]+$/.test(campaign) },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map((it) => (
        <span
          key={it.name}
          className={clsx(
            'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
            it.v ? 'bg-psa-good-soft text-psa-good' : 'bg-psa-line/50 text-psa-mute',
          )}
        >
          {it.v ? '✓' : '○'} {it.name}
        </span>
      ))}
    </div>
  );
}
