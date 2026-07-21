const PDFDocument = require('pdfkit');
const fs = require('fs');

const OUT = 'C:/Users/Usuário/Desktop/Claude Code/tbs-2026-dashboard/RELATORIO_ATUALIZACOES_PAINEL.pdf';
const ORANGE = '#E8620E', DARK = '#1A1A1A', MUTE = '#666666', LINE = '#E2E2E2';

const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
doc.pipe(fs.createWriteStream(OUT));
const W = doc.page.width - 100;

function dayHeader(t) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ORANGE).text(t);
  const y = doc.y + 1.5;
  doc.moveTo(50, y).lineTo(50 + W, y).lineWidth(1).strokeColor(ORANGE).stroke();
  doc.moveDown(0.35);
}
function row(time, desc, strong) {
  if (doc.y > doc.page.height - 70) doc.addPage();
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(strong ? ORANGE : MUTE).text(time, 50, y + 0.5, { width: 38 });
  doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(DARK).text(desc, 92, y, { width: W - 42, lineGap: 1 });
  doc.moveDown(0.18);
}

// ===== Capa =====
doc.font('Helvetica-Bold').fontSize(19).fillColor(DARK).text('Linha do Tempo de Atualizações');
doc.font('Helvetica-Bold').fontSize(13).fillColor(ORANGE).text('Painel TBS 2026 (The Best Speaker / The Best School)');
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(10).fillColor(MUTE).text('Todas as atualizações feitas via Claude no dashboard, com data e horário — desde a criação (18/05/2026) até hoje.');
doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTE).text('Documento para diretoria · gerado em 09/06/2026 · horários de Brasília (hora do pedido).');
doc.moveDown(0.3);
doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).lineWidth(2).strokeColor(ORANGE).stroke();
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('Resumo: 137 versões publicadas em produção ao longo de 11 dias de trabalho. Abaixo, as atualizações agrupadas por dia. O dia 08/06 está no detalhe minuto a minuto (rodada de refinamento).', { lineGap: 1 });

const timeline = [
  ['18/05/2026 — Criação do painel', [
    ['16:05', 'Definição do painel de referência (HubSpot) e início do dashboard TBS'],
    ['16:31', 'Botão de atualizar + link público para compartilhar'],
    ['16:57', 'Números e dados clicáveis (drill para ver cada dado a fundo)'],
    ['17:27', 'Inscrições/dia, vídeos/dia, votos/dia, idade, estados, gênero, área e e-mail'],
  ]],
  ['19/05/2026', [
    ['09:05', 'Revisão da origem dos números (inscrições ainda não abertas)'],
    ['15:55', 'Zerar dados de anos anteriores (2025) que contavam como 2026'],
    ['16:52', 'Zerar 45 inscritos inexistentes'],
    ['17:09', 'Atualizar relatórios que ainda puxavam o ano passado'],
  ]],
  ['28/05/2026', [
    ['14:09', 'Ajuste do dash TBS conforme novas propriedades do HubSpot'],
    ['14:14', 'Régua do The Best Speaker como referência do fluxo'],
    ['16:40', 'Canais de entrada dos leads (CRM, mídia paga, redes) bem definidos'],
    ['16:54', 'Lead contabilizado desde o 1º formulário'],
    ['18:04', 'Investigação dos ~78% sem rastreio'],
  ]],
  ['29/05/2026', [
    ['10:56', 'Fontes e páginas de quem acessa a LP /inscricoes/'],
    ['11:14', 'Retirar anos anteriores; funil por tbs___etapa'],
    ['11:40', 'Funil de Leads no topo + filtro participante TBS 2026 + design'],
    ['13:22', 'Mostrar funis mesmo zerados (0)'],
    ['13:30', 'Pageviews & conversão da LP (base GA4)'],
    ['13:32', 'Atividade diária (inscrições / vídeos / votos por dia)'],
    ['13:49', 'Gráfico de inscritos por região — mapa do Brasil'],
    ['14:35', 'Mapa do Brasil por regiões + botão de tema claro/escuro'],
    ['17:45', 'Insights de conversão no painel'],
  ]],
  ['01/06/2026 — Início oficial do TBS', [
    ['08:37', 'Limpar/zerar números para o início do TBS'],
    ['08:54', 'Etapas do funil de leads (Inscrição principal etc.)'],
    ['09:14', 'Atividade diária por etapa (acima de canais de entrada)'],
    ['10:52', 'Mais opções no drill de canais de entrada (utm_TBS)'],
    ['11:04', 'Correção da região (inscritos sem região preenchida)'],
    ['11:31', 'Origem de entrada nos sites do domínio'],
    ['11:54', 'Bloco The Best School (abandono / compra de carrinho)'],
    ['12:01', 'Gráfico do checkout por dia'],
    ['14:14', 'Exceção: utm_source = comunidade → origem "Comunidade"'],
    ['16:16', 'Atualização em tempo real (auto-refresh 1 min)'],
    ['16:30', 'Correção do bug que zerava o painel antes de atualizar'],
    ['16:40', 'Investimento de campanha (Meta Ads)'],
    ['17:37', 'Mostrar só as campanhas TBS do ano'],
    ['17:42', 'ROAS, CPA e receita só de mídia paga (segmentado)'],
    ['17:48', 'Receita pelo valor líquido (TBSchool)'],
    ['17:56', 'Subir "Mídia paga x Vendas" e "Checkout" no topo, clicáveis'],
    ['18:18', 'Corrigir inversão de abandono/compra'],
  ]],
  ['02/06/2026', [
    ['08:55', 'Adicionar CPL e CPC'],
    ['10:29', 'Renomear "Resultado" para "Ponto de equilíbrio (Ads)"'],
    ['10:45', 'KPIs no topo (inscrição, cadastro, upload, IA)'],
    ['10:54', 'Corrigir gasto do Meta que zerou'],
    ['13:12', 'Corrigir etapas do funil (IA pronta, upload, pedir votos)'],
    ['15:59', 'Receita separada por Meta Ads vs Google Ads'],
    ['16:58', 'Gráfico ROAS / breakeven sobre o ritmo de inscrição'],
    ['17:15', 'CPA no breakeven (só quem converteu)'],
    ['17:40', 'Melhorias gerais de performance do painel'],
  ]],
  ['03/06/2026', [
    ['09:05', 'Relógio corrido (horário natural, não só ao atualizar)'],
    ['09:17', 'Segmentar "sem fonte" da conversão por canal'],
    ['09:21', 'Balde de Linktree/Bio + SEO'],
    ['11:03', 'PDF gerencial com a cara do TBS'],
    ['15:42', '% de compra do TBSchool por etapa do funil'],
  ]],
  ['05/06/2026', [
    ['09:52', 'Atualizar relatórios pelo pipeline do The Best School'],
    ['11:35', 'Retirar "perdidos" do painel'],
    ['12:56', 'Valor vendido por produto'],
    ['13:40', 'Conversão/total de vendas por canal batendo com o vendido'],
    ['16:10', 'Relatório comparativo de preço da live (R$ 19,90 → R$ 29,00)'],
    ['16:22', 'Adicionar taxa de conversão'],
    ['16:54', 'Ticket médio do upsell + vendas via Social Pago'],
    ['17:15', 'Recalcular a taxa do preço novo (virada às 16h50)'],
    ['17:16', 'Correção de timeout (504)'],
  ]],
  ['08/06/2026 — Rodada de refinamento fino (detalhada)', [
    ['09:09', 'Kiwify x dash: alinhar nº de vendas do dia'],
    ['09:25', 'Aplicar mudanças para ficar fiel ao Kiwify'],
    ['10:28', 'Backoffice (137) x dash (164): excluir quem não é participante'],
    ['11:03', 'Exclusão das contas de teste de todas as contagens'],
    ['11:20', 'Comparativo de preço só Social Pago + Vendas upsell; remoção de linhas; removido "TBSchool por etapa"'],
    ['11:40', 'Atividade diária: "Total inscritos no dia" no tooltip'],
    ['11:56', 'Taxa de conversão = (live + upsell) / inscritos'],
    ['12:11', 'Conversão pela janela de cada preço'],
    ['12:45', 'Conversão pela data de inscrição (campo oficial)'],
    ['14:13', 'ROAS: receita = live + upsell, gasto = só Meta'],
    ['14:48', 'Nova fonte "Otaviano (campanha)"'],
    ['14:51', 'Nova fonte "TikTok"'],
    ['15:13', 'ROAS em 3 colunas + remoção do CPC'],
    ['15:24', 'Bloco vira tabela comparativa (todas as infos por coluna)'],
    ['15:32', 'Inversão das colunas (antigos antes de novos)'],
    ['15:56', 'CPL por coluna'],
    ['16:44', 'ROAS/CPL/CPA por preço (janela de data) + gasto do Meta por dia'],
    ['16:52', 'Linhas de Upsells e Taxa de conversão por preço'],
    ['17:06', 'Seção "Origem do lead: base reativada x novos da campanha"'],
  ]],
  ['09/06/2026', [
    ['09:00', 'Remover comparativo de preço (consolidar em Mídia paga x Vendas)'],
    ['09:16', 'Marcas de vencedor (estrela) no painel Mídia paga x Vendas'],
    ['09:25', 'Última versão publicada em produção (redeploy)'],
  ]],
];

