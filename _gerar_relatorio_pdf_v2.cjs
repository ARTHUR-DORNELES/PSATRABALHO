const PDFDocument = require('pdfkit');
const fs = require('fs');

const OUT = 'C:/Users/Usuário/Desktop/Claude Code/tbs-2026-dashboard/RELATORIO_ATUALIZACOES_PAINEL_v2.pdf';
const ORANGE = '#E8620E', DARK = '#1A1A1A', MUTE = '#666666', GREEN = '#1E8E5A';

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
doc.font('Helvetica').fontSize(10).fillColor(MUTE).text('Todas as atualizações feitas via Claude no dashboard e na integração de dados, com data e horário — da criação (18/05/2026) até 11/06/2026.');
doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTE).text('Documento para diretoria · gerado em 11/06/2026 · horários de Brasília (hora do pedido).');
doc.moveDown(0.3);
doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).lineWidth(2).strokeColor(ORANGE).stroke();
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('Esta versão acrescenta a rodada de 10–11/06: a 3ª aba (Visão Integrada), a separação da influência do Otaviano (pago x orgânico) e — o destaque do período — a reconciliação completa Kiwify x HubSpot, que zerou a diferença de valor vendido. Dias anteriores agrupados por entrega; 08/06 e 11/06 no detalhe.', { lineGap: 1 });

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
  ['08/06/2026 — Rodada de refinamento fino', [
    ['09:09', 'Kiwify x dash: alinhar nº de vendas do dia'],
    ['10:28', 'Backoffice (137) x dash (164): excluir quem não é participante'],
    ['11:03', 'Exclusão das contas de teste de todas as contagens'],
    ['11:20', 'Comparativo de preço só Social Pago + Vendas upsell'],
    ['11:56', 'Taxa de conversão = (live + upsell) / inscritos'],
    ['12:45', 'Conversão pela data de inscrição (campo oficial)'],
    ['14:13', 'ROAS: receita = live + upsell, gasto = só Meta'],
    ['14:48', 'Novas fontes "Otaviano (campanha)" e "TikTok"'],
    ['15:24', 'Mídia paga x Vendas vira tabela comparativa por preço'],
    ['16:44', 'ROAS/CPL/CPA por janela de preço + gasto do Meta por dia'],
    ['17:06', 'Seção "base reativada x novos da campanha"'],
  ]],
  ['09/06/2026', [
    ['09:00', 'Remover comparativo de preço (consolidar em Mídia paga x Vendas)'],
    ['09:16', 'Marcas de vencedor (estrela) no Mídia paga x Vendas'],
    ['09:25', 'Versão publicada em produção (redeploy)'],
  ]],
  ['10/06/2026', [
    ['10:09', 'Análise do feedback sobre o ROAS Geral (entender soma x média dos segmentos)'],
    ['11:10', 'Correção do erro ao clicar em "inscritos do dia" (limite de 6 filtros do HubSpot → janela única)'],
    ['11:40', 'Diagnóstico do botão "Atualizar" girando / "atualizado" travado (cache do snapshot na Vercel)'],
  ]],
  ['11/06/2026 — Visão Integrada, Otaviano e reconciliação Kiwify', [
    ['08:08', 'n8n: e-mail/telefone inválido travava a criação do negócio → sanitização (normaliza telefone p/ +55, corrige typo de domínio do e-mail) nos nós de criação'],
    ['09:00', 'Definição da chave de casamento Kiwify x HubSpot: CPF (100% preenchido nos inscritos) — resolve compra com e-mail diferente'],
    ['09:40', 'Construção da 3ª aba "Visão integrada": funil unificado, inscrição x venda por dia, conversão por canal, quem compra, conversão por região, tempo até a compra e perfil do comprador'],
    ['10:30', 'Bloco "Quem compra" em formato pizza (base reativada x novos)'],
    ['11:00', 'ROAS por segmento de verdade: gasto do Meta rateado pela fatia de inscritos (geral / base reativada / novos da campanha)'],
    ['11:30', 'Otaviano: reconhecer a UTM "redes-otavianocosta" como campanha do Otaviano'],
    ['12:00', 'Drill clicável no "Ritmo de inscrições por hora" (ver origens de cada hora)'],
    ['12:30', 'Cartão "Influência Otaviano" separando pago (criativo de anúncio) x orgânico (redes dele) — sem mexer no Social Pago'],
    ['13:00', 'Reconciliação Kiwify x HubSpot: diagnóstico do gap de valor vendido (~R$ 2.849)'],
    ['13:30', 'Diagnóstico fino: 31 vendas pagas em stage errado + 11 vendas sem negócio + 5 marcadas como perdidas'],
    ['14:05', 'Correção: 31 negócios movidos para "Fechado" (com valor certo) e 12 vendas faltantes criadas (sem duplicar, casando por CPF)'],
    ['14:22', 'Desbloqueio da publicação na Vercel (autor do commit no plano Hobby) + publicação da Visão Integrada e do cartão Otaviano'],
    ['14:30', 'n8n: nó de carrinho abandonado robusto (lê os dois formatos de evento e não quebra mais)'],
  ]],
];

