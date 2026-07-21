import fs from 'node:fs';
import PDFDocument from 'pdfkit';

const aggClose = JSON.parse(fs.readFileSync(new URL('./_agg.json', import.meta.url), 'utf8'));
const aggEvent = JSON.parse(fs.readFileSync(new URL('./_agg_event.json', import.meta.url), 'utf8'));

const outPath = new URL('./PSA_Temas_Palestras_Jun-Ago_2025.pdf', import.meta.url);
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'PSA — Macro e Micro Temas de Palestras | jun-ago 2025',
    Author: 'Growth / MKT OPS — PSA',
    Subject: 'Ranking de macro e micro temas com visões por venda e por realização',
  },
});
doc.pipe(fs.createWriteStream(outPath));

const COLORS = {
  primary: '#1F2937',
  accent: '#0E7490',
  secondary: '#9333EA',
  muted: '#6B7280',
  light: '#F3F4F6',
  border: '#D1D5DB',
  highlight: '#FEF3C7',
  green: '#059669',
};
const fmtBRL = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
const pageW = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;

function hr(color = COLORS.border) {
  const y = doc.y;
  doc.save().strokeColor(color).lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke().restore();
  doc.moveDown(0.5);
}
function h1(text) { doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(20).text(text); doc.moveDown(0.2); }
function h2(text, color = COLORS.accent) { doc.moveDown(0.5); doc.fillColor(color).font('Helvetica-Bold').fontSize(14).text(text); doc.moveDown(0.3); }
function h3(text) { doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11).text(text); doc.moveDown(0.2); }
function muted(text, opts = {}) { doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9).text(text, opts); }

function drawTable({ columns, rows, headerFill = COLORS.accent, headerColor = '#FFFFFF', altRowFill = COLORS.light, fontSize = 9, rowHeight = 16 }) {
  const startX = doc.page.margins.left;
  let y = doc.y;
  const totalW = pageW();
  const widths = columns.map(c => c.width * totalW);

  doc.save().rect(startX, y, totalW, rowHeight).fill(headerFill).restore();
  let x = startX;
  doc.fillColor(headerColor).font('Helvetica-Bold').fontSize(fontSize);
  columns.forEach((col, i) => {
    doc.text(col.label, x + 4, y + 4, { width: widths[i] - 8, align: col.align || 'left' });
    x += widths[i];
  });
  y += rowHeight;

  doc.font('Helvetica').fontSize(fontSize).fillColor(COLORS.primary);
  rows.forEach((row, ri) => {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.y;
    }
    if (ri % 2 === 1) {
      doc.save().rect(startX, y, totalW, rowHeight).fill(altRowFill).restore();
      doc.fillColor(COLORS.primary);
    }
    x = startX;
    columns.forEach((col, i) => {
      const val = col.format ? col.format(row) : String(row[col.key] ?? '');
      doc.text(val, x + 4, y + 4, { width: widths[i] - 8, align: col.align || 'left' });
      x += widths[i];
    });
    y += rowHeight;
  });
  doc.y = y + 4;
}

function contextBox(lines, height = 78) {
  doc.save().rect(doc.page.margins.left, doc.y, pageW(), height).fill(COLORS.light).restore();
  const boxY = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary);
  lines.forEach((l, i) => doc.text(l, doc.page.margins.left + 10, boxY + 10 + i * 12, { width: pageW() - 20 }));
  doc.y = boxY + height + 4;
  doc.moveDown(0.3);
}

// ====================== COVER ======================
h1('PSA — Macro e Micro Temas de Palestras');
doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11).text('Janela: junho a agosto de 2025 | base: HubSpot deals');
doc.moveDown(0.4);
hr();

doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11).text('Duas visões neste relatório');
doc.moveDown(0.2);
contextBox([
  `1) VENDA NO TRIMESTRE (closedate jun-ago/2025): ${aggClose.totalDealsWithMicro} palestras vendidas · ${fmtBRL(aggClose.totalRevenue)} de receita. Mede esforço comercial.`,
  `2) PALCO NO TRIMESTRE (data_do_evento__ganho_ jun-ago/2025): ${aggEvent.totalDeals} palestras realizadas · ${fmtBRL(aggEvent.totalRevenue)} de receita. Mede o que aconteceu no palco.`,
  `As visões diferem porque há lead time entre venda e evento. As duas são apresentadas lado a lado para comparação.`,
  `Filtro aplicado em ambas: pipeline de eventos (stage 1076664462) com hs_is_closed_won = true e micro_tema preenchido.`,
], 78);

// ====================== VISÃO 1: PALCO ======================
h2('Visão 1 — Palestras realizadas no trimestre (por data do evento)', COLORS.green);
muted(`Base: ${aggEvent.totalDeals} deals com data_do_evento__ganho_ entre jun-ago/2025. ${aggEvent.uniqueMicros} micro temas únicos.`);
doc.moveDown(0.3);

h3('Macro Temas');
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Macro Tema', key: 'tema', width: 0.50 },
    { label: 'Palestras', key: 'count', width: 0.13, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'Ticket médio', key: 'tm', width: 0.12, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggEvent.macroByCount.map((r, i) => ({ ...r, rank: i + 1 })),
  headerFill: COLORS.green,
});

doc.addPage();
h2('Visão 1 — Top 20 Micro Temas (por palco)', COLORS.green);
muted('Ranking por volume. Coluna receita à direita para leitura cruzada.');
doc.moveDown(0.3);
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Palestras', key: 'count', width: 0.13, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'TM', key: 'tm', width: 0.07, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggEvent.microByCount.map((r, i) => ({ ...r, rank: i + 1 })),
  headerFill: COLORS.green,
});

