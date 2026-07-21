import xlsx from 'xlsx';
const wb = xlsx.readFile('C:/Users/Usuário/Downloads/UTMS - PADRÃO HUBSPOT (1).xlsx');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const json = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n=== ' + name + ' ===');
  console.log('Rows:', json.length);
  let printed = 0;
  for (let i = 0; i < json.length; i++) {
    const row = json[i];
    const hasContent = row.some(c => String(c).trim() !== '');
    if (hasContent) {
      console.log(i, JSON.stringify(row));
      printed++;
      if (printed > 200) break;
    }
  }
}
