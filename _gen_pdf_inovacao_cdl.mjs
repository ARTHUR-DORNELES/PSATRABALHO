import fs from 'node:fs';
import PDFDocument from 'pdfkit';

const outPath = new URL('./PSA_Pesquisa_Inovacao_CDL_Respostas.pdf', import.meta.url);
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  info: {
    Title: 'PSA — Pesquisa Inovação | CDL — Compilação',
    Author: 'Growth / MKT OPS — PSA',
    Subject: '6 submissões dos formulários Inovação | CDL (HubSpot)',
  },
});
doc.pipe(fs.createWriteStream(outPath));

// Paleta PSA
const PSA = {
  orange: '#FF5E1A',
  orangeDeep: '#D94A0F',
  orangeWash: '#FFE9DD',
  navy: '#1A2BD8',
  ink: '#0B1226',
  inkSoft: '#1E2742',
  paper: '#FAFAFA',
  line: '#E5E7EB',
  lineSoft: '#F3F4F6',
  white: '#FFFFFF',
  muted: '#6B7280',
  mutedLight: '#9CA3AF',
};

const PAD = 36; // padding lateral "manual" (margens 0 no doc)
const W = doc.page.width;
const H = doc.page.height;
const contentW = W - PAD * 2;

// ===================== HERO BAND =====================
const heroH = 78;
doc.save().rect(0, 0, W, heroH).fill(PSA.ink).restore();
// barra laranja inferior do hero
doc.save().rect(0, heroH, W, 4).fill(PSA.orange).restore();

// Eyebrow
doc.fillColor(PSA.orange).font('Helvetica-Bold').fontSize(8)
  .text('GROWTH / MKT OPS  ·  RELATÓRIO DE PESQUISA', PAD, 18, { width: contentW, characterSpacing: 1.2 });
// Title
doc.fillColor(PSA.white).font('Helvetica-Bold').fontSize(20)
  .text('PSA — Pesquisa Inovação | CDL', PAD, 30, { width: contentW });
// Subtitle
doc.fillColor('#C7CCDB').font('Helvetica').fontSize(9)
  .text('Compilação de respostas  ·  6 submissões  ·  janela 18/05 a 27/05/2026  ·  fonte: HubSpot Forms (portal 49656171)',
    PAD, 56, { width: contentW });

let cursorY = heroH + 4 + 18;

// ===================== KPI STRIP =====================
function kpiCard(x, y, w, h, { label, value, sub, accent }) {
  // Card branco com borda fina
  doc.save().rect(x, y, w, h).fill(PSA.white).restore();
  doc.save().rect(x, y, w, h).lineWidth(0.5).strokeColor(PSA.line).stroke().restore();
  // Barra lateral colorida
  doc.save().rect(x, y, 3, h).fill(accent || PSA.orange).restore();

  // Label (em cima) — single-line garantido
  doc.fillColor(PSA.muted).font('Helvetica-Bold').fontSize(6.2)
    .text(label.toUpperCase(), x + 10, y + 8, { width: w - 14, characterSpacing: 0.4, lineBreak: false });
  // Value
  doc.fillColor(PSA.ink).font('Helvetica-Bold').fontSize(13)
    .text(value, x + 10, y + 20, { width: w - 14, lineBreak: false });
  // Sub
  if (sub) {
    doc.fillColor(PSA.mutedLight).font('Helvetica').fontSize(6.5)
      .text(sub, x + 10, y + 39, { width: w - 14, lineBreak: false, ellipsis: true });
  }
}

const kpis = [
  { label: 'Submissões', value: '6', sub: '18/05 a 27/05', accent: PSA.navy },
  { label: 'Média / mês', value: 'R$ 106,65', sub: 'média aritmética', accent: PSA.orange },
  { label: 'Mediana / mês', value: 'R$ 69,95', sub: 'metade <= isso', accent: PSA.orange },
  { label: 'Dor principal', value: '50%', sub: 'orçamento', accent: PSA.navy },
  { label: 'Palestrantes', value: '3 / 4', sub: 'dos que disseram', accent: PSA.navy },
  { label: 'Amplitude R$', value: '0 a 399', sub: 'menor / maior', accent: PSA.orange },
];

