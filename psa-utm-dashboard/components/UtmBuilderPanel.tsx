import { Section } from './Section';
import { UtmBuilder } from './UtmBuilder';
import type { Dataset } from '@/lib/data';

export function UtmBuilderPanel({ data }: { data: Dataset }) {
  return (
    <Section
      eyebrow="Construtor"
      title="Monte uma nova UTM no padrão (sugere com base no seu histórico)"
      description="Substitui a aba ⚙️ CRIADOR DE UTMS da planilha. O campo source/medium é validado contra a lista canônica em tempo real; o campo campaign autocompleta com as campanhas já existentes no seu HubSpot."
    >
      <UtmBuilder
        historySources={data.history.sources}
        historyMediums={data.history.mediums}
        historyCampaigns={data.history.campaigns}
        historyLandings={data.history.landings}
      />
    </Section>
  );
}
