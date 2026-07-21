// Histórico de atualizações do PAINEL (changelog), desde a criação (18/05/2026), por dia e hora.
// Aparece na aba "Registros" agrupado por dia. Para registrar uma nova: adicione uma linha em RAW
// (formato [data, hora, tipo, título, descrição?]). Horários de Brasília (hora do pedido).
export type ChangeTipo = 'novo' | 'melhoria' | 'ajuste' | 'correcao';
export type ChangelogEntry = { date: string; time: string; tipo: ChangeTipo; titulo: string; desc?: string };

export const TIPO_LABEL: Record<ChangeTipo, string> = { novo: 'Novo', melhoria: 'Melhoria', ajuste: 'Ajuste', correcao: 'Correção' };

// Marcos de dia (rótulo ao lado do cabeçalho da data).
export const DIA_MARCO: Record<string, string> = {
  '2026-05-18': 'Criação do painel',
  '2026-06-01': 'Início oficial do TBS',
  '2026-06-08': 'Rodada de refinamento fino',
  '2026-06-11': 'Visão Integrada, Otaviano e reconciliação Kiwify',
  '2026-06-12': 'Dados, mídia paga e aba Registros',
};

type Raw = [string, string, ChangeTipo, string] | [string, string, ChangeTipo, string, string];