const kpiH = 56;
const kpiGap = 6;
const kpiW = (contentW - kpiGap * (kpis.length - 1)) / kpis.length;
kpis.forEach((k, i) => {
  kpiCard(PAD + i * (kpiW + kpiGap), cursorY, kpiW, kpiH, k);
});
cursorY += kpiH + 18;

// ===================== TÍTULO DA TABELA =====================
doc.fillColor(PSA.ink).font('Helvetica-Bold').fontSize(11)
  .text('RESPOSTAS POR PARTICIPANTE', PAD, cursorY, { width: contentW, characterSpacing: 0.6 });
// underline laranja curto
doc.save().rect(PAD, cursorY + 16, 32, 2.5).fill(PSA.orange).restore();
cursorY += 24;

// ===================== TABELA =====================
const respondentes = [
  {
    n: 1,
    quem: 'Danielle  ·  ABRAPP',
    email: 'danielle@abrapp.org.br',
    uf: 'SP',
    pagaria: 'R$ 49,90',
    contrata: '(boolean*)',
    dificuldade: 'Falta de opções dentro do orçamento',
    atua: '—',
    oQue: 'Área de interesse, cachê, disponibilidade',
    hot: false,
  },
  {
    n: 2,
    quem: 'Fabio  ·  AMPE-MT',
    email: 'ampe@ampe-mt.org',
    uf: 'MT',
    pagaria: 'R$ 1,00',
    contrata: 'Busca em redes sociais',
    dificuldade: 'Encontrar bons palestrantes por tema',
    atua: 'Não',
    oQue: 'Valor acessível',
    hot: false,
  },
  {
    n: 3,
    quem: 'aciccolorado',
    email: 'aciccolorado@yahoo.com.br',
    uf: 'PR',
    pagaria: 'R$ 100,00',
    contrata: 'Outra',
    dificuldade: 'Falta de opções dentro do orçamento',
    atua: '—',
    oQue: 'Não sei dizer',
    hot: false,
  },
  {
    n: 4,
    quem: 'carlosavilafilho40',
    email: 'carlosavilafilho40@gmail.com',
    uf: 'RS',
    pagaria: 'R$ 0,00',
    contrata: 'Já tenho base própria',
    dificuldade: 'Falta de opções dentro do orçamento',
    atua: '—',
    oQue: 'Não pagaria por algo que já tenho.',
    hot: false,
  },
  {
    n: 5,
    quem: 'Daniel  ·  Bahia Bahia',
    email: 'daniel@bahiabahia.com.br',
    uf: 'BA',
    pagaria: 'R$ 399,00',
    contrata: '(boolean*)',
    dificuldade: 'Encontrar bons palestrantes por tema',
    atua: 'Sim',
    oQue: 'Curadoria e comissão recorrente para indicar outros palestrantes e também ser um ponto de tração para palestrantes baianos terem acesso com mais facilidade tendo meu portal como canalizador de player.',
    hot: true, // lead quente — destacar
  },
  {
    n: 6,
    quem: 'Janaina Oliveira Barros',
    email: 'janainabarrosseabra@gmail.com',
    uf: 'BA/SP',
    pagaria: 'R$ 90,00',
    contrata: '(boolean*)',
    dificuldade: 'Não tem problema no processo',
    atua: 'Sim',
    oQue: 'Biografia clara e que retrata a experiência para além do currículo',
    hot: false,
  },
];

