const PDFDocument = require('pdfkit');
const fs = require('fs');

const C = {
  dark: '#0E0E14', orange: '#F08220', orangeDeep: '#D14A0F', orangeLight: '#FFA52A',
  ink: '#16161D', mute: '#6B6B80', line: '#E6E6EA', tint: '#FFF6EF', white: '#FFFFFF',
  red: '#DC2626', amber: '#D97706', sky: '#0284C7', green: '#059669',
};
const SEV = {
  critico: { label: 'CRÍTICO', color: C.red }, atencao: { label: 'ATENÇÃO', color: C.amber },
  oportunidade: { label: 'OPORTUNIDADE', color: C.sky }, ok: { label: 'SAUDÁVEL', color: C.green },
};
const brl = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAGE_W = 595.28, PAGE_H = 841.89, M = 46, CW = PAGE_W - 2 * M, BOTTOM = PAGE_H - 58;

const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
const OUT = 'C:/Users/Usuário/Desktop/Claude Code/TBS_2026_Relatorio_Gerencial.pdf';
doc.pipe(fs.createWriteStream(OUT));

function speakerBars(cx, cy, scale, color) {
  doc.save();
  for (const [dx, ry] of [[-24, 14], [-12, 22], [0, 28], [12, 22], [24, 14]])
    doc.fillColor(color).ellipse(cx + dx * scale, cy, 5 * scale, ry * scale).fill();
  doc.restore();
}

// ---------- CAPA ----------
doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.dark);
doc.save();
for (let i = 0; i < 22; i++) {
  doc.rect(0, 120 + i * 8, 250, 2).fillOpacity(0.10 + (i % 3) * 0.03).fill(C.orange);
  doc.rect(PAGE_W - 250, 540 + i * 8, 250, 2).fillOpacity(0.10 + (i % 3) * 0.03).fill(C.orangeDeep);
}
doc.restore(); doc.fillOpacity(1);
speakerBars(PAGE_W / 2, 205, 1.7, C.orange);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(40).text('THE BEST SPEAKER', 0, 275, { width: PAGE_W, align: 'center', characterSpacing: 1 });
doc.fillColor(C.orangeLight).fontSize(40).text('2026', 0, 320, { width: PAGE_W, align: 'center' });
doc.fillColor(C.orange).font('Helvetica-Bold').fontSize(11).text('3ª  EDIÇÃO', 0, 374, { width: PAGE_W, align: 'center', characterSpacing: 4 });
doc.moveTo(PAGE_W / 2 - 90, 402).lineTo(PAGE_W / 2 + 90, 402).lineWidth(1.5).strokeColor(C.orange).stroke();
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20).text('Relatório Gerencial Completo', 0, 422, { width: PAGE_W, align: 'center' });
doc.fillColor('#B9B9C8').font('Helvetica').fontSize(13).text('Performance  ·  Análise  ·  Diagnóstico  ·  Plano de Ação', 0, 450, { width: PAGE_W, align: 'center' });
doc.fillColor('#8A8A9C').font('Helvetica').fontSize(11).text('03 de junho de 2026  ·  campanha desde 01/06/2026', 0, 700, { width: PAGE_W, align: 'center' });
doc.fillColor('#6A6A7C').fontSize(9).text('Dados ao vivo · HubSpot + Meta Ads + Google Ads', 0, 718, { width: PAGE_W, align: 'center' });

