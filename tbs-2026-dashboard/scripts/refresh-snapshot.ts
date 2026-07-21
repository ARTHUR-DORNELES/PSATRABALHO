// CLI: npm run refresh
// Reusa a mesma lógica da rota /api/refresh-snapshot, mas executável fora do server.
import { hsCount, hsSearch } from '../lib/hubspot';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN não configurado em .env');

  const win = (op: 'GTE' | 'LT', v: string) => ({ propertyName: 'createdate', operator: op, value: v });

  const [total2024, total2025, total2026, interesse2026] = await Promise.all([
    hsCount(token, { filterGroups: [{ filters: [{ propertyName: 'tbs___origem_macro', operator: 'EQ', value: 'TBS 2024' }] }] }),
    hsCount(token, { filterGroups: [{ filters: [{ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' }, win('GTE', '2025-06-01'), win('LT', '2025-12-01')] }] }),
    hsCount(token, { filterGroups: [{ filters: [{ propertyName: 'origem_tbs', operator: 'HAS_PROPERTY' }, { propertyName: 'createdate', operator: 'GTE', value: '2026-01-01' }] }] }),
    hsCount(token, { filterGroups: [{ filters: [{ propertyName: 'interesse_tbs_2026', operator: 'EQ', value: 'true' }] }] }),
  ]);

  console.log({ total2024, total2025, total2026, interesse2026 });

  const snapshotPath = path.join(process.cwd(), 'data', 'snapshot.json');
  const existing = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
  const next = {
    ...existing,
    generatedAt: new Date().toISOString(),
    headline: {
      ...existing.headline,
      edition2024: { ...existing.headline.edition2024, total: total2024 },
      edition2025: { ...existing.headline.edition2025, total: total2025 },
      edition2026: { ...existing.headline.edition2026, total: total2026, interesse: interesse2026 },
    },
  };
  await fs.writeFile(snapshotPath, JSON.stringify(next, null, 2));
  console.log('snapshot atualizado em', snapshotPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
