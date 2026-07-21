import fs from 'node:fs';
import PDFDocument from 'pdfkit';

const agg = JSON.parse(fs.readFileSync(new URL('./_agg.json', import.meta.url), 'utf8'));

const outPath = new URL('./PSA_Macro_Micro_Temas_Jun-Ago_2025.pdf', import.meta.url);
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'PSA — Macro e Micro Temas Vendidos | jun-ago 2025',
    Author: 'Growth/MKT OPS PSA',
    Subject: 'Análise de macro e micro temas de palestras vendidas Q3 2025',
  },
});
doc.pipe(fs.createWriteStream(outPath));

const COLORS = {
  primary: '#1F2937',
  accent: '#0E7490',
  muted: '#6B7280',
  light: '#F3F4F6',
  border: '#D1D5DB',
  highlight: '#FEF3C7',
};

const fmtBRL = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

function hr(color = COLORS.border) {
  const y = doc.y;
  doc.save().strokeColor(color).lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke().restore();
  doc.moveDown(0.5);
}

function h1(text) {
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(20).text(text);
  doc.moveDown(0.2);
}
function h2(text) {
  doc.moveDown(0.5);
  doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.3);
}
function body(text, opts = {}) {
  doc.fillColor(COLORS.primary).font('Helvetica').fontSize(10).text(text, opts);
}
function muted(text, opts = {}) {
  doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(9).text(text, opts);
}

// Table renderer
function drawTable({ columns, rows, headerFill = COLORS.accent, headerColor = '#FFFFFF', altRowFill = COLORS.light, fontSize = 9, rowHeight = 16 }) {
  const startX = doc.page.margins.left;
  let y = doc.y;
  const totalW = pageW;
  const widths = columns.map(c => c.width * totalW);

  // Header
  doc.save().rect(startX, y, totalW, rowHeight).fill(headerFill).restore();
  let x = startX;
  doc.fillColor(headerColor).font('Helvetica-Bold').fontSize(fontSize);
  columns.forEach((col, i) => {
    doc.text(col.label, x + 4, y + 4, { width: widths[i] - 8, align: col.align || 'left' });
    x += widths[i];
  });
  y += rowHeight;

  // Rows
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

// ============ COVER / HEADER ============
h1('PSA — Macro e Micro Temas Vendidos');
doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11).text('Palestras vendidas (closed-won) | janela: jun-ago 2025');
doc.moveDown(0.5);
hr();

// Context box
doc.save().rect(doc.page.margins.left, doc.y, pageW, 70).fill(COLORS.light).restore();
const boxY = doc.y;
doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10).text('Contexto', doc.page.margins.left + 10, boxY + 8);
doc.font('Helvetica').fontSize(9).fillColor(COLORS.primary);
const ctxLines = [
  `• Universo: 256 deals closed-won com closedate entre ${agg.windowStart} e ${agg.windowEnd}.`,
  `• Após filtro pelo pipeline de eventos/palestras (stage 1076664462) com macro/micro tema preenchidos: ${agg.totalDealsWithMicro} deals.`,
  `• Receita agregada nesta amostra: ${fmtBRL(agg.totalRevenue)}.`,
  `• Os outros 177 deals estão em pipelines de contratação de palestrante / checkout digital e não foram considerados aqui.`,
];
ctxLines.forEach((l, i) => doc.text(l, doc.page.margins.left + 10, boxY + 22 + i * 11, { width: pageW - 20 }));
doc.y = boxY + 78;
doc.moveDown(0.5);

// ============ MACRO TEMAS ============
h2('Macro Temas — ranking por volume e receita');
muted(`Base: ${agg.totalDealsWithMicro} deals com macro_tema preenchido no pipeline de eventos.`);
doc.moveDown(0.3);

drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: (r) => r.rank },
    { label: 'Macro Tema', key: 'tema', width: 0.50 },
    { label: 'Deals', key: 'count', width: 0.10, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: (r) => fmtBRL(r.sumAmount) },
    { label: 'Ticket médio', key: 'tm', width: 0.15, align: 'right', format: (r) => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: agg.macroByCount.map((r, i) => ({ ...r, rank: i + 1 })),
});

doc.moveDown(0.5);
muted('Leitura: Motivação domina em volume e receita. Liderança + Gestão de Pessoas + Vendas + Inovação somam o miolo corporativo. "Outros" é bucket de não-classificado-fino — ver caveats.');

doc.addPage();

// ============ MICRO TEMAS ============
h2('Top 20 Micro Temas — por volume');
muted(`Base: ${agg.totalDealsWithMicro} deals com micro_tema preenchido. Total de micro temas únicos no período: 41.`);
doc.moveDown(0.3);

drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: (r) => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Deals', key: 'count', width: 0.10, align: 'right' },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: (r) => fmtBRL(r.sumAmount) },
    { label: 'TM', key: 'tm', width: 0.10, align: 'right', format: (r) => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: agg.microByCount.map((r, i) => ({ ...r, rank: i + 1 })),
});

doc.addPage();
h2('Top 20 Micro Temas — por receita');
muted('Reordenando o mesmo conjunto pela soma de R$. Mostra onde o ticket alto puxa a receita mesmo com baixo volume.');
doc.moveDown(0.3);

drawTable({
  columns: [
    { label: '#', key: 'rank', width: 0.05, align: 'right', format: (r) => r.rank },
    { label: 'Micro Tema', key: 'tema', width: 0.55 },
    { label: 'Receita', key: 'amount', width: 0.20, align: 'right', format: (r) => fmtBRL(r.sumAmount) },
    { label: 'Deals', key: 'count', width: 0.10, align: 'right' },
    { label: 'TM', key: 'tm', width: 0.10, align: 'right', format: (r) => fmtBRL(r.sumAmount / r.count) },
  ],
  rows: agg.microByAmount.map((r, i) => ({ ...r, rank: i + 1 })),
});

doc.addPage();

// ============ INSIGHTS ============
h2('Insights');
const insights = [
  ['Inspiração + Engajamento concentram tração.', '13 + 11 = 24 deals (30% da base de palestras vendidas no trimestre) e ~R$ 217k de receita combinada. São os micro temas-bandeira de Motivação.'],
  ['IA e Saúde Mental empatam em volume (4 deals cada).', 'IA puxa mais receita (R$ 24k vs R$ 20k). São tópicos de demanda emergente — vale priorizar acervo de palestrantes nesses dois.'],
  ['Caudas com 1 deal mas ticket alto.', '"Gestão de Equipes" (R$ 48,5k), "Economia Criativa" (R$ 22,5k), "Mercado" (R$ 20k) — eventos pontuais grandes que não viram série. Verificar se o cliente tem potencial recorrente.'],
  ['Macro vs Micro desalinhados.', `${agg.misalignedCount} dos ${agg.misalignedCount + agg.alignedCount} deals (~48%) têm micro_tema de uma família diferente do macro_tema escolhido (ex: macro="LIDERANÇA" mas micro="12.3 Engajamento"). Isso reduz a confiabilidade dos agregados por macro — pessoas de comercial estão escolhendo o micro mais "fino" mesmo cruzando categorias.`],
  ['"18. OUTROS" como macro é problemático.', '15 deals (~19% da amostra), R$ 161k. É o 2º macrotema em receita só porque é catch-all. O micro_tema desses revela: Negócios (R$ 42,5k Sicoob), Comunicação Interna (R$ 50,5k TOTVS), IA, Direito Eleitoral, Comércio Exterior. Precisa de re-tag.'],
];
insights.forEach(([title, text]) => {
  doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(10).text('• ' + title);
  doc.fillColor(COLORS.primary).font('Helvetica').fontSize(10).text('   ' + text);
  doc.moveDown(0.4);
});

doc.moveDown(0.5);
h2('Caveats metodológicos');
const caveats = [
  '1. "Vendido" = closedate na janela + hs_is_closed_won = true. Não considera data do evento — uma palestra vendida em ago/2025 pode ocorrer só em 2026.',
  '2. Pipeline considerado: stage 1076664462 ("Negócio fechado") por ser o que tem macro/micro tema populados. Outros stages closedwon (1105295876, 1060874756) são contratação de palestrante e checkout — natureza diferente, fora desta análise.',
  '3. 21 deals do pipeline de eventos no período NÃO têm macro_tema preenchido — análise cobre ~79% do volume real de palestras vendidas. Macro temas reais podem ser ligeiramente diferentes.',
  '4. ~48% dos deals têm macro_tema e micro_tema de famílias numéricas diferentes. Recomenda-se padronizar o input no HubSpot (ou ignorar macro_tema e trabalhar só com micro_tema agrupado).',
  '5. Alguns deals com amount < R$ 100 (5 no total) foram mantidos pois aparecem como wons reais — provavelmente deals zerados/teste que precisam de housekeeping.',
];
caveats.forEach(c => {
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(c, { paragraphGap: 4 });
});

doc.moveDown(1);
hr();
doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(8)
  .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Fonte: HubSpot deals · Portal 49656171`, { align: 'center' });

doc.end();
console.log('PDF gerado em:', outPath.pathname);
