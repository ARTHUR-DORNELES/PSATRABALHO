# Relatório de Atualizações — Painel TBS 2026
**Dashboard ao vivo · HubSpot + Meta Ads · The Best Speaker / The Best School**
_Documento para diretoria · gerado em 09/06/2026_

---

## Visão geral
O painel é um dashboard **ao vivo** que consolida, em tempo real, as inscrições do TBS 2026, o funil de participação, as origens de tráfego, o desempenho da mídia paga e as vendas do The Best School — puxando direto do **HubSpot** e do **Meta Ads**, sem planilha manual.

Abaixo, todas as evoluções desde a criação, agrupadas por área, com o **que mudou** e o **porquê (valor pro negócio)**.

---

## 1. Estrutura e navegação
- **Duas abas:** *The Best Speaker* (inscrições · funil · canais · regiões) e *The Best School* (checkout · mídia paga · ROAS).
- **Atualização contínua ao vivo** — os números refrescam sozinhos a partir do HubSpot/Meta.
- **Versão em PDF** para apresentação gerencial.
- *Valor:* visão única e sempre atual, sem depender de extração manual.

## 2. Funil de inscrições (The Best Speaker)
- **4 etapas definidas:** Inscrição confirmada → Entrou na plataforma → Upload de vídeo → Análise de IA.
- **"Entrou na plataforma"** passou a usar a **data real de entrada** (fiel ao backoffice), parando de arrastar etapas de edições anteriores.
- **Atividade diária por etapa** com **total de inscritos por dia** no tooltip e nota explicando que cada pessoa aparece na etapa mais profunda (os segmentos somam o total do dia).
- **Mapa do Brasil por região**, pageviews e ritmo de inscrições por faixa de horário.
- *Valor:* leitura clara de onde estão os gargalos do funil e do ritmo de inscrição.

## 3. Origens de tráfego (canais)
- **Classificação automática de origem** por fonte [TBS] + UTM (Email, WhatsApp, Social Pago, Social Orgânico, Pesquisa Paga, Linktree, Comunidade, etc.).
- **Segmentação de contatos "não rastreados"** (sem UTM/fonte).
- **Nova fonte "Otaviano (campanha)"** — isola, via `utm_term`, os contatos vindos da campanha com o Otaviano Costa.
- **Nova fonte "TikTok"** — captura o tráfego com `utm_source = tiktok`.
- **Conversão em vendas por canal** e **total de vendas por canal**.
- *Valor:* enxergar qual canal traz inscrição e qual converte em venda, e medir campanhas/influenciadores específicos.

## 4. Mídia paga e ROAS _(maior evolução do período)_
- **Gasto do Meta via API** (Google desvinculado), com **ROAS, CPL, CPA e ponto de equilíbrio**.
- **Removido o CPC** para enxugar a leitura.
- **Reformulado para tabela comparativa por preço da live** (R$ 19,90 vs R$ 29,00).
- **Gasto do Meta passou a ser puxado por dia** e atribuído à **janela de data de cada preço** — o que torna **CPL e ROAS por coluna corretos** (cada preço dividido pelo gasto que realmente rodou na sua janela, em vez do gasto total).
- **Receita do ROAS** considera **venda da live + upsell**.
- Linhas de **Upsells** e **Taxa de conversão** por preço.
- Seção **"Origem do lead: base reativada × novos da campanha"** — mostra quanto da mídia paga é **aquisição nova** vs **reativação da base** existente.
- *Valor:* medir o retorno real da mídia por preço e entender quanto a verba traz gente nova vs reativa a base.

## 5. Vendas — The Best School
- **Checkout puxando do pipeline de negócios do HubSpot** (1 pedido = 1 negócio), captando vendas que as propriedades de contato perdiam.
- **Vendas por dia pela data de pagamento real (Kiwify)** — bate com o relatório do Kiwify.
- **Receita por produto** (tripwire vs upsell).
- **Comparativo de preço da Live (R$ 19,90 × R$ 29,00):**
  - Somente contatos de **Social Pago**.
  - Vendas, receita, **conversão, ROAS e upsell** por preço.
  - **Taxa de conversão = negócios (live + upsell) ÷ inscritos no período de cada preço** — corrigida para não inflar o preço novo.
  - Removidas métricas que não faziam sentido nesse contexto (ticket médio, taxa de qualificação, conversão high-ticket).
- **Removido** o relatório "Compra do The Best School por etapa do funil" (a pedido).
- *Valor:* fidelidade com o Kiwify e comparação justa de desempenho entre os dois preços.