doc.moveDown(0.5);
h3('Mesmo set, ordenado por receita');
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'Palestras', key: 'count', width: 0.13, align: 'right' },
    { label: 'TM', key: 'tm', width: 0.07, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggEvent.microByAmount.map((r, i) => ({ ...r, rank: i + 1 })),
  headerFill: COLORS.green,
});

// ====================== VISÃO 2: VENDA ======================
doc.addPage();
h2('Visão 2 — Palestras vendidas no trimestre (por closedate)', COLORS.accent);
muted(`Base: ${aggClose.totalDealsWithMicro} deals com closedate entre jun-ago/2025. Mede esforço comercial — pode incluir palestras que acontecerão depois.`);
doc.moveDown(0.3);

h3('Macro Temas');
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Macro Tema', key: 'tema', width: 0.50 },
    { label: 'Deals', key: 'count', width: 0.13, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'Ticket médio', key: 'tm', width: 0.12, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggClose.macroByCount.map((r, i) => ({ ...r, rank: i + 1 })),
});

doc.addPage();
h2('Visão 2 — Top 20 Micro Temas (por venda)', COLORS.accent);
doc.moveDown(0.3);
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Deals', key: 'count', width: 0.13, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'TM', key: 'tm', width: 0.07, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggClose.microByCount.map((r, i) => ({ ...r, rank: i + 1 })),
});

doc.moveDown(0.5);
h3('Mesmo set, ordenado por receita');
drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: r => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: r => fmtBRL(r.sumAmount) },
    { label: 'Deals', key: 'count', width: 0.13, align: 'right' },
    { label: 'TM', key: 'tm', width: 0.07, align: 'right', format: r => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: aggClose.microByAmount.map((r, i) => ({ ...r, rank: i + 1 })),
});

// ====================== INSIGHTS ======================
doc.addPage();
h2('Insights — comparando venda vs palco');

const insights = [
  ['Motivação domina nos dois cortes.', '43 palestras no palco · 19 vendidas no trimestre. É o macro tema-bandeira da casa. Inspiração + Engajamento (12.2 + 12.3) sozinhos respondem por ~28% das palestras realizadas.'],
  ['Comunicação é invisível pelo closedate.', 'Macro tema "Comunicação" tem 19 palestras no palco mas 0 vendas no trimestre — tudo foi vendido antes de junho. O micro "9.8 Marketing" sobe ao 2º lugar geral por palco (17 deals, R$ 115k) mas não aparece no ranking de venda.'],
  ['Datas Comemorativas (SIPAT) tem ticket gigante.', '4 palestras realizadas no palco somam R$ 211k — ticket médio ~R$ 53k. Provavelmente Junho Vermelho/Julho Amarelo/Agosto Dourado puxando contratos grandes. Vale ter trilha dedicada de palestrantes para o calendário de conscientização.'],
  ['Futurismo cresce 7× na visão palco.', '1 deal vendido vs 7 realizados — confirma que pauta de futuro/IA é vendida no início do ano para realização no meio. Antecipa o ciclo comercial.'],
  ['Inovação puxa receita por palco.', '22 palestras realizadas, R$ 248k, ticket médio R$ 11k. Vendas (5 deals) tem ticket maior (R$ 15k médio) mas volume baixo.'],
  ['"18. OUTROS" continua problemático.', '21 palestras no palco e R$ 410k — 2º maior em receita, só porque é catch-all. Os micros desses revelam Negócios, Comunicação Interna, IA, Direito Eleitoral, Comércio Exterior. Re-tag urgente para limpar o leitura por macro.'],
];
insights.forEach(([title, text]) => {
  doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(10).text('• ' + title);
  doc.fillColor(COLORS.primary).font('Helvetica').fontSize(10).text('   ' + text);
  doc.moveDown(0.4);
});

doc.moveDown(0.5);
h2('Caveats metodológicos', COLORS.muted);
const caveats = [
  '1. Filtro: dealstage = 1076664462 ("Negócio fechado" no pipeline de eventos) + hs_is_closed_won = true + micro_tema preenchido. Outros pipelines closedwon (1105295876 = contratação de palestrante; 1060874756 = checkout digital) foram excluídos.',
  '2. Propriedade canônica de data do evento: data_do_evento__ganho_ (label HubSpot: "Data do Evento (GANHO)"). A propriedade data_evento ("Data prevista do evento") está vazia para deals já fechados — usar apenas a versão GANHO.',
  '3. Cobertura de tagueamento: ~77-86% dos deals do pipeline de eventos têm macro/micro tema preenchido. Os deals sem tema (~14-23%) não entram em nenhum ranking.',
  '4. ~48% dos deals têm macro_tema e micro_tema de famílias numéricas diferentes (ex: macro="LIDERANÇA" mas micro="12.3 Engajamento"). Recomendação: trabalhar com micro_tema agrupado em vez de confiar em macro_tema.',
  '5. Alguns deals com amount próximo de zero (R$ 0,01, R$ 0) foram mantidos pois aparecem como wons reais — provavelmente lançamentos parciais/teste que precisam de housekeeping.',
];
caveats.forEach(c => {
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(c, { paragraphGap: 4 });
});

doc.moveDown(1);
hr();
doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(8)
  .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Fonte: HubSpot · Portal 49656171`, { align: 'center' });

doc.end();
console.log('PDF gerado em:', outPath.pathname);
