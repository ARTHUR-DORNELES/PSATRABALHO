import { Section } from './Section';
import type { Dataset } from '@/lib/data';

const fmt = new Intl.NumberFormat('pt-BR');

export function DuplicateCampaigns({ data }: { data: Dataset }) {
  if (data.duplicateCampaigns.length === 0) return null;
  return (
    <Section
      eyebrow="Higiene"
      title="Campaigns duplicadas (mesma campanha escrita de jeitos diferentes)"
      description="Comparação normalizada (só letras e números, sem hífen/underscore). Cada linha são variações que estão fragmentando o relatório — viraram a mesma coisa mas o HubSpot conta separado."
      className="border-psa-warn/30 bg-psa-warn-soft/40"
    >
      <ul className="space-y-2">
        {data.duplicateCampaigns.map((d) => (
          <li key={d.slug} className="flex items-baseline justify-between gap-3 border-b border-psa-warn/20 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[10px] uppercase tracking-[0.16em] text-psa-mute">slug</span>
              <span className="mono text-xs text-psa-ink">{d.slug}</span>
              <span className="text-psa-mute">→</span>
              {d.variants.map((v) => (
                <span key={v.name} className="mono text-[11px] bg-white border border-psa-warn/30 px-2 py-0.5 rounded">
                  {v.name} <span className="text-psa-mute">({fmt.format(v.count)})</span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-psa-mute mt-3 leading-snug">
        Sugestão: padronizar pra uma única grafia (kebab-case, ex.: <span className="mono">tbs-2026</span>), atualizar os links que ainda usam a versão antiga, e rodar um workflow no HubSpot pra reescrever a propriedade <span className="mono">utm_campaign</span> dos contatos legados.
      </p>
    </Section>
  );
}