const cols = [
  { label: '#', key: 'n', w: 0.030, align: 'center' },
  { label: 'Participante', key: 'quem', w: 0.180 },
  { label: 'UF', key: 'uf', w: 0.060, align: 'center' },
  { label: 'Pagaria', key: 'pagaria', w: 0.105, align: 'right' },
  { label: 'Contrata hoje', key: 'contrata', w: 0.100 },
  { label: 'Maior dificuldade', key: 'dificuldade', w: 0.125 },
  { label: 'Atua?', key: 'atua', w: 0.070, align: 'center' },
  { label: 'O que precisaria existir na plataforma', key: 'oQue', w: 0.330 },
];

const padCell = 5;
const fontSizeBody = 7.8;
const lineGap = 1.2;
const widths = cols.map(c => c.w * contentW);

// Header
const headerH = 22;
doc.save().rect(PAD, cursorY, contentW, headerH).fill(PSA.ink).restore();
// linha laranja embaixo do header
doc.save().rect(PAD, cursorY + headerH, contentW, 1.5).fill(PSA.orange).restore();

let xH = PAD;
doc.fillColor(PSA.white).font('Helvetica-Bold').fontSize(7.2);
cols.forEach((c, i) => {
  doc.text(c.label.toUpperCase(), xH + padCell, cursorY + 8, {
    width: widths[i] - padCell * 2,
    align: c.align || 'left',
    characterSpacing: 0.2,
    lineBreak: false,
    ellipsis: true,
  });
  xH += widths[i];
});
cursorY += headerH + 1.5;

// Rows
respondentes.forEach((row, ri) => {
  // Altura dinâmica
  doc.font('Helvetica').fontSize(fontSizeBody);
  let rowH = 0;
  cols.forEach((c, i) => {
    let val = String(row[c.key] ?? '');
    if (c.key === 'quem') val = `${row.quem}\n${row.email}`;
    const h = doc.heightOfString(val, { width: widths[i] - padCell * 2, lineGap });
    if (h > rowH) rowH = h;
  });
  rowH += padCell * 2;

  // Fundo: hot rows com wash laranja, alternadas em cinza claro, base branca
  if (row.hot) {
    doc.save().rect(PAD, cursorY, contentW, rowH).fill(PSA.orangeWash).restore();
    doc.save().rect(PAD, cursorY, 2.5, rowH).fill(PSA.orange).restore();
  } else if (ri % 2 === 1) {
    doc.save().rect(PAD, cursorY, contentW, rowH).fill(PSA.lineSoft).restore();
  }

  let xR = PAD;
  cols.forEach((c, i) => {
    if (c.key === 'quem') {
      // duas linhas: nome em negrito + email muted
      doc.fillColor(PSA.ink).font('Helvetica-Bold').fontSize(fontSizeBody)
        .text(row.quem, xR + padCell, cursorY + padCell, {
          width: widths[i] - padCell * 2, lineGap, align: c.align || 'left',
        });
      doc.fillColor(PSA.muted).font('Helvetica').fontSize(fontSizeBody - 0.5)
        .text(row.email, xR + padCell, doc.y, {
          width: widths[i] - padCell * 2, lineGap,
        });
    } else if (c.key === 'pagaria') {
      const val = String(row[c.key] ?? '');
      // valor em negrito laranja
      doc.fillColor(row.hot ? PSA.orangeDeep : PSA.ink).font('Helvetica-Bold').fontSize(fontSizeBody)
        .text(val, xR + padCell, cursorY + padCell, {
          width: widths[i] - padCell * 2, lineGap, align: c.align || 'left',
        });
    } else if (c.key === 'atua') {
      const val = String(row[c.key] ?? '');
      const color = val === 'Sim' ? PSA.navy : val === 'Não' ? PSA.muted : PSA.mutedLight;
      doc.fillColor(color).font('Helvetica-Bold').fontSize(fontSizeBody)
        .text(val, xR + padCell, cursorY + padCell, {
          width: widths[i] - padCell * 2, lineGap, align: c.align || 'left',
        });
    } else {
      const val = String(row[c.key] ?? '');
      doc.fillColor(PSA.ink).font('Helvetica').fontSize(fontSizeBody)
        .text(val, xR + padCell, cursorY + padCell, {
          width: widths[i] - padCell * 2, lineGap, align: c.align || 'left',
        });
    }
    xR += widths[i];
  });

  // linha inferior
  doc.save().strokeColor(PSA.line).lineWidth(0.25)
    .moveTo(PAD, cursorY + rowH).lineTo(PAD + contentW, cursorY + rowH).stroke().restore();

  cursorY += rowH;
});

