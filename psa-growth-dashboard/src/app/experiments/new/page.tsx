import { PageHeader } from "@/components/PageHeader";
import { NewExperimentForm } from "@/components/NewExperimentForm";
import { listChannels, listMetricDefs } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const [channels, metrics] = await Promise.all([listChannels(), listMetricDefs()]);
  const initialDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : undefined;
  return (
    <>
      <PageHeader
        title="Novo experimento"
        subtitle="Registre a hipótese, a execução e o critério de decisão. Os números de resultado entram pelo sync."
      />
      <div className="p-8">
        <NewExperimentForm channels={channels} metrics={metrics} initialDate={initialDate} />
      </div>
    </>
  );
}
