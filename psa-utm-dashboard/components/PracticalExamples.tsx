import { Section } from './Section';
import type { Dataset, FixExample } from '@/lib/data';

const KIND_LABEL: Record<FixExample['kind'], { tag: string; tone: string }> = {
  non_standard_source: { tag: 'Source fora do padrão',  tone: 'bg-psa-bad-soft text-psa-bad' },
  non_standard_medium: { tag: 'Medium fora do padrão',  tone: 'bg-psa-bad-soft text-psa-bad' },
  missing_utm:         { tag: 'Sem UTM',                tone: 'bg-psa-warn-soft text-psa-warn' },
  partial_utm:         { tag: 'UTM parcial',            tone: 'bg-psa-warn-soft text-psa-warn' },
};

export function PracticalExamples({ data }: { data: Dataset }) {
  if (data.fixExamples.length === 0) return null;
  return (
    <Section
      eyebrow="Exemplos práticos"
      title="Antes / depois — como arrumar de verdade cada tipo de problema"
      description="Pegamos leads reais do seu HubSpot e mostramos: o que está errado hoje, qual é a forma correta, e o passo-a-passo de como aplicar o fix. Clique no nome do lead pra abrir o contato no HubSpot."
    >
      <div className="space-y-5">
        {data.fixExamples.map((ex, i) => (
          <ExampleCard key={i} ex={ex} />
        ))}
      </div>
    </Section>
  );
}

function ExampleCard({ ex }: { ex: FixExample }) {
  const tag = KIND_LABEL[ex.kind];
  return (
    <article className="border border-psa-line rounded-2xl overflow-hidden">
      <header className="px-5 py-3 bg-psa-bg/60 border-b border-psa-line flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <span className={`pill ${tag.tone}`}>{tag.tag}</span>
          <h3 className="text-sm font-semibold text-psa-ink mt-1.5">{ex.problemHeadline}</h3>
          <p className="text-[12px] text-psa-mute leading-snug mt-0.5">{ex.problemDetail}</p>
        </div>
        <a
          href={ex.contact.hubspotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-accent-soft hover:border-psa-accent text-psa-ink"
          title="Abrir contato no HubSpot"
        >
          <span className="mono text-[11px]">#{ex.contact.id.slice(-6)}</span>
          <span className="font-normal truncate max-w-[180px]">{ex.contact.name}</span>
          <span aria-hidden>↗</span>
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-psa-line">
        <div className="p-5 bg-psa-bad-soft/30">
          <div className="text-[10px] uppercase tracking-[0.2em] text-psa-bad font-semibold mb-3">✗ Como está hoje</div>
          <dl className="space-y-1.5">
            {ex.current.utm_source !== undefined && (
              <Field label="utm_source" value={ex.current.utm_source || '(vazio)'} bad />
            )}
            {ex.current.utm_medium !== undefined && (
              <Field label="utm_medium" value={ex.current.utm_medium || '(vazio)'} bad />
            )}
            {ex.current.utm_campaign !== undefined && (
              <Field label="utm_campaign" value={ex.current.utm_campaign || '(vazio)'} bad />
            )}
            {ex.current.landing && (
              <Field label="landing" value={ex.current.landing} href={ex.current.landingHref ?? ex.current.landing} />
            )}
            {ex.current.referrer && (
              <Field label="referrer" value={ex.current.referrer} />
            )}
          </dl>
        </div>

        <div className="p-5 bg-psa-good-soft/30">
          <div className="text-[10px] uppercase tracking-[0.2em] text-psa-good font-semibold mb-3">✓ Como deveria estar</div>
          <dl className="space-y-1.5">
            <Field label="utm_source" value={ex.fix.utm_source} good />
            <Field label="utm_medium" value={ex.fix.utm_medium} good />
            <Field label="utm_campaign" value={ex.fix.utm_campaign} good />
          </dl>
          {ex.fix.fullUrl && (
            <div className="mt-4 pt-3 border-t border-psa-good/30">
              <div className="text-[10px] uppercase tracking-[0.18em] text-psa-mute mb-1.5">URL final correta</div>
              <code className="block mono text-[11px] bg-white border border-psa-good/30 rounded-lg px-3 py-2 break-all text-psa-ink">
                {ex.fix.fullUrl}
              </code>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-psa-line bg-white">
        <div className="text-[10px] uppercase tracking-[0.2em] text-psa-accent font-semibold mb-2">▶ Passo-a-passo do fix</div>
        <ol className="space-y-1.5 list-decimal list-inside text-[13px] text-psa-ink">
          {ex.steps.map((s, i) => (
            <li key={i} className="leading-snug pl-1 [&>code]:mono [&>code]:text-[11px] [&>code]:bg-psa-bg [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded">
              {renderInline(s)}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function Field({ label, value, href, good, bad }: { label: string; value: string; href?: string; good?: boolean; bad?: boolean }) {
  const valueCls = good
    ? 'mono text-[12px] bg-white border border-psa-good/40 text-psa-good px-2 py-0.5 rounded'
    : bad
    ? 'mono text-[12px] bg-white border border-psa-bad/40 text-psa-bad px-2 py-0.5 rounded line-through decoration-psa-bad/40'
    : 'mono text-[12px] text-psa-mute';
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[10px] uppercase tracking-wider text-psa-mute w-24 shrink-0">{label}</dt>
      <dd className="min-w-0 truncate">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={`${valueCls} hover:underline`}>
            {value}
          </a>
        ) : (
          <span className={valueCls}>{value}</span>
        )}
      </dd>
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('`') && p.endsWith('`') ? (
      <code key={i}>{p.slice(1, -1)}</code>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
