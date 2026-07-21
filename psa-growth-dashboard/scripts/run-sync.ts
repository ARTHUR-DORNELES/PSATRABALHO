// CLI de sincronização — usado pelo GitHub Actions (cron horário) e
// manualmente: npm run sync
import { runSync } from "../src/lib/sync";

runSync({ triggeredBy: "cli" })
  .then((r) => {
    console.log("✓ Sync concluído:", JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error("Falha no sync:", e);
    process.exit(1);
  });
