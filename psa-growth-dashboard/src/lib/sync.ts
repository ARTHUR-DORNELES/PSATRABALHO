// =====================================================================
// Orquestrador de sincronização.
// - Para cada experimento RUNNING de canal HubSpot (com token), coleta
//   os números (pull) e grava snapshots append-only.
// - Sempre recalcula o resultado (engine).
// - Registra a execução em sync_runs.
//
// WhatsApp (N8N) é PUSH: chega por /api/webhooks/n8n, não por aqui.
// Meta/Google Ads entram na fase 2 (collect* análogos).
// =====================================================================
import {
  createSyncRun,
  finishSyncRun,
  getChannel,
  insertSnapshots,
  listExperiments,
  listVariants,
} from "./db";
import { recomputeExperiment } from "./results";
import { hsCount, hubspotConfigured, type HsFilterGroup } from "./hubspot";
import type { Channel, Experiment, MetricSnapshot, SourceSystem } from "./types";

// Conta leads no HubSpot batendo com o mapeamento UTM do canal + variante.
// Ajuste os nomes das propriedades em channel.source_config / variant.source_key
// conforme o seu HubSpot (ex.: { "utm_content": "EXP-2026-001_A" }).
async function collectHubspot(
  exp: Experiment,
  channel: Channel,
): Promise<Omit<MetricSnapshot, "id">[]> {
  const variants = await listVariants(exp.id);
  const sinceMs = new Date(`${exp.startedAt}T00:00:00Z`).getTime();
  const out: Omit<MetricSnapshot, "id">[] = [];

  for (const v of variants) {
    const map = {
      ...(channel.sourceConfig as Record<string, unknown>),
      ...(v.sourceKey as Record<string, unknown>),
    };
    const filterGroups: HsFilterGroup[] = [
      {
        filters: [
          ...Object.entries(map)
            .filter(([, val]) => typeof val === "string" || typeof val === "number")
            .map(([propertyName, value]) => ({ propertyName, operator: "EQ", value: String(value) })),
          { propertyName: "createdate", operator: "GTE", value: String(sinceMs) },
        ],
      },
    ];
    const leads = await hsCount("contacts", filterGroups);
    out.push({
      experimentId: exp.id,
      variantId: v.id,
      metricKey: "leads",
      takenAt: new Date().toISOString(),
      sourceSystem: "HUBSPOT" as SourceSystem,
      value: leads,
      numerator: null,
      denominator: null,
      meta: { collectedFrom: "hubspot" },
    });
  }
  return out;
}

export async function runSync({ triggeredBy }: { triggeredBy: string }) {
  const runId = await createSyncRun("HUBSPOT", triggeredBy);
  let snapshotsWritten = 0;
  let touched = 0;
  const errors: unknown[] = [];

  try {
    const experiments = (await listExperiments()).filter((e) => e.status === "RUNNING");
    for (const exp of experiments) {
      try {
        const channel = await getChannel(exp.channelId);
        if (channel?.sourceSystem === "HUBSPOT" && hubspotConfigured()) {
          const snaps = await collectHubspot(exp, channel);
          snapshotsWritten += await insertSnapshots(snaps, runId);
        }
        await recomputeExperiment(exp.id);
        touched += 1;
      } catch (e) {
        errors.push({ experiment: exp.id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    await finishSyncRun(runId, {
      status: errors.length ? "PARTIAL" : "SUCCESS",
      snapshotsWritten,
      experimentsTouched: touched,
      errors,
      summary: { experiments: experiments.length, hubspotConfigured: hubspotConfigured() },
    });
  } catch (e) {
    await finishSyncRun(runId, {
      status: "FAILED",
      snapshotsWritten,
      experimentsTouched: touched,
      errors: [e instanceof Error ? e.message : String(e)],
    });
    throw e;
  }

  return { runId, snapshotsWritten, experimentsTouched: touched, errors };
}