// ---------- HELPERS ----------
let y = 0;
function pageChrome() {
  speakerBars(M + 14, 30, 0.5, C.orange);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text('THE BEST SPEAKER 2026', M + 34, 26);
  doc.fillColor(C.mute).font('Helvetica').fontSize(8).text('Relatório Gerencial', PAGE_W - M - 150, 28, { width: 150, align: 'right' });
  doc.moveTo(M, 44).lineTo(PAGE_W - M, 44).lineWidth(0.7).strokeColor(C.line).stroke();
}
function newPage() { doc.addPage({ size: 'A4', margin: 0 }); doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.white); y = 52; pageChrome(); }
function ensure(h) { if (y + h > BOTTOM) newPage(); }
function sectionTitle(t, sub) {
  ensure(48); doc.rect(M, y, 4, 18).fill(C.orange);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(14).text(t, M + 12, y - 1); y += 18;
  if (sub) { doc.fillColor(C.mute).font('Helvetica').fontSize(8.5).text(sub, M + 12, y); y += 12; }
  y += 8;
}
function kpiRow(items) {
  const gap = 9, n = items.length, w = (CW - gap * (n - 1)) / n, h = 56; ensure(h + 6);
  items.forEach((it, i) => {
    const x = M + i * (w + gap);
    doc.roundedRect(x, y, w, h, 7).fill(C.tint);
    doc.roundedRect(x, y, w, h, 7).lineWidth(0.8).strokeColor('#F3D9C4').stroke();
    doc.fillColor(C.mute).font('Helvetica-Bold').fontSize(6.3).text(it.label.toUpperCase(), x + 8, y + 8, { width: w - 16, characterSpacing: 0.3 });
    doc.fillColor(it.color || C.orangeDeep).font('Helvetica-Bold').fontSize(15).text(it.value, x + 8, y + 22, { width: w - 16 });
    if (it.note) doc.fillColor(C.mute).font('Helvetica').fontSize(6.3).text(it.note, x + 8, y + 43, { width: w - 16 });
  });
  y += h + 11;
}
function table(headers, rows, widths, aligns, opts) {
  opts = opts || {}; const rh = 19; ensure(rh * (rows.length + 1) + 6);
  let x = M; doc.rect(M, y, CW, rh).fill(C.orange);
  headers.forEach((hd, i) => { doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8).text(hd, x + 7, y + 6, { width: widths[i] - 12, align: aligns[i] }); x += widths[i]; });
  y += rh;
  rows.forEach((r, ri) => {
    const isTot = opts.totalRow && ri === rows.length - 1;
    doc.rect(M, y, CW, rh).fill(isTot ? C.tint : (ri % 2 ? '#FAFAFB' : C.white)); x = M;
    r.forEach((cell, i) => {
      doc.fillColor(i === r.length - 1 ? C.orangeDeep : C.ink).font(i === 0 || isTot ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.2)
        .text(String(cell), x + 7, y + 6, { width: widths[i] - 12, align: aligns[i] });
      x += widths[i];
    });
    y += rh;
  });
  doc.rect(M, y - rh * (rows.length + 1), CW, rh * (rows.length + 1)).lineWidth(0.7).strokeColor(C.line).stroke();
  y += 11;
}
function paragraph(txt, size) {
  size = size || 9.3; ensure(34); doc.fillColor(C.ink).font('Helvetica').fontSize(size).text(txt, M, y, { width: CW, align: 'justify' });
  y += doc.heightOfString(txt, { width: CW }) + 11;
}
function finding(area, sev, analise, diag, acoes) {
  const s = SEV[sev], pad = 12, innerW = CW - pad * 2 - 6;
  doc.font('Helvetica').fontSize(8.8);
  const hA = doc.heightOfString(analise, { width: innerW }), hD = doc.heightOfString(diag, { width: innerW });
  const at = acoes.map((a) => '•  ' + a); let hAc = 0; at.forEach((a) => hAc += doc.heightOfString(a, { width: innerW }) + 2);
  const lh = 13, total = 30 + (lh + hA + 7) + (lh + hD + 7) + (lh + hAc + 5) + 8; ensure(total + 9);
  const x0 = M;
  doc.roundedRect(x0, y, CW, total, 7).fill('#FCFCFD'); doc.roundedRect(x0, y, CW, total, 7).lineWidth(0.8).strokeColor(C.line).stroke();
  doc.rect(x0, y + 4, 4, total - 8).fill(s.color);
  let cy = y + 11;
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10.5).text(area, x0 + pad + 6, cy, { width: innerW - 95 });
  const chipW = doc.widthOfString(s.label, { fontSize: 7 }) + 16;
  doc.roundedRect(x0 + CW - chipW - pad, cy - 1, chipW, 14, 7).fill(s.color);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7).text(s.label, x0 + CW - chipW - pad, cy + 3, { width: chipW, align: 'center', characterSpacing: 0.4 });
  cy += 21;
  function block(label, txt, color) {
    doc.rect(x0 + pad + 6, cy + 1.5, 5, 5).fill(color);
    doc.fillColor(color).font('Helvetica-Bold').fontSize(7.3).text(label.toUpperCase(), x0 + pad + 16, cy, { characterSpacing: 0.4 });
    cy += lh; doc.fillColor(C.ink).font('Helvetica').fontSize(8.8).text(txt, x0 + pad + 6, cy, { width: innerW });
    cy += doc.heightOfString(txt, { width: innerW }) + 7;
  }
  block('Análise', analise, C.mute); block('Diagnóstico', diag, s.color);
  doc.rect(x0 + pad + 6, cy + 1.5, 5, 5).fill(C.green);
  doc.fillColor(C.green).font('Helvetica-Bold').fontSize(7.3).text('PLANO DE AÇÃO', x0 + pad + 16, cy, { characterSpacing: 0.4 }); cy += lh;
  at.forEach((a) => { doc.fillColor(C.ink).font('Helvetica').fontSize(8.8).text(a, x0 + pad + 6, cy, { width: innerW }); cy += doc.heightOfString(a, { width: innerW }) + 2; });
  y += total + 9;
}
function actionList(items) {
  items.forEach((it) => {
    const innerW = CW - 36; doc.font('Helvetica').fontSize(8.6);
    const hT = doc.heightOfString(it.t, { width: innerW - 70 }), hD = doc.heightOfString(it.d, { width: innerW });
    const h = Math.max(24, hT + hD + 12); ensure(h + 5);
    doc.circle(M + 11, y + 10, 10).fill(C.orange);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10).text(String(it.n), M + 1, y + 5, { width: 20, align: 'center' });
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9.3).text(it.t, M + 30, y + 1, { width: innerW - 70 });
    if (it.tag) { const tw = doc.widthOfString(it.tag, { fontSize: 6.5 }) + 12; doc.roundedRect(M + CW - tw, y + 1, tw, 12, 6).fill(C.tint); doc.fillColor(C.orangeDeep).font('Helvetica-Bold').fontSize(6.5).text(it.tag, M + CW - tw, y + 4, { width: tw, align: 'center' }); }
    doc.fillColor(C.mute).font('Helvetica').fontSize(8.4).text(it.d, M + 30, y + 2 + hT, { width: innerW });
    y += h + 5;
  });
}

