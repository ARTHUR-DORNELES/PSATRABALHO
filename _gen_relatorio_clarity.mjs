import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  info: {
    Title: 'Relatório de Diagnóstico — Site TBS',
    Author: 'PSA Growth',
    Subject: 'Análise Microsoft Clarity · Junho 2026',
  }
});

const OUT = 'Relatorio_Diagnostico_TBS_Clarity_Jun2026.pdf';
doc.pipe(fs.createWriteStream(OUT));

const W = 595 - 120; // usable width
const GRAY1 = '#1a1a1a';
const GRAY2 = '#444444';
const GRAY3 = '#888888';
const RED   = '#c0392b';
const ORANGE = '#d35400';
const BLUE  = '#1a5276';
const LBLUE = '#d6eaf8';
const LRED  = '#fde8e6';
const LORG  = '#fef0e6';
const LGRAY = '#f5f5f5';
const ACCENT = '#2471a3';

function sectionHeader(title, num) {
  doc.moveDown(1.2);
  doc.rect(60, doc.y, W, 22).fill('#1a3a5c');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
     .text(`${num}. ${title.toUpperCase()}`, 68, doc.y - 17, { width: W - 16 });
  doc.fillColor(GRAY1).moveDown(0.8);
}

function kv(label, value, color) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text(label, { continued: true });
  doc.font('Helvetica').fillColor(color || GRAY1).text('  ' + value);
}

function bullet(text, indent) {
  const x = 60 + (indent || 0);
  const w = W - (indent || 0);
  doc.font('Helvetica').fontSize(9.5).fillColor(GRAY1);
  doc.text('•  ' + text, x, doc.y, { width: w, indent: 0 });
}

function bodyText(text) {
  doc.font('Helvetica').fontSize(9.5).fillColor(GRAY1)
     .text(text, { width: W, align: 'justify', lineGap: 2 });
}

function highlight(text, bg, textColor) {
  const H = 18;
  doc.rect(60, doc.y, W, H).fill(bg || LGRAY);
  doc.fillColor(textColor || GRAY1).font('Helvetica-Bold').fontSize(9)
     .text(text, 68, doc.y - 13, { width: W - 16 });
  doc.moveDown(0.5);
}