cursorY += 6;
doc.fillColor(PSA.muted).font('Helvetica-Oblique').fontSize(6.8)
  .text('(boolean*) — campo "Como contrata palestrantes hoje" gravado como "true" em 3 contatos (resquício de versão antiga do formulário). Recomenda-se normalizar no HubSpot. Linha destacada em laranja indica lead quente identificado.',
    PAD, cursorY, { width: contentW });
cursorY += 18;

// ===================== INSIGHTS =====================
doc.fillColor(PSA.ink).font('Helvetica-Bold').fontSize(11)
  .text('INSIGHTS & RECOMENDAÇÕES', PAD, cursorY, { width: contentW, characterSpacing: 0.6 });
doc.save().rect(PAD, cursorY + 16, 32, 2.5).fill(PSA.orange).restore();
cursorY += 24;

const insights = [
  {
    title: 'Orçamento é a principal dor — não a curadoria.',
    body: '50% das respostas apontam "Falta de opções dentro do orçamento". Alavanca de valor: faixas de cachê transparentes, acervo acessível, palestrantes regionais.',
  },
  {
    title: 'Disposição a pagar polarizada (R$ 0 a R$ 399).',
    body: 'Cluster do meio entre R$ 49,90 e R$ 100 — viável para plano básico. R$ 0 e R$ 1 já têm base própria ou não enxergam valor.',
  },
  {
    title: 'Pedidos concretos de produto.',
    body: 'Cachê + disponibilidade + área de interesse (Danielle); biografia clara além do currículo (Janaina); curadoria + comissão recorrente (Daniel). Backlog de MVP.',
  },
  {
    title: 'Lead quente — Daniel (Bahia Bahia).',
    body: 'Customer PSA, DECISION_MAKER, 3 deals, predictive score "closed_won", pediu papel de canalizador regional. Follow-up comercial imediato.',
  },
  {
    title: 'Dois perfis misturados sob o mesmo form.',
    body: '"Compradores" (Danielle, aciccolorado, carlosavilafilho) querem contratar; "palestrantes" (Fabio, Daniel, Janaina) querem se inserir como oferta. Segmentar nas próximas rodadas.',
  },
];

insights.forEach((ins) => {
  // bullet quadrado laranja
  doc.save().rect(PAD, cursorY + 2.5, 4, 4).fill(PSA.orange).restore();
  doc.fillColor(PSA.ink).font('Helvetica-Bold').fontSize(8.5)
    .text(ins.title, PAD + 10, cursorY, { width: contentW - 10, continued: true });
  doc.fillColor(PSA.inkSoft).font('Helvetica').fontSize(8.5)
    .text('  ' + ins.body, { width: contentW - 10 });
  cursorY = doc.y + 4;
});

// ===================== FOOTER =====================
const footerH = 22;
const footerY = H - footerH;
doc.save().rect(0, footerY, W, footerH).fill(PSA.ink).restore();
doc.save().rect(0, footerY - 2, W, 2).fill(PSA.orange).restore();

doc.fillColor(PSA.white).font('Helvetica-Bold').fontSize(7)
  .text('PSA  ·  GROWTH / MKT OPS', PAD, footerY + 7, { width: contentW / 2, characterSpacing: 0.8 });
doc.fillColor('#C7CCDB').font('Helvetica').fontSize(7)
  .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}  ·  HubSpot portal 49656171  ·  Forms: "Benefício para Associados" (5) + "Plataforma de Palestrantes" (1)`,
    PAD, footerY + 7, { width: contentW, align: 'right' });

doc.end();
console.log('PDF gerado em:', outPath.pathname);