// ============ CONTEÚDO ============
newPage();
sectionTitle('Sumário executivo', 'panorama da 3ª edição · 3 dias de campanha');
kpiRow([
  { label: 'Inscritos TBS', value: '653' },
  { label: 'Vendas TBSchool', value: '134', color: C.green },
  { label: 'Receita líquida TBSchool', value: brl(2410.72), color: C.green },
  { label: 'Investido em mídia', value: brl(1891.89) },
]);
kpiRow([
  { label: 'CPL médio (pago)', value: brl(5.02), note: 'investido / leads pagos' },
  { label: 'CPA tripwire (pago)', value: brl(37.10), note: 'por venda de mídia' },
  { label: 'Conclusão de checkout', value: '79,8%', note: '134 de 168' },
  { label: 'Acesso à plataforma', value: '~10%', color: C.red, note: '~68 de 653' },
]);
paragraph('Em 3 dias a campanha trouxe 653 inscritos e 134 vendas do tripwire The Best School (R$ 19,90), somando R$ 2.410,72 líquidos frente a R$ 1.891,89 investidos em mídia. Olhando só o tripwire, o retorno parece apertado — mas a receita real do funil está no pipeline high-ticket B2C (R$ 278 mil em deals históricos ligados a inscritos; R$ 202 mil em negociação ativa nesta campanha). O verdadeiro gargalo é a ATIVAÇÃO: ~90% dos inscritos ainda não acessaram a plataforma de candidatura. É a maior alavanca de resultado do momento.');

sectionTitle('1. Funil de candidatura', 'The Best Speaker · etapas na plataforma');
table(['Etapa', 'Contatos', '% do topo', 'Queda na etapa'],
  [['Inscrição confirmada', '653', '100%', '—'],
   ['Acessaram a plataforma', '~68', '10,4%', '-89,6%'],
   ['Cadastro completo', '~20', '3,1%', '-70,6%'],
   ['Análise de IA pronta', '~7', '1,1%', '-65,0%']],
  [220, 95, 95, 95.28], ['left', 'center', 'center', 'center']);