function metricRow(label, pct, abs, severity) {
  const bg = severity === 'danger' ? LRED : severity === 'warn' ? LORG : LGRAY;
  const tc = severity === 'danger' ? RED : severity === 'warn' ? ORANGE : GRAY1;
  doc.rect(60, doc.y, W, 20).fill(bg);
  const y = doc.y - 15;
  doc.font('Helvetica').fontSize(9).fillColor(GRAY2).text(label, 68, y, { width: W * 0.55 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(tc).text(pct, 68 + W * 0.55, y, { width: W * 0.22, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY2).text(abs, 68 + W * 0.78, y, { width: W * 0.18, align: 'right' });
  doc.rect(60, doc.y, W, 0.5).fill('#dddddd');
  doc.moveDown(0.15);
}

// ── CAPA ─────────────────────────────────────────────────────────────────────
doc.rect(0, 0, 595, 200).fill('#1a3a5c');
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
   .text('Relatório de Diagnóstico', 60, 60, { width: W });
doc.font('Helvetica').fontSize(16).fillColor('#a9cce3')
   .text('Site The Best Speaker (TBS)', 60, 90, { width: W });
doc.rect(60, 115, 80, 3).fill('#e74c3c');
doc.font('Helvetica').fontSize(11).fillColor('#d6eaf8')
   .text('Análise comportamental via Microsoft Clarity  ·  Junho 2026', 60, 128, { width: W });
doc.font('Helvetica').fontSize(9).fillColor('#7fb3d3')
   .text('Fonte: Clarity API — Projeto xc876khkyb  ·  PSA Growth  ·  30 jun 2026', 60, 155, { width: W });

doc.fillColor(GRAY1).y = 220;

// ── RESUMO EXECUTIVO ─────────────────────────────────────────────────────────
doc.rect(60, 210, W, 60).fill('#eaf4fb');
doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT)
   .text('RESUMO EXECUTIVO', 68, 218, { width: W - 16 });
doc.font('Helvetica').fontSize(9).fillColor(GRAY2)
   .text(
     'O site TBS registrou 615 sessões com 82,4% de tráfego mobile originado principalmente de redes sociais (68,3% via WebView Instagram/Facebook). ' +
     'O indicador mais crítico é a presença de erros JavaScript em 55,1% das sessões (7.042 erros totais), causados por conflito de hidratação React em plugin do Elementor, ' +
     'com impacto direto nos pixels de conversão e nos dead clicks (8,6%). A taxa de conversão do upsell (/prelive/) é de 5,1%.',
     68, 233, { width: W - 16, lineGap: 1.5 }
   );

doc.y = 285;

// ── SEÇÃO 1 ──────────────────────────────────────────────────────────────────
sectionHeader('Visão Geral do Tráfego', '1');

bodyText(
  'O site registrou 615 sessões no período analisado, com 635 usuários únicos e 42 sessões de bots filtradas ' +
  'automaticamente pelo Clarity. A média foi de 1,37 páginas por sessão, com tempo total médio de 3 minutos e 7 ' +
  'segundos por sessão — sendo 2 minutos e 3 segundos de tempo ativo.'
);
doc.moveDown(0.6);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('DISPOSITIVOS', { width: W });
doc.moveDown(0.2);
metricRow('Mobile', '82,4%', '507 sessões', 'ok');
metricRow('Desktop', '17,4%', '107 sessões', 'ok');
metricRow('Tablet', '0,2%', '1 sessão', 'ok');
doc.moveDown(0.6);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('SISTEMA OPERACIONAL', { width: W });
doc.moveDown(0.2);
metricRow('Android', '76,3%', '469 sessões', 'ok');
metricRow('Windows', '15,0%', '92 sessões', 'ok');
metricRow('iOS', '6,3%', '39 sessões', 'ok');
metricRow('macOS', '2,1%', '13 sessões', 'ok');
metricRow('Linux', '0,3%', '2 sessões', 'ok');
doc.moveDown(0.6);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('PAÍSES', { width: W });
doc.moveDown(0.2);
metricRow('Brasil', '98,1%', '603 sessões', 'ok');
metricRow('Estados Unidos', '1,6%', '10 sessões', 'ok');
metricRow('Espanha / Reino Unido', '0,2% cada', '1 sessão cada', 'ok');

// ── SEÇÃO 2 ──────────────────────────────────────────────────────────────────
sectionHeader('Canais e Origens de Tráfego', '2');

bodyText(
  'Os navegadores utilizados revelam o perfil do tráfego. Somados, Instagram App e Facebook App representam ' +
  '68,3% de todo o tráfego — quase 7 em cada 10 visitantes acessam o site dentro do navegador embutido de uma rede social (WebView).'
);
doc.moveDown(0.6);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('NAVEGADORES', { width: W });
doc.moveDown(0.2);
metricRow('Instagram App', '46,7%', '287 sessões', 'warn');
metricRow('Facebook App', '21,6%', '133 sessões', 'warn');
metricRow('Chrome (desktop)', '15,8%', '97 sessões', 'ok');
metricRow('Chrome Mobile', '13,8%', '85 sessões', 'ok');
metricRow('Edge', '1,1%', '7 sessões', 'ok');
metricRow('Firefox / Safari / outros', '0,8%', '5 sessões', 'ok');
doc.moveDown(0.6);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('PRINCIPAIS REFERRERS', { width: W });
doc.moveDown(0.2);
metricRow('thebestspeaker.com.br (próprio)', '31,1%', '191 sessões', 'ok');
metricRow('instagram.com', '26,8%', '165 sessões', 'ok');
metricRow('Direto / sem referência', '16,3%', '100 sessões', 'ok');
metricRow('m.facebook.com', '16,1%', '99 sessões', 'ok');
metricRow('google.com (orgânico)', '5,2%', '32 sessões', 'ok');
metricRow('Google Ads (doubleclick)', '4,4%', '27 sessões', 'ok');
metricRow('l.facebook.com', '2,8%', '17 sessões', 'ok');
metricRow('speaker.thebestspeaker.com.br', '2,6%', '16 sessões', 'ok');
metricRow('mundohoje.net', '2,0%', '12 sessões', 'ok');
metricRow('search.thebestspeaker.com.br', '1,5%', '9 sessões', 'ok');

// ── SEÇÃO 3 ──────────────────────────────────────────────────────────────────
sectionHeader('Páginas Mais Visitadas e Funil de Conversão', '3');

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('PÁGINAS POR VOLUME DE VISITAS', { width: W });
doc.moveDown(0.2);
metricRow('/inscricoes/', '58,2%', '450 visitas', 'ok');
metricRow('/inscricoes/prelive/', '22,6%', '175 visitas', 'ok');
metricRow('/ (homepage)', '12,0%', '93 visitas', 'ok');
metricRow('/regulamento-2026/', '4,4%', '34 visitas', 'ok');
metricRow('/inscricoes/obrigado/', '1,2%', '9 visitas', 'ok');
metricRow('/faq/', '0,5%', '4 visitas', 'ok');
metricRow('Outras páginas', '0,9%', '7 visitas', 'ok');
doc.moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('FUNIL DE CONVERSÃO DO UPSELL', { width: W });
doc.moveDown(0.4);

bodyText(
  'Das 449 sessões na página /inscricoes/ (topo do funil), 175 chegaram à página /inscricoes/prelive/ — ' +
  'representando 39,0% de aproveitamento. Dessas 175, apenas 9 chegaram à página /inscricoes/obrigado/, ' +
  'confirmando a compra — uma taxa de conversão do upsell de 5,1%, ou 2,0% sobre o total de entradas no funil.'
);
doc.moveDown(0.5);

// Funil visual simples
const steps = [
  { label: '/inscricoes/', n: '449', pct: '100%', w: W },
  { label: '/inscricoes/prelive/ (upsell)', n: '175', pct: '39,0%', w: W * 0.7 },
  { label: '/inscricoes/obrigado/ (compra)', n: '9', pct: '5,1% do upsell', w: W * 0.25 },
];
steps.forEach((s, i) => {
  const colors = ['#1a5276', '#1f618d', '#c0392b'];
  const x = 60 + (W - s.w) / 2;
  doc.rect(x, doc.y, s.w, 22).fill(colors[i]);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
     .text(`${s.label}  —  ${s.n} sessões  (${s.pct})`, x + 8, doc.y - 15, { width: s.w - 16, align: 'center' });
  doc.moveDown(0.25);
}
);

// ── SEÇÃO 4 ──────────────────────────────────────────────────────────────────
sectionHeader('Indicadores Comportamentais', '4');

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3)
   .text('INDICADOR', 60, doc.y, { width: W * 0.4, continued: false });

const tableY = doc.y;
doc.rect(60, tableY - 4, W, 18).fill('#2c3e50');
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
   .text('INDICADOR', 68, tableY, { width: W * 0.38 });
doc.text('SESSÕES AFETADAS', 68 + W * 0.38, tableY, { width: W * 0.25, align: 'right' });
doc.text('PAGE VIEWS', 68 + W * 0.64, tableY, { width: W * 0.18, align: 'right' });
doc.text('EVENTOS', 68 + W * 0.83, tableY, { width: W * 0.14, align: 'right' });
doc.moveDown(0.25);

const rows = [
  { l: 'Scroll médio da página', pct: '46,2%', pv: '—', ev: '—', sev: 'warn' },
  { l: 'Dead Clicks', pct: '8,6%', pv: '58', ev: '126', sev: 'danger' },
  { l: 'Erros de JavaScript (qualquer)', pct: '55,1%', pv: '375', ev: '7.042', sev: 'danger' },
  { l: 'Error Clicks', pct: '1,3%', pv: '9', ev: '9', sev: 'warn' },
  { l: 'Quick Back', pct: '1,5%', pv: '9', ev: '9', sev: 'warn' },
  { l: 'Rage Clicks', pct: '0,2%', pv: '1', ev: '1', sev: 'ok' },
  { l: 'Excessive Scroll', pct: '0,0%', pv: '0', ev: '0', sev: 'ok' },
];
rows.forEach(r => {
  const bg = r.sev === 'danger' ? LRED : r.sev === 'warn' ? LORG : LGRAY;
  const tc = r.sev === 'danger' ? RED : r.sev === 'warn' ? ORANGE : GRAY1;
  doc.rect(60, doc.y, W, 18).fill(bg);
  const y = doc.y - 13;
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY2).text(r.l, 68, y, { width: W * 0.38 });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(tc).text(r.pct, 68 + W * 0.38, y, { width: W * 0.25, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY2).text(r.pv, 68 + W * 0.64, y, { width: W * 0.18, align: 'right' });
  doc.text(r.ev, 68 + W * 0.83, y, { width: W * 0.14, align: 'right' });
  doc.rect(60, doc.y, W, 0.5).fill('#dddddd');
  doc.moveDown(0.15);
});

doc.moveDown(0.5);
bodyText(
  'O scroll médio de 46,2% indica que aproximadamente metade dos visitantes não chega à segunda metade de nenhuma ' +
  'página. Em uma página de upsell como /inscricoes/prelive/, onde o CTA principal está posicionado abaixo do dobramento, ' +
  'este indicador é diretamente correlacionado à baixa taxa de conversão.'
);

// ── SEÇÃO 5 ──────────────────────────────────────────────────────────────────
sectionHeader('Erros de JavaScript', '5');

doc.rect(60, doc.y, W, 40).fill(LRED);
doc.font('Helvetica-Bold').fontSize(10).fillColor(RED)
   .text('7.042 erros de JavaScript totais', 68, doc.y - 33, { width: W - 16 });
doc.font('Helvetica').fontSize(9).fillColor(RED)
   .text('55,1% das sessões contêm ao menos um erro — mais da metade de todos os visitantes experimenta falhas técnicas.', 68, doc.y - 20, { width: W - 16 });
doc.moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY3).text('DISTRIBUIÇÃO DOS ERROS', { width: W });
doc.moveDown(0.2);