for (const [dia, itens] of timeline) {
  dayHeader(dia);
  const detalhado = dia.includes('08/06') || dia.includes('11/06');
  for (const [t, d] of itens) row(t, d, detalhado);
}

// ===== Destaque: Reconciliação Kiwify x HubSpot =====
if (doc.y > doc.page.height - 200) doc.addPage();
doc.moveDown(0.7);
doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN).text('Destaque do período — Reconciliação Kiwify x HubSpot');
const dy = doc.y + 1.5;
doc.moveTo(50, dy).lineTo(50 + W, dy).lineWidth(1).strokeColor(GREEN).stroke();
doc.moveDown(0.4);
const destaque = [
  'Problema: o "Valor vendido" do painel não batia com o Kiwify (diferença de ~R$ 2.849).',
  'Causa: o webhook Kiwify→HubSpot deixava de criar alguns negócios (e-mail/telefone inválido, falha de envio) e não movia outros para "Fechado".',
  'Ação: cruzamento venda a venda por CPF/e-mail. Foram movidos 31 negócios pagos para "Fechado" e criadas 12 vendas que faltavam (sem duplicar). 5 confirmados como perdidos (reembolso/recusa), corretamente fora da receita.',
  'Resultado: diferença caiu de ~R$ 2.849 para ~R$ 1 (timing de tempo real). Painel e HubSpot batendo: 589 negócios fechados / R$ 20.214,25.',
  'Prevenção: o n8n foi blindado (sanitiza telefone/e-mail e trata os dois formatos de evento), reduzindo a perda de vendas daqui pra frente.',
];
for (const it of destaque) {
  if (doc.y > doc.page.height - 70) doc.addPage();
  doc.font('Helvetica').fontSize(9).fillColor(DARK).text('•  ' + it, { indent: 6, lineGap: 1.5 });
  doc.moveDown(0.12);
}

// ===== Roadmap =====
if (doc.y > doc.page.height - 170) doc.addPage();
doc.moveDown(0.6);
doc.font('Helvetica-Bold').fontSize(12).fillColor(ORANGE).text('Roadmap / próximos passos');
const ry = doc.y + 1.5;
doc.moveTo(50, ry).lineTo(50 + W, ry).lineWidth(1).strokeColor(ORANGE).stroke();
doc.moveDown(0.4);
const roadmap = [
  '[Concluído] 3ª aba (Visão Integrada) cruzando inscrições x vendas',
  '[Concluído] Reconciliação Kiwify x HubSpot e blindagem do n8n',
  'Snapshot durável (cron + armazenamento compartilhado) para o painel refletir o HubSpot na hora — fim do atraso de atualização',
  'Automação da reconciliação (rodar o cruzamento de tempos em tempos) + leitura do valor direto pela API do Kiwify',
  'Avaliar upgrade do plano de hospedagem (Vercel Pro) para publicar sem travas e permitir colaboração',
  'Discovery dos dados de votação do backoffice para o dashboard',
];
for (const it of roadmap) {
  if (doc.y > doc.page.height - 70) doc.addPage();
  doc.font('Helvetica').fontSize(9.5).fillColor(DARK).text('•  ' + it, { indent: 6, lineGap: 2 });
  doc.moveDown(0.12);
}

doc.moveDown(0.5);
if (doc.y > doc.page.height - 110) doc.addPage();
doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text('Observações');
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• Os horários são da hora em que cada atualização foi solicitada (cada uma subiu para produção em seguida).', { lineGap: 1.5 });
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• Diferente da versão anterior, esta inclui a integração Kiwify/n8n, porque foi o foco da rodada de 10–11/06.', { lineGap: 1.5 });
doc.font('Helvetica').fontSize(8.5).fillColor(MUTE).text('• Os números de fechamento (589 / R$ 20.214,25) são do momento da geração deste documento e variam em tempo real conforme entram vendas.', { lineGap: 1.5 });

doc.moveDown(0.6);
doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTE).text('Painel: https://tbs-2026-dashboard.vercel.app', { align: 'center' });

doc.end();
console.log('PDF gerado:', OUT);