paragraph('O funil é saudável na entrada e na venda do tripwire, mas despenca no primeiro acesso à plataforma: de 653 inscritos, apenas ~68 entraram, ~20 completaram o cadastro e ~7 chegaram à análise de IA. Reduzir esse vazamento inicial multiplica todo o resto do funil.');

sectionTitle('2. Aquisição por canal', 'inscritos × vendas do TBSchool · taxa = vendas / inscritos');
table(['Canal', 'Inscritos', '% mix', 'Vendas', 'Conversão'],
  [['Social Pago (Meta)', '348', '53%', '50', '14,4%'],
   ['Email marketing', '94', '14%', '27', '28,7%'],
   ['Comunidade / Linktree', '87', '13%', '24', '27,6%'],
   ['Direto', '38', '6%', '11', '28,9%'],
   ['Social Orgânico', '34', '5%', '10', '29,4%'],
   ['Pesquisa Paga (Google)', '29', '4%', '1', '3,4%'],
   ['Busca Orgânica (SEO)', '13', '2%', '5', '38,5%'],
   ['Offline', '7', '1%', '1', '14,3%']],
  [165, 78, 60, 78, 124.28], ['left', 'center', 'center', 'center', 'center']);
paragraph('O Social Pago (Meta) sustenta o volume (53% dos inscritos) com conversão de 14%. Email, Direto, Social Orgânico e SEO convertem entre 29% e 38% — 2x a 3x mais. A Pesquisa Paga (Google) é o ponto fraco: 29 leads e 1 venda (3,4%), com o pior custo por lead.');

sectionTitle('3. Mídia paga: Meta vs Google', 'gasto · eficiência · retorno no tripwire');
table(['Plataforma', 'Gasto', 'Leads', 'CPL', 'Vendas', 'ROAS tripwire'],
  [['Meta Ads', brl(1183.91), '348', brl(3.40), '50', '0,76x'],
   ['Google Ads', brl(707.98), '29', brl(24.41), '1', '0,03x'],
   ['Total', brl(1891.89), '377', brl(5.02), '51', '0,48x']],
  [110, 95, 55, 80, 60, 105.28], ['left', 'right', 'center', 'right', 'center', 'center'], { totalRow: true });
paragraph('A Meta entrega leads a R$ 3,40 e converte 50 vendas no tripwire (ROAS 0,76x só no R$ 19,90). O Google custa R$ 24,41 por lead (7x mais caro) e gerou 1 venda — ineficiente no formato atual. Importante: ROAS de tripwire NÃO é o ROAS do negócio (ver seção 4).');

sectionTitle('4. Receita além do tripwire', 'pipeline high-ticket B2C ligado aos inscritos');
table(['Etapa do pipeline B2C', 'Negócios', 'Valor'],
  [['Em negociação', '4', brl(28997)],
   ['Negociação avançada', '5', brl(20491)],
   ['Aguardando pagamento', '17', brl(152982)],
   ['Pagamento realizado / Ganho', '4', brl(8504)],
   ['Pipeline total em aberto + realizado', '30', brl(210974)]],
  [240, 90, 175.28], ['left', 'center', 'right'], { totalRow: true });
paragraph('Aqui está o dinheiro de verdade: deals de R$ 3 mil a R$ 15 mil. Há R$ 202 mil em negociação/aguardando pagamento nesta campanha e R$ 8,5 mil já realizados — sem contar R$ 278 mil em vendas históricas ligadas a inscritos do TBS. Medir o ROAS da mídia só pelo tripwire de R$ 19,90 ESCONDE esse retorno e pode levar a cortar campanhas que se pagam (e muito) no funil completo.');

sectionTitle('5. The Best School · checkout', 'funil de compra do tripwire');
kpiRow([
  { label: 'Iniciaram checkout', value: '168' },
  { label: 'Finalizaram', value: '134', color: C.green },
  { label: 'Abandono', value: '~20%', color: C.amber },
  { label: 'Ticket líquido médio', value: brl(17.99) },
]);
paragraph('A conclusão de ~80% é saudável para um tripwire; o resíduo de ~20% de abandono é recuperável com automação de carrinho.');