## 6. Confiabilidade e fidelidade dos dados
- **Exclusão de contas de teste** (domínio interno + contas avulsas) de **todas** as contagens.
- **Contagem de participantes fiel ao backoffice** (validada caso a caso).
- **Estabilidade/performance:** fim dos timeouts (504); cache com atualização em segundo plano (resposta instantânea).
- *Valor:* números confiáveis e iguais aos da operação, sem "teste" inflando métrica.

## 7. Validações e auditorias realizadas no período
- **Conferência da contagem diária de inscritos** × backoffice (diferença explicada e dentro do esperado).
- **Reconciliação Kiwify × HubSpot:** identificado que a diferença de receita vem de **vendas que o webhook do Kiwify não cria no HubSpot** (~5%), com plano de correção.
- **Análise de ativação dos compradores:** apenas **75 de 364 compradores** entraram na plataforma — **289 compraram e ainda não ativaram o acesso** (oportunidade de re-engajamento) e **74 entraram sem comprar**.

---

## Linha do tempo dos deploys em produção (desde 01/06/2026)
_Horários reais de subida em produção (Vercel · horário de Brasília)._

### Fase 1 — Construção e evolução do painel · 01/06 → 07/06/2026
Período de construção do painel e das primeiras versões dos relatórios, com **dezenas de deploys** de implementação e ajuste. Principais entregas dessa fase:
- Estrutura em **duas abas** (The Best Speaker / The Best School) e **atualização ao vivo**.
- **Funil de inscrições** (4 etapas) + atividade diária + mapa do Brasil + pageviews.
- **Classificação de origens por UTM** + segmentação de não-rastreados.
- **Relatório de mídia paga** (Meta via API): ROAS, CPL, CPA, ponto de equilíbrio.
- **Conversão por canal** e **total de vendas por canal**.
- **The Best School:** checkout via pipeline de negócios, vendas pela data de pagamento (Kiwify), receita por produto.
- **Comparativo de preço da Live** (R$ 19,90 × R$ 29,00) — 1ª versão.
- **Estabilidade e fidelidade:** fim dos timeouts (504), cache com atualização em segundo plano.
- **Versão em PDF** para diretoria.

### Fase 2 — Rodada de refinamento fino · 08/06/2026 (detalhada)
Toda a rodada subiu em produção no dia **08/06/2026, entre 11:03 e 17:06** (≈6 horas, 16 atualizações):

| # | Hora | Atualização |
|---|---|---|
| 1 | 11:03 | Exclusão das contas de teste de todas as contagens *(1º ajuste)* |
| 2 | 11:20 | Comparativo de preço só **Social Pago** + linha **Vendas upsell**; remoção de linhas que não cabiam; removido relatório "TBSchool por etapa do funil" |
| 3 | 11:40 | Atividade diária: **"Total inscritos no dia"** no tooltip + legenda da etapa mais profunda |
| 4 | 11:56 | Taxa de conversão = **(live + upsell) ÷ inscritos** |
| 5 | 12:11 | Conversão pela **janela de cada preço** |
| 6 | 12:45 | Conversão pela **data de inscrição** (campo oficial) + textos |
| 7 | 14:13 | ROAS do comparativo: receita = **live + upsell**, gasto = **só Meta** |
| 8 | 14:48 | Nova fonte **"Otaviano (campanha)"** (via utm_term) |
| 9 | 14:51 | Nova fonte **"TikTok"** (via utm_source) |
| 10 | 15:13 | Mídia paga: ROAS em **3 colunas** + **remoção do CPC** |
| 11 | 15:24 | Bloco vira **tabela comparativa** (todas as infos por coluna) |
| 12 | 15:32 | **Inversão das colunas** (antigos antes de novos) |
| 13 | 15:56 | **CPL por coluna** |
| 14 | 16:44 | **ROAS/CPL/CPA por preço** (janela de data) + gasto do **Meta por dia** |
| 15 | 16:52 | Linhas de **Upsells** e **Taxa de conversão** por preço |
| 16 | 17:06 | Seção **"Origem do lead: base reativada × novos da campanha"** *(último)* |

### Estado atual
Última versão em produção: **09/06/2026 09:25** (redeploy do mesmo código da Fase 2).

**Resumo:** 1º ajuste no ar em **08/06 11:03**; última atualização da sequência em **08/06 17:06**. A base do painel foi construída e evoluída ao longo de **01/06–07/06**.

---

## Próximos passos sugeridos
1. **Ligar o painel direto na API do Kiwify** (fonte da verdade) para o número de vendas nunca depender do sync com o HubSpot.
2. **Reconciliação automática Kiwify × HubSpot** com alerta quando uma venda não subir.
3. **Campanha de ativação** para os ~289 compradores que ainda não entraram na plataforma.
4. **Ajuste fino do ROAS:** opção de ver com/sem upsell e refinar o corte do dia da virada de preço (05/06).

---
_Painel: https://tbs-2026-dashboard.vercel.app_