const erros = [
  { code: 'React Error #418 — Hydration mismatch', pct: '51,6%', desc: 'HTML do servidor ≠ HTML esperado pelo React. Re-renderização completa no cliente com flash visual.' },
  { code: 'React Error #422 — Suspense hydration failure', pct: '44,0%', desc: 'Componente Suspense falhou. React refaz todo o render no cliente; CTAs ficam sem handler por frações de segundo.' },
  { code: 'Script Error genérico (cross-origin)', pct: '2,0%', desc: 'Pixel de terceiro (Meta/Google) falha silenciosamente em WebViews ou browsers específicos.' },
  { code: 'React Error #425 — Text mismatch', pct: '1,9%', desc: 'Texto do servidor ≠ texto do cliente. Valores dinâmicos (contadores, datas) divergindo entre os dois ambientes.' },
];

erros.forEach(e => {
  doc.rect(60, doc.y, W, 14).fill('#fde8e6');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(RED)
     .text(e.code, 68, doc.y - 10, { width: W * 0.68 });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(RED)
     .text(e.pct, 68 + W * 0.68, doc.y + 4, { width: W * 0.28, align: 'right' });
  doc.moveDown(0.15);
  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY2)
     .text(e.desc, 68, doc.y, { width: W - 16, lineGap: 1 });
  doc.moveDown(0.5);
});