sectionTitle('Diagnóstico priorizado', 'achados ordenados por severidade');
finding('Ativação na plataforma', 'critico',
  '653 inscritos, mas apenas ~68 (10%) acessaram a plataforma; ~20 completaram o cadastro e ~7 chegaram à análise de IA.',
  'Quase 90% param logo após a inscrição. É, de longe, o maior ponto de perda — e a maior oportunidade de crescimento sem gastar mais em mídia.',
  ['Régua imediata de CRM + WhatsApp para os ~585 inscritos sem acesso, com link direto e tutorial de “como participar”.',
   'Reduzir fricção do 1º acesso (login simples, lembrete de prazo, vídeo curto de onboarding).']);
finding('ROAS medido só pelo tripwire', 'critico',
  'Investido R$ 1.891,89; ROAS aparente de 0,48x considerando só as vendas de R$ 19,90 atribuídas à mídia.',
  'O cálculo ignora R$ 202 mil em pipeline B2C ativo e R$ 8,5 mil já realizados nesta campanha. Decidir corte de verba pelo tripwire é uma leitura enganosa do retorno real.',
  ['Adotar ROAS de funil completo (tripwire + produto principal) como métrica oficial de decisão.',
   'Avaliar campanha de topo por CPL e avanço de etapa, não pelo retorno imediato de R$ 19,90.']);
finding('Eficiência por canal', 'oportunidade',
  'Email (28,7%), Social Orgânico (29,4%), Direto (28,9%) e SEO (38,5%) convertem muito acima do Social Pago (14,4%); Pesquisa Paga converte só 3,4% a R$ 24,41/lead.',
  'Há verba indo para o canal pago de menor qualidade (Google) enquanto canais orgânicos de altíssima conversão estão subexplorados.',
  ['Revisar/realocar verba de Pesquisa Paga (palavras-chave, intenção, página de destino).',
   'Escalar Email, SEO e Social Orgânico com mais conteúdo, frequência e captação de base.']);
finding('Checkout do The Best School', 'ok',
  '168 iniciaram e 134 concluíram (79,8%); ~20% abandonam o carrinho.',
  'Taxa saudável para tripwire; o abandono é recuperável.',
  ['Recuperação automática de carrinho (e-mail/WhatsApp) em até 1h.',
   'Testar checkout em passo único + prova social/urgência na página de pagamento.']);

sectionTitle('Plano de ação consolidado', 'priorizado por impacto x esforço');
actionList([
  { n: 1, t: 'Ativar os ~585 inscritos que não acessaram a plataforma', tag: 'MAIOR IMPACTO', d: 'Régua CRM + WhatsApp com link direto e tutorial. Multiplica cadastro, vídeos e vendas sem custo de mídia adicional.' },
  { n: 2, t: 'Trocar o ROAS de tripwire pelo ROAS de funil completo', tag: 'DECISÃO', d: 'Integrar a receita do pipeline B2C (R$ 202k ativos) ao cálculo antes de qualquer corte de verba de mídia.' },
  { n: 3, t: 'Revisar / realocar a verba de Pesquisa Paga (Google)', tag: 'EFICIÊNCIA', d: 'CPL de R$ 24,41 e 3,4% de conversão. Corrigir intenção/keywords ou migrar verba para Meta e canais orgânicos.' },
  { n: 4, t: 'Escalar Email, SEO e Social Orgânico', tag: 'CRESCIMENTO', d: 'Canais com 29%–38% de conversão e custo baixo. Mais conteúdo, frequência e nutrição da base instalada.' },
  { n: 5, t: 'Recuperação de carrinho do The Best School', tag: 'QUICK WIN', d: 'Automação para os ~20% que abandonam o checkout — receita incremental imediata.' },
  { n: 6, t: 'Padronizar UTM e re-mapear etapas no dashboard', tag: 'DADOS', d: 'Garantir origem rastreada em todos os links e atualizar o funil para os novos estágios da plataforma.' },
]);

// rodapé
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  doc.fillColor(C.mute).font('Helvetica').fontSize(7.5).text('TBS 2026 · Relatório Gerencial · dados ao vivo (HubSpot, Meta Ads, Google Ads)', M, BOTTOM + 20, { width: CW - 30 });
  doc.fillColor(C.mute).font('Helvetica-Bold').fontSize(8).text(String(i + 1), PAGE_W - M - 20, BOTTOM + 19, { width: 20, align: 'right' });
}
doc.end();
console.log('PDF gerado: ' + OUT);
