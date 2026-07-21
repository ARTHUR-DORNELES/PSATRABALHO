// =====================================================================
// Seed do vocabulário base no Supabase: channels + metric_definitions.
// Rodar: npm run seed   (precisa das envs do Supabase no .env)
// Idempotente — usa `key` como chave de conflito (o id é uuid gerado
// pelo Postgres, então NÃO enviamos os ids-slug do mock).
// =====================================================================
import { getSupabase } from "../src/lib/supabase";
import { mockChannels, mockMetricDefs } from "../src/lib/mock-data";

async function main() {
  const sb = getSupabase();

  console.log(`Inserindo ${mockChannels.length} canais...`);
  const { error: chErr } = await sb.from("channels").upsert(
    mockChannels.map((c) => ({
      key: c.key,
      name: c.name,
      kind: c.kind,
      source_system: c.sourceSystem,
      source_config: c.sourceConfig,
      active: c.active,
    })),
    { onConflict: "key" },
  );
  if (chErr) throw chErr;

  console.log(`Inserindo ${mockMetricDefs.length} definições de métrica...`);
  const { error: mdErr } = await sb.from("metric_definitions").upsert(
    mockMetricDefs.map((m) => ({
      key: m.key,
      label: m.label,
      kind: m.kind,
      unit: m.unit,
      rate_of: m.rateOf,
      higher_is_better: m.higherIsBetter,
    })),
    { onConflict: "key" },
  );
  if (mdErr) throw mdErr;

  console.log("✓ Seed concluído (channels + metric_definitions).");
}

main().catch((e) => {
  console.error("Falha no seed:", e);
  process.exit(1);
});