doc.moveDown(0.3);
doc.rect(60, doc.y, W, 3).fill('#e74c3c');
doc.moveDown(0.6);
doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY1).text('Causa identificada:', { continued: true });
doc.font('Helvetica').fillColor(GRAY2).text(
  ' Plugin "Addon Elements for Elementor Page Builder" (v1.14.5) carrega um bundle React próprio ' +
  '(build/index.min.js). O PHP do WordPress renderiza widgets no servidor; o React tenta hidratar no cliente e ' +
  'encontra discrepância — gerando erros em 100% das sessões onde o plugin está ativo.'
);

// ── SEÇÃO 6 ──────────────────────────────────────────────────────────────────
sectionHeader('Problema Adicional: Dupla Instrumentação do Clarity', '6');

doc.rect(60, doc.y, W, 32).fill('#fef9e7');
doc.font('Helvetica-Bold').fontSize(9).fillColor(ORANGE)
   .text('Dois projetos Clarity carregando simultaneamente nas páginas /inscricoes/ e /inscricoes/prelive/', 68, doc.y - 26, { width: W - 16 });
doc.font('Helvetica').fontSize(8.5).fillColor(ORANGE)
   .text('Projeto legado: ph31t773n5  ·  Projeto atual: xc876khkyb', 68, doc.y - 12, { width: W - 16 });
doc.moveDown(0.8);

const impacts6 = [
  'Duplicação de sessões e eventos nos relatórios de comportamento',
  'Inflação dos contadores de erro — os 7.042 erros reportados podem representar ~3.500 erros reais',
  'Conflito entre dois scripts de rastreamento disputando o mesmo DOM',
  'Possível contribuição para os dead clicks registrados (8,6% das sessões)',
];
impacts6.forEach(i => bullet(i));

// ── SEÇÃO 7 ──────────────────────────────────────────────────────────────────
sectionHeader('Impacto no Negócio', '7');

