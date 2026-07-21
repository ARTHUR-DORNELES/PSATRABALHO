const XLSX = require('xlsx');
const path = process.argv[2];
const wb = XLSX.readFile(path);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  console.log(`\n===== ABA: "${name}" · ${rows.length} linhas =====`);
  console.log('CABEÇALHO:', JSON.stringify(rows[0]));
  for (let i = 1; i <= Math.min(6, rows.length - 1); i++) console.log(`linha ${i}:`, JSON.stringify(rows[i]));
}
