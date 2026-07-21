import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/Usuário/.claude/projects/C--Users-Usu-rio-Desktop-Claude-Code/f196efcc-632e-4a4e-9701-61c967418808/tool-results';
const files = fs.readdirSync(dir)
  .filter(f => f.startsWith('mcp-2d891e17-b0ee-45ce-b159-c5e47ec9500f-search_crm_objects-') && f.endsWith('.txt'))
  .map(f => ({ name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => a.mtime - b.mtime);

// Filter to only the 12 latest (the 3-year batch)
const recent = files.slice(-12);
console.log('Reading files:', recent.map(f => f.name));

const all = [];
for (const f of recent) {
  const raw = fs.readFileSync(f.path, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error('parse fail', f.name, e.message); continue; }
  for (const r of data.results || []) {
    all.push({
      id: r.id,
      name: r.properties.dealname,
      amount: r.properties.amount,
      closedate: r.properties.closedate,
      empresa: r.properties.nome_da_empresa,
      razao: r.properties.razao_social_da_empresa_responsavel_pela_contratacao_e_pelo_faturamento__ganho_,
      cnpj: r.properties.cnpj_da_empresa_responsavel_pela_contratacao_e_pelo_faturamento__ganho_,
      endereco: r.properties.endereco_da_empresa_responsavel_pela_contratacao_e_pelo_faturamento__ganho_,
    });
  }
  console.log(`  ${f.name}: ${data.results?.length || 0} recs (total in source: ${data.total})`);
}

console.log(`\nTotal deals loaded: ${all.length}`);

// Dedup by id
const byId = new Map();
for (const d of all) byId.set(d.id, d);
const uniq = [...byId.values()];
console.log(`After dedup by deal id: ${uniq.length}`);

fs.writeFileSync('_deals_3y_all.json', JSON.stringify(uniq));
console.log('Saved _deals_3y_all.json');
