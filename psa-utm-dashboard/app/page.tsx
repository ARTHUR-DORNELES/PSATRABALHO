import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Insights } from '@/components/Insights';
import { KpiCards } from '@/components/KpiCards';
import { HealthBars } from '@/components/HealthBars';
import { TopLists } from '@/components/TopLists';
import { DuplicateCampaigns } from '@/components/DuplicateCampaigns';
import { UntaggedLandings } from '@/components/UntaggedLandings';
import { UntaggedSegments } from '@/components/UntaggedSegments';
import { PracticalExamples } from '@/components/PracticalExamples';
import { RecentUntagged } from '@/components/RecentUntagged';
import { UtmBuilderPanel } from '@/components/UtmBuilderPanel';
import { UtmStandard } from '@/components/UtmStandard';
import { getUtmDataset, OBJECT_TYPES, PERIODS_ORDER, type ObjectType, type Period } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: { period?: string; obj?: string } }) {
  const rawP = (searchParams?.period ?? '90d') as Period;
  const period: Period = (PERIODS_ORDER as string[]).includes(rawP) ? rawP : '90d';
  const rawO = (searchParams?.obj ?? 'contacts') as ObjectType;
  const objectType: ObjectType = (OBJECT_TYPES as string[]).includes(rawO) ? rawO : 'contacts';

  let data;
  try {
    data = await getUtmDataset(period, objectType);
  } catch (err) {
    return <ErrorState message={String(err instanceof Error ? err.message : err)} />;
  }

  return (
    <div className="min-h-screen">
      <Header data={data} />
      <main className="max-w-[1320px] mx-auto px-6 pt-6 pb-12 space-y-8">
        <Hero data={data} />

        <ListShortcut />

        <Group eyebrow="01 · saúde" title="Visão geral" description="Os 4 números que respondem 'tá funcionando?'. Cada card explica o que mede e como interpretar.">
          <KpiCards data={data} />
        </Group>

        <Group eyebrow="02 · qualidade" title="Distribuição" description="Onde os leads caem dentro do espectro de qualidade de UTM. Visual ajuda a comparar 'sem UTM' versus 'no padrão'.">
          <HealthBars data={data} />
        </Group>

        <Group eyebrow="03 · ações" title="Insights automáticos" description="Leitura automática dos dados: o que mantém, o que corrige primeiro. Atualiza a cada carga.">
          <Insights data={data} />
        </Group>

        <Group eyebrow="03.5 · exemplos" title="Antes / depois — como arrumar de verdade" description="Pegamos leads reais e mostramos o que está errado, qual é a versão correta e o passo-a-passo de aplicação.">
          <PracticalExamples data={data} />
        </Group>

        <Group eyebrow="04 · inteligência" title="Onde está o bolo dos leads sem UTM" description="A pergunta que importa: qual segmento concentra mais leads sem atribuição? Cada linha vira uma lista clicável de contatos no HubSpot.">
          <UntaggedSegments data={data} />
        </Group>

        <Group eyebrow="05 · catálogo" title="Quem está taggeado, como está" description="Top fontes, mídias e campanhas detectadas na amostra com UTM.">
          <TopLists data={data} />
        </Group>

        <Group eyebrow="06 · diagnóstico" title="Quem não está taggeado, e por quê" description="A partir daqui a discussão deixa de ser 'tá ruim?' e vira 'onde a gente conserta primeiro?'.">
          <DuplicateCampaigns data={data} />
          <UntaggedLandings data={data} />
          <RecentUntagged data={data} />
        </Group>

        <Group eyebrow="07 · operação" title="Construa a UTM correta agora" description="Use o builder pra montar a URL no padrão. Source/medium validados em tempo real; campaign autocompleta com o histórico.">
          <UtmBuilderPanel data={data} />
        </Group>

        <Group eyebrow="08 · governança" title="Padrão PSA · referência" description="Como uma UTM correta da PSA é montada. Refere a planilha 'UTMS - PADRÃO HUBSPOT'.">
          <UtmStandard />
        </Group>

        <footer className="text-center text-[11px] text-psa-mute pt-4">
          PSA · UTM Observability · HubSpot portal 49656171 · amostra de até 1.000 leads taggeados + 1.000 não-taggeados por período
          {data.meta.sampleCapped && <div className="text-psa-warn mt-1">⚠ Amostra atingiu o limite — números agregados podem subestimar</div>}
        </footer>
      </main>
    </div>
  );
}

function ListShortcut() {
  return (
    <section className="rounded-2xl border border-psa-accent/30 bg-psa-accent-soft/30 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-psa-accent font-semibold mb-1">Análise por lista HubSpot</div>
        <h3 className="text-sm font-semibold text-psa-ink">Backfill de UTMs em lote</h3>
        <p className="text-[12px] text-psa-mute mt-0.5 max-w-2xl">
          Pega uma Active List do HubSpot (ex.: "sem UTM mas com atribuição") e gera uma tabela de fix + CSV pra reimportar. Pega o list ID na URL da lista no HubSpot.
        </p>
      </div>
      <a
        href="/list/12916"
        className="text-xs font-medium px-3 py-1.5 rounded-full bg-psa-ink text-white hover:bg-psa-accent whitespace-nowrap"
      >
        Abrir análise da lista #12916 →
      </a>
    </section>
  );
}

function Group({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap border-b border-psa-line pb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-psa-mute font-semibold mono">{eyebrow}</span>
        <h2 className="text-2xl font-semibold tracking-tight text-psa-ink">{title}</h2>
        <p className="text-sm text-psa-mute basis-full lg:basis-auto lg:flex-1 max-w-2xl">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-psa-bg flex items-center justify-center p-6">
      <div className="card max-w-xl border-psa-bad/30">
        <h1 className="text-lg font-semibold text-psa-bad">Não foi possível carregar o dashboard</h1>
        <p className="text-sm text-psa-mute mt-2 mono break-all">{message}</p>
        <p className="text-sm text-psa-ink mt-4">
          Verifique se o arquivo <span className="mono">.env</span> existe com <span className="mono">HUBSPOT_TOKEN=...</span> dentro de <span className="mono">psa-utm-dashboard/</span>.
        </p>
      </div>
    </div>
  );
}