const RAW: Raw[] = [
  // ── 18/05 — Criação do painel ──
  ['2026-05-18', '16:05', 'novo', 'Definição do painel de referência (HubSpot) e início do dashboard TBS'],
  ['2026-05-18', '16:31', 'novo', 'Botão de atualizar + link público para compartilhar'],
  ['2026-05-18', '16:57', 'novo', 'Números e dados clicáveis (drill para ver cada dado a fundo)'],
  ['2026-05-18', '17:27', 'novo', 'Inscrições/dia, vídeos/dia, votos/dia, idade, estados, gênero, área e e-mail'],
  // ── 19/05 ──
  ['2026-05-19', '09:05', 'ajuste', 'Revisão da origem dos números (inscrições ainda não abertas)'],
  ['2026-05-19', '15:55', 'correcao', 'Zerar dados de anos anteriores (2025) que contavam como 2026'],
  ['2026-05-19', '16:52', 'correcao', 'Zerar 45 inscritos inexistentes'],
  ['2026-05-19', '17:09', 'correcao', 'Atualizar relatórios que ainda puxavam o ano passado'],
  // ── 28/05 ──
  ['2026-05-28', '14:09', 'ajuste', 'Ajuste do dash TBS conforme novas propriedades do HubSpot'],
  ['2026-05-28', '14:14', 'novo', 'Régua do The Best Speaker como referência do fluxo'],
  ['2026-05-28', '16:40', 'melhoria', 'Canais de entrada dos leads (CRM, mídia paga, redes) bem definidos'],
  ['2026-05-28', '16:54', 'ajuste', 'Lead contabilizado desde o 1º formulário'],
  ['2026-05-28', '18:04', 'ajuste', 'Investigação dos ~78% sem rastreio'],
  // ── 29/05 ──
  ['2026-05-29', '10:56', 'novo', 'Fontes e páginas de quem acessa a LP /inscricoes/'],
  ['2026-05-29', '11:14', 'ajuste', 'Retirar anos anteriores; funil por tbs___etapa'],
  ['2026-05-29', '11:40', 'melhoria', 'Funil de Leads no topo + filtro participante TBS 2026 + design'],
  ['2026-05-29', '13:22', 'ajuste', 'Mostrar funis mesmo zerados (0)'],
  ['2026-05-29', '13:30', 'novo', 'Pageviews & conversão da LP (base GA4)'],
  ['2026-05-29', '13:32', 'novo', 'Atividade diária (inscrições / vídeos / votos por dia)'],
  ['2026-05-29', '13:49', 'novo', 'Gráfico de inscritos por região — mapa do Brasil'],
  ['2026-05-29', '14:35', 'novo', 'Mapa do Brasil por regiões + botão de tema claro/escuro'],
  ['2026-05-29', '17:45', 'novo', 'Insights de conversão no painel'],
  // ── 01/06 — Início oficial do TBS ──
  ['2026-06-01', '08:37', 'ajuste', 'Limpar/zerar números para o início do TBS'],
  ['2026-06-01', '08:54', 'ajuste', 'Etapas do funil de leads (Inscrição principal etc.)'],
  ['2026-06-01', '09:14', 'melhoria', 'Atividade diária por etapa (acima de canais de entrada)'],
  ['2026-06-01', '10:52', 'melhoria', 'Mais opções no drill de canais de entrada (utm_TBS)'],
  ['2026-06-01', '11:04', 'correcao', 'Correção da região (inscritos sem região preenchida)'],
  ['2026-06-01', '11:31', 'novo', 'Origem de entrada nos sites do domínio'],
  ['2026-06-01', '11:54', 'novo', 'Bloco The Best School (abandono / compra de carrinho)'],
  ['2026-06-01', '12:01', 'novo', 'Gráfico do checkout por dia'],
  ['2026-06-01', '14:14', 'ajuste', 'Exceção: utm_source = comunidade → origem "Comunidade"'],
  ['2026-06-01', '16:16', 'novo', 'Atualização em tempo real (auto-refresh 1 min)'],
  ['2026-06-01', '16:30', 'correcao', 'Correção do bug que zerava o painel antes de atualizar'],
  ['2026-06-01', '16:40', 'novo', 'Investimento de campanha (Meta Ads)'],
  ['2026-06-01', '17:37', 'ajuste', 'Mostrar só as campanhas TBS do ano'],
  ['2026-06-01', '17:42', 'novo', 'ROAS, CPA e receita só de mídia paga (segmentado)'],
  ['2026-06-01', '17:48', 'ajuste', 'Receita pelo valor líquido (TBSchool)'],
  ['2026-06-01', '17:56', 'melhoria', 'Subir "Mídia paga x Vendas" e "Checkout" no topo, clicáveis'],
  ['2026-06-01', '18:18', 'correcao', 'Corrigir inversão de abandono/compra'],
  // ── 02/06 ──
  ['2026-06-02', '08:55', 'novo', 'Adicionar CPL e CPC'],
  ['2026-06-02', '10:29', 'ajuste', 'Renomear "Resultado" para "Ponto de equilíbrio (Ads)"'],
  ['2026-06-02', '10:45', 'melhoria', 'KPIs no topo (inscrição, cadastro, upload, IA)'],
  ['2026-06-02', '10:54', 'correcao', 'Corrigir gasto do Meta que zerou'],
  ['2026-06-02', '13:12', 'correcao', 'Corrigir etapas do funil (IA pronta, upload, pedir votos)'],
  ['2026-06-02', '15:59', 'novo', 'Receita separada por Meta Ads vs Google Ads'],
  ['2026-06-02', '16:58', 'novo', 'Gráfico ROAS / breakeven sobre o ritmo de inscrição'],
  ['2026-06-02', '17:15', 'melhoria', 'CPA no breakeven (só quem converteu)'],
  ['2026-06-02', '17:40', 'melhoria', 'Melhorias gerais de performance do painel'],
  // ── 03/06 ──
  ['2026-06-03', '09:05', 'melhoria', 'Relógio corrido (horário natural, não só ao atualizar)'],
  ['2026-06-03', '09:17', 'ajuste', 'Segmentar "sem fonte" da conversão por canal'],
  ['2026-06-03', '09:21', 'novo', 'Balde de Linktree/Bio + SEO'],
  ['2026-06-03', '11:03', 'novo', 'PDF gerencial com a cara do TBS'],
  ['2026-06-03', '15:42', 'novo', '% de compra do TBSchool por etapa do funil'],
  // ── 05/06 ──
  ['2026-06-05', '09:52', 'ajuste', 'Atualizar relatórios pelo pipeline do The Best School'],
  ['2026-06-05', '11:35', 'ajuste', 'Retirar "perdidos" do painel'],
  ['2026-06-05', '12:56', 'novo', 'Valor vendido por produto'],
  ['2026-06-05', '13:40', 'melhoria', 'Conversão/total de vendas por canal batendo com o vendido'],
  ['2026-06-05', '16:10', 'novo', 'Relatório comparativo de preço da live (R$ 19,90 → R$ 29,00)'],
  ['2026-06-05', '16:22', 'novo', 'Adicionar taxa de conversão'],
  ['2026-06-05', '16:54', 'novo', 'Ticket médio do upsell + vendas via Social Pago'],
  ['2026-06-05', '17:15', 'ajuste', 'Recalcular a taxa do preço novo (virada às 16h50)'],
  ['2026-06-05', '17:16', 'correcao', 'Correção de timeout (504)'],
  // ── 08/06 — Rodada de refinamento fino ──
  ['2026-06-08', '09:09', 'ajuste', 'Kiwify x dash: alinhar nº de vendas do dia'],
  ['2026-06-08', '10:28', 'correcao', 'Backoffice (137) x dash (164): excluir quem não é participante'],
  ['2026-06-08', '11:03', 'correcao', 'Exclusão das contas de teste de todas as contagens'],
  ['2026-06-08', '11:20', 'ajuste', 'Comparativo de preço só Social Pago + Vendas upsell'],
  ['2026-06-08', '11:56', 'ajuste', 'Taxa de conversão = (live + upsell) / inscritos'],
  ['2026-06-08', '12:45', 'ajuste', 'Conversão pela data de inscrição (campo oficial)'],
  ['2026-06-08', '14:13', 'ajuste', 'ROAS: receita = live + upsell, gasto = só Meta'],
  ['2026-06-08', '14:48', 'novo', 'Novas fontes "Otaviano (campanha)" e "TikTok"'],
  ['2026-06-08', '15:24', 'melhoria', 'Mídia paga x Vendas vira tabela comparativa por preço'],
  ['2026-06-08', '16:44', 'melhoria', 'ROAS/CPL/CPA por janela de preço + gasto do Meta por dia'],
  ['2026-06-08', '17:06', 'novo', 'Seção "base reativada x novos da campanha"'],
  // ── 09/06 ──
  ['2026-06-09', '09:00', 'ajuste', 'Remover comparativo de preço (consolidar em Mídia paga x Vendas)'],
  ['2026-06-09', '09:16', 'melhoria', 'Marcas de vencedor (estrela) no Mídia paga x Vendas'],
  ['2026-06-09', '09:25', 'ajuste', 'Versão publicada em produção (redeploy)'],
  // ── 10/06 ──
  ['2026-06-10', '10:09', 'ajuste', 'Análise do feedback sobre o ROAS Geral (entender soma x média dos segmentos)'],
  ['2026-06-10', '11:10', 'correcao', 'Correção do erro ao clicar em "inscritos do dia" (limite de 6 filtros do HubSpot → janela única)'],
  ['2026-06-10', '11:40', 'correcao', 'Diagnóstico do botão "Atualizar" girando / "atualizado" travado (cache do snapshot na Vercel)'],
  // ── 11/06 — Visão Integrada, Otaviano e reconciliação Kiwify ──
  ['2026-06-11', '08:08', 'correcao', 'n8n: e-mail/telefone inválido travava a criação do negócio → sanitização (normaliza telefone p/ +55, corrige typo de domínio do e-mail)'],
  ['2026-06-11', '09:00', 'ajuste', 'Definição da chave de casamento Kiwify x HubSpot: CPF (resolve compra com e-mail diferente)'],
  ['2026-06-11', '09:40', 'novo', '3ª aba "Visão integrada": funil unificado, inscrição x venda por dia, conversão por canal, quem compra, conversão por região, tempo até a compra e perfil do comprador'],
  ['2026-06-11', '10:30', 'melhoria', 'Bloco "Quem compra" em formato pizza (base reativada x novos)'],
  ['2026-06-11', '11:00', 'melhoria', 'ROAS por segmento de verdade: gasto do Meta rateado pela fatia de inscritos'],
  ['2026-06-11', '11:30', 'novo', 'Otaviano: reconhecer a UTM "redes-otavianocosta" como campanha do Otaviano'],
  ['2026-06-11', '12:00', 'melhoria', 'Drill clicável no "Ritmo de inscrições por hora" (ver origens de cada hora)'],
  ['2026-06-11', '12:30', 'novo', 'Cartão "Influência Otaviano" separando pago (criativo) x orgânico (redes dele)'],
  ['2026-06-11', '13:00', 'correcao', 'Reconciliação Kiwify x HubSpot: diagnóstico do gap de valor vendido (~R$ 2.849)'],
  ['2026-06-11', '13:30', 'correcao', 'Diagnóstico fino: 31 vendas pagas em stage errado + 11 sem negócio + 5 marcadas como perdidas'],
  ['2026-06-11', '14:05', 'correcao', 'Correção: 31 negócios → "Fechado" (valor certo) e 12 vendas faltantes criadas (sem duplicar, casando por CPF)'],
  ['2026-06-11', '14:22', 'correcao', 'Desbloqueio da publicação na Vercel + publicação da Visão Integrada e do cartão Otaviano'],
  ['2026-06-11', '14:30', 'correcao', 'n8n: nó de carrinho abandonado robusto (lê os dois formatos de evento e não quebra mais)'],
  // ── 12/06 — Dados, mídia paga e aba Registros ──
  ['2026-06-12', '09:50', 'correcao', 'Compra duplicada do Lamartine + dedup por order_id', 'Cliente que comprou 2x o mesmo produto aparecia 1x. Criada a 2ª compra real; n8n passa a deduplicar pelo ID da transação (order_id) em vez de e-mail+produto.'],
  ['2026-06-12', '10:15', 'correcao', 'Vendas em dólar convertidas pra real', '3 vendas internacionais (US$) estavam gravadas em dólar no HubSpot. Convertidas para real (R$ 213,07), fechando a diferença de R$ 171,96 com a tela do Kiwify.'],
  ['2026-06-12', '11:30', 'correcao', 'Botão "Atualizar" reconstrói de verdade', 'Antes devolvia o dado em cache na hora e atualizava só por trás. Agora aguarda a reconstrução real do snapshot e devolve os números novos.'],
  ['2026-06-12', '12:40', 'melhoria', 'Datas de venda batem com o Kiwify', 'Backfill da data real de pagamento (Kiwify) em 556 contatos. O gráfico "vendas por dia" passou a alinhar com o relatório do Kiwify (corrigiu 05/06, 11/06 e 12/06).'],
  ['2026-06-12', '13:25', 'ajuste', 'Mídia paga padronizada (só Meta)', 'Gráfico diário, ROAS e tabela passaram a contar apenas Social Pago (Meta). Google desvinculado sai da conta — os três cards agora batem.'],
  ['2026-06-12', '14:10', 'novo', 'Aba "Registros" criada', 'Histórico de atualizações do painel (este) + calendário editável de ocorrências do TBS, com área de origem e área responsável por resolver.'],
];

export const CHANGELOG: ChangelogEntry[] = RAW.map(([date, time, tipo, titulo, desc]) => ({ date, time, tipo, titulo, desc }));