for (const [dia, itens] of timeline) {
  dayHeader(dia);
  const detalhado = dia.includes('08/06');
  for (const [t, d] of itens) row(t, d, detalhado);
}

// ===== Roadmap desta semana =====
if (doc.y > doc.page.height - 170) doc.addPage();
doc.moveDown(0.7);
doc.font('Helvetica-Bold').fontSize(12).fillColor(ORANGE).text('Roadmap desta semana');
const ry = doc.y + 1.5;
doc.moveTo(50, ry).lineTo(50 + W, ry).lineWidth(1).strokeColor(ORANGE).stroke();
doc.moveDown(0.4);
const roadmap = [
  'Segunda conferência dos dados para consolidação do que há no painel',
  'Discovery dos dados de votação do backoffice para o dashboard',
  'Alinhamento com o ROAS da Meta (caso haja atualização dos dados por parte deles)',
  'Criação da terceira aba no dashboard, mesclando as informações',
];
for (const it of roadmap) {
  if (doc.y > doc.page.height - 70) doc.addPage();
  doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text('•  ' + it, { indent: 6, lineGap: 2 });
  doc.moveDown(0.15);
}

doc.moveDown(0.6);
if (doc.y > doc.page.height - 110) doc.addPage();
doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text('Observações');
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• Os horários são da hora em que cada atualização foi solicitada (cada uma subiu para produção poucos minutos depois). Ao todo foram 137 publicações em produção no período.', { lineGap: 1.5 });
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• O dia 08/06 está no detalhe completo (rodada de refinamento). Nos demais dias, agrupamos por entrega para leitura executiva.', { lineGap: 1.5 });
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• Não estão aqui os ajustes de outros projetos (dashboard de bonificações, painel de UTM, landing pages e integração Kiwify/n8n), que rodaram em paralelo.', { lineGap: 1.5 });

doc.moveDown(0.6);
doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTE).text('Painel: https://tbs-2026-dashboard.vercel.app', { align: 'center' });

doc.end();
console.log('PDF gerado:', OUT);