const impacts = [
  {
    title: '1. Pixels de conversão sub-reportando',
    text: 'Durante a re-hidratação do React, Meta Pixel e Google Analytics 4 podem perder eventos de PageView e Lead. ' +
          'Com 55,1% das sessões afetadas, há risco significativo de subnotificação de conversões — campanhas otimizam com ' +
          'dados incompletos, elevando artificialmente o CPL reportado e distorcendo o ROAS.'
  },
  {
    title: '2. Dead clicks correlacionados à re-hidratação',
    text: 'Os 8,6% de dead clicks (126 eventos em 58 page views) são consistentes com o período em que o React ' +
          're-renderiza e os event handlers ficam desconectados do DOM — incluindo potencialmente o CTA "Garantir minha vaga".'
  },
  {
    title: '3. Dados de comportamento distorcidos',
    text: 'Com dois projetos Clarity ativos, métricas de scroll, clique e sessão podem estar infladas, comprometendo ' +
          'a confiabilidade de todas as análises comportamentais baseadas nesses dados.'
  },
];
impacts.forEach(imp => {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLUE).text(imp.title, { width: W });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY2).text(imp.text, { width: W, lineGap: 1.5, align: 'justify' });
  doc.moveDown(0.7);
});

// ── SEÇÃO 8 ──────────────────────────────────────────────────────────────────
sectionHeader('Recomendações por Prioridade', '8');

const recs = [
  {
    pri: 'CRÍTICO — até 48h', bg: '#c0392b', tc: '#ffffff',
    items: [
      { n: '1', t: 'Remover o tag Clarity duplicado (ph31t773n5)', d: 'Localizar no GTM ou no tema WordPress e remover o projeto legado. Esforço: ~15 minutos. Impacto imediato: dados passam a ser confiáveis.' },
      { n: '2', t: 'Verificar disparos de pixel após a correção', d: 'Usar Meta Pixel Helper e Google Tag Assistant para confirmar que PageView, Lead e Purchase chegam sem duplicata.' },
    ]
  },
  {
    pri: 'ALTO — até 2 semanas', bg: '#d35400', tc: '#ffffff',
    items: [
      { n: '3', t: 'Atualizar o plugin "Addon Elements for Elementor" para a versão mais recente', d: 'Verificar correções de hidratação React disponíveis. Se não resolver, substituir widgets desse plugin por componentes nativos do Elementor Pro nas páginas de conversão.' },
      { n: '4', t: 'Mover o link de skip ("Não quero a imersão") para após a oferta', d: 'Posicionado no topo, funciona como saída antes da proposta de valor. Com 82% mobile e scroll de 46,2%, a probabilidade de clique prematuro é alta.' },
      { n: '5', t: 'Adicionar CTA sticky no rodapé em mobile (/inscricoes/prelive/)', d: 'Scroll médio de 46,2% significa que o botão "Garantir minha vaga" é invisível para ~metade dos visitantes. Botão fixo no rodapé resolve sem alterar layout.' },
    ]
  },
  {
    pri: 'MÉDIO — próximo mês', bg: '#1a5276', tc: '#ffffff',
    items: [
      { n: '6', t: 'Incluir prova social na página /inscricoes/prelive/', d: 'Sem depoimentos, contador de vagas ou garantia, a barreira de confiança é alta para um público 68,3% vindo de WebView de redes sociais.' },
      { n: '7', t: 'Reformular o headline da página /inscricoes/prelive/', d: 'O atual "A primeira etapa está concluída" sinaliza fim de jornada. Sugestão: "Antes de confirmar sua vaga, veja isso…" — mantém o usuário em antecipação.' },
    ]
  },
];

recs.forEach(group => {
  doc.rect(60, doc.y, W, 18).fill(group.bg);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(group.tc)
     .text(group.pri, 68, doc.y - 13, { width: W - 16 });
  doc.moveDown(0.4);
  group.items.forEach(item => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GRAY1)
       .text(`${item.n}. ${item.t}`, 68, doc.y, { width: W - 16 });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY2)
       .text(item.d, 76, doc.y, { width: W - 24, lineGap: 1.5 });
    doc.moveDown(0.6);
  });
  doc.moveDown(0.3);
});

// ── RODAPÉ em todas as páginas ───────────────────────────────────────────────
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(0, 817, 595, 25).fill('#1a3a5c');
  doc.font('Helvetica').fontSize(7.5).fillColor('#7fb3d3')
     .text('Fonte: Microsoft Clarity API — Site TBS (xc876khkyb)  ·  PSA Growth  ·  Junho 2026',
           60, 823, { width: W - 30, align: 'left' });
  doc.fillColor('#a9cce3')
     .text(`${i - range.start + 1} / ${range.count}`, 60, 823, { width: W, align: 'right' });
}

doc.end();
console.log('PDF gerado:', OUT);
