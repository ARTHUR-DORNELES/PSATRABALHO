import { PageHeader } from "@/components/PageHeader";
import { GrowthCalendar, type CalendarEvent } from "@/components/GrowthCalendar";
import { listFunnels, listMetricDefs } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [funnels, metricDefs] = await Promise.all([listFunnels(), listMetricDefs()]);
  const metricByKey = new Map(metricDefs.map((m) => [m.key, m]));

  const events: CalendarEvent[] = funnels.map((f) => ({
    id: f.experiment.id,
    code: f.experiment.code,
    name: f.experiment.name,
    channelKind: f.channel?.kind ?? "OTHER",
    channelName: f.channel?.name ?? "—",
    front: (f.experiment.meta?.front as string | undefined) ?? null,
    startedAt: (f.experiment.startedAt ?? "").slice(0, 10),
    endedAt: f.experiment.endedAt ? f.experiment.endedAt.slice(0, 10) : null,
    deadline: f.criteria?.decisionDeadline ? f.criteria.decisionDeadline.slice(0, 10) : null,
    status: f.experiment.status,
    hypothesis: f.experiment.hypothesis,
    targetMetricLabel: f.criteria ? metricByKey.get(f.criteria.targetMetricKey)?.label ?? null : null,
    relativeLift: f.result?.relativeLift ?? null,
    confidence: f.result?.confidence ?? null,
    recommendation: f.result?.recommendation ?? null,
  }));

  // "Hoje" no fuso de São Paulo (en-CA formata como YYYY-MM-DD).
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [ty, tm] = today.split("-").map(Number);

  return (
    <>
      <PageHeader
        title="Calendário de ações"
        subtitle="Quando cada teste de growth começa. Clique numa ação para ver o resumo, ou num dia para agendar um novo teste."
      />
      <GrowthCalendar events={events} initialYear={ty} initialMonth={tm - 1} today={today} />
    </>
  );
}
