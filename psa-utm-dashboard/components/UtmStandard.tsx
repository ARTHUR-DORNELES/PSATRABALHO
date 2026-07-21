import { Section } from './Section';
import { CANONICAL_SOURCES, COMPLETENESS_RULES, DEFAULT_COMPLETENESS, VALID_MEDIUMS } from '@/lib/utm';

const MEDIUM_EXPLANATIONS: Record<string, string> = {
  social:      'Posts orgânicos em redes sociais · bio · stories',
  paid_social: 'Tráfego pago em redes (Meta Ads, LinkedIn Ads, TikTok Ads)',
  cpc:         'Cliques pagos em search (Google Ads, Microsoft Ads)',
  email:       'Email marketing · newsletter · transacional',
};

const EXAMPLES = [
  {
    label: 'Orgânico (a regra é só ter utm_source)',
    url: 'https://thebestspeaker.com.br/inscricao?utm_source=organico',
    why: 'Source "organico" só precisa de si mesmo — tráfego orgânico não tem campanha por trás.',
  },
  {
    label: 'Anúncio Google Ads',
    url: 'https://psa.com.br/conference?utm_source=google&utm_medium=cpc&utm_campaign=psa-conference-2026',
    why: 'google → exige utm_source + utm_campaign. utm_medium ajuda no agrupamento mas não é obrigatório pra completude.',
  },
  {
    label: 'Meta Ads (facebook)',
    url: 'https://psa.com.br/tbs?utm_source=facebook&utm_medium=paid_social&utm_campaign=tbs-2026-meta',
    why: 'facebook → exige utm_source + utm_campaign.',
  },
  {
    label: 'LinkedIn paid',
    url: 'https://psa.com.br/conference?utm_source=linkedin&utm_medium=paid_social&utm_campaign=conf-26-li',
    why: 'linkedin → exige utm_source + utm_campaign.',
  },
];

export function UtmStandard() {
  const explicit = COMPLETENESS_RULES;
  return (
    <Section
      eyebrow="Como ler · regras PSA"
      title="Quando o lead conta como UTM completa"
      description='Definição oficial do MKT OPS PSA. Lead "completo" não significa "todos os 5 campos preenchidos" — significa "atende a regra de completude do seu utm_source".'
    >
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-psa-mute border-b border-psa-line">
              <th className="py-2 px-2 font-medium">utm_source</th>
              <th className="py-2 px-2 font-medium">Campos exigidos pra ser completo</th>
              <th className="py-2 px-2 font-medium">Comentário</th>
            </tr>
          </thead>
          <tbody>
            {explicit.map((r) => (
              <tr key={r.source} className="border-b border-psa-line/60">
                <td className="py-2.5 px-2"><span className="mono text-[12px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded">{r.source}</span></td>
                <td className="py-2.5 px-2">
                  <div className="flex gap-1 flex-wrap">
                    {r.requires.map((f) => (
                      <span key={f} className="mono text-[11px] bg-psa-good-soft text-psa-good px-1.5 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-[12px] text-psa-mute">{r.label ?? ''}</td>
              </tr>
            ))}
            <tr className="border-b border-psa-line/60 bg-psa-bg/40">
              <td className="py-2.5 px-2"><span className="mono text-[12px] bg-psa-line/50 text-psa-mute px-2 py-0.5 rounded">{DEFAULT_COMPLETENESS.source}</span></td>
              <td className="py-2.5 px-2">
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COMPLETENESS.requires.map((f) => (
                    <span key={f} className="mono text-[11px] bg-psa-warn-soft text-psa-warn px-1.5 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              </td>
              <td className="py-2.5 px-2 text-[12px] text-psa-mute">{DEFAULT_COMPLETENESS.label} · aplicado a meta, instagram, whatsapp, youtube, tiktok, email, newsletter, etc.</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2"><span className="mono text-[12px] bg-psa-bad-soft text-psa-bad px-2 py-0.5 rounded">(vazio)</span></td>
              <td className="py-2.5 px-2 text-[12px] text-psa-mute italic">— não atende nada</td>
              <td className="py-2.5 px-2 text-[12px] text-psa-mute">Sem nenhuma UTM · HubSpot atribui a Direct/Other Campaigns</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-psa-mute mt-4 leading-snug">
        Pra ajustar regras, edite <span className="mono">COMPLETENESS_RULES</span> em <span className="mono">lib/utm.ts</span> e rode <span className="mono">vercel deploy --prod</span>.
      </p>

      <div className="mt-6 pt-5 border-t border-psa-line grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">utm_medium · canônicos (separado da completude)</div>
          <ul className="space-y-1.5">
            {VALID_MEDIUMS.map((m) => (
              <li key={m} className="flex items-baseline gap-2">
                <span className="mono text-[12px] bg-psa-accent-soft text-psa-accent px-1.5 py-0.5 rounded shrink-0">{m}</span>
                <span className="text-[12px] text-psa-mute">{MEDIUM_EXPLANATIONS[m]}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-psa-mute mt-2 leading-snug">
            Mesmo não sendo obrigatório pra completude, manter o medium nesta lista é o que faz o HubSpot agrupar como Pesquisa Paga, Social Media, etc.
          </p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">utm_source · canônicos (separado da completude)</div>
          <div className="flex flex-wrap gap-1.5">
            {CANONICAL_SOURCES.map((s) => (
              <span key={s} className="mono text-[12px] bg-psa-accent-soft text-psa-accent px-2 py-0.5 rounded">{s}</span>
            ))}
            <span className="mono text-[12px] bg-psa-good-soft text-psa-good px-2 py-0.5 rounded">organico</span>
          </div>
          <p className="text-[11px] text-psa-mute mt-2 leading-snug">
            Apelidos que <em>quebram</em> o agrupamento: <span className="mono">ig</span>, <span className="mono">fb</span>, <span className="mono">adwords</span>, <span className="mono">hs_email</span>, <span className="mono">site-institucional</span>.
          </p>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-psa-line">
        <div className="text-[11px] uppercase tracking-[0.18em] text-psa-mute mb-2">Exemplos de URL final que atendem as regras</div>
        <ul className="space-y-3">
          {EXAMPLES.map((ex) => (
            <li key={ex.label}>
              <div className="text-[11px] text-psa-mute mb-0.5">{ex.label}</div>
              <code className="block mono text-[12px] bg-psa-bg border border-psa-line rounded-lg px-3 py-2 break-all text-psa-ink">{ex.url}</code>
              <p className="text-[11px] text-psa-mute mt-1 italic">{ex.why}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
