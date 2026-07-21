// Agente de votos TBS — Fase 1: loga no backoffice e baixa os XLSX de votos.
// Credenciais vêm de psa-credenciais.txt (gitignored): PSA_EMAIL=... / PSA_SENHA=...
// Uso: node _votos_agent.cjs            (modo visível, pra você ver rodando)
//      HEADLESS=1 node _votos_agent.cjs (modo invisível, pro agendamento)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// credenciais (psa-credenciais.txt ou .env.local)
for (const f of ['psa-credenciais.txt', '.env.local']) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = process.env[m[1]] || m[2].replace(/^["']|["']$/g, '');
  }
}
const EMAIL = process.env.PSA_EMAIL;
const SENHA = process.env.PSA_SENHA;
if (!EMAIL || !SENHA) { console.error('✗ Falta PSA_EMAIL / PSA_SENHA em psa-credenciais.txt'); process.exit(1); }

const LOGIN_URL = 'https://login.profissionaissa.com.br/dash/login?origin=tbsb-backoffice&callback=https%3A%2F%2Fbackoffice.thebestspeaker.com.br';
const OUT_DIR = path.join(__dirname, 'votos');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '1' });
  const page = await browser.newPage();
  try {
    console.log('→ login...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Insira seu e-mail' }).fill(EMAIL);
    await page.getByRole('button', { name: 'Avançar' }).click();
    await page.getByRole('textbox', { name: 'Insira sua senha' }).fill(SENHA);
    await page.getByRole('button', { name: 'Acessar agora' }).click();

    console.log('→ abrindo Relatórios...');
    await page.getByRole('link', { name: 'Relatórios' }).click();
    await page.waitForLoadState('networkidle');

    const botoes = page.getByRole('button', { name: 'Baixar XLSX' });
    const n = await botoes.count();
    console.log(`→ ${n} relatórios encontrados. Baixando...`);
    const baixados = [];
    for (let i = 0; i < n; i++) {
      const downloadPromise = page.waitForEvent('download');
      await botoes.nth(i).click();
      const download = await downloadPromise;
      const nome = download.suggestedFilename() || `relatorio_${i + 1}.xlsx`;
      const dest = path.join(OUT_DIR, nome);
      await download.saveAs(dest);
      baixados.push(nome);
      console.log(`   ✓ ${nome}`);
    }
    console.log(`\n✓ ${baixados.length} arquivos salvos em: ${OUT_DIR}`);
  } catch (e) {
    console.error('\n✗ erro:', e.message);
    await page.screenshot({ path: path.join(OUT_DIR, '_erro.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
