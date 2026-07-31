# Dossiê B2C — Palestrante Candidato · HANDOFF

Documento de continuidade. Se você (ou o Claude em outra máquina) abrir isto, tem o estado completo do projeto.
Estado atual: **v5** (fluxo funcionando end-to-end, testado com leads reais).

## O que é
Fluxo n8n que, quando um lead B2C entra na etapa **"Reunião Agendada / Qualificado"** (Funil de Vendas B2C) no HubSpot, gera automaticamente um dossiê do candidato a palestrante: enriquece dados, dá nota 0-100, define Perfil (Escala / Profissionalize-se / Iniciante), sugere closer, gera rapport + pontes de convite pra imersão, e grava tudo no **contato**. Espelha o Hunter B2B ("SDR Farmer / Dossiê Empresas").

## Arquivos aqui
- `Dossie_B2C_Palestrante.json` — workflow n8n importável (Import from File). **33 nós.**
- `gen_b2c.js` — gerador do workflow. **Edite este e rode `node gen_b2c.js`** pra regenerar o JSON (mais seguro que editar o JSON à mão). Caminhos portáveis: lê o CSS do B2B de `~/Downloads/SDR Farmer _ primeira maquina - Dossiê Empresas.json` (via `os.homedir()`) e grava o JSON ao lado do próprio script (`__dirname`).

## Arquitetura (33 nós)
`Webhook → CONFIG → Get Contato → [LEAD] Base → 3 coletores paralelos (HubSpot, Apollo, Web) → [WEB] alimenta o Apify → Merge 4 → Aggrega → Síntese (Claude) → Parse+Score → Render HTML → Upload → write-back no contato (Patch)`

**Re-sequência importante:** o Apify NÃO é mais paralelo. Ele roda **depois** do Pesquisador Web, porque usa o @ do Instagram que a Web confirmou quando o cadastro não tem (auto-descoberta). Ordem: `[WEB] Normaliza → [APIFY] Prepara → [APIFY] Instagram → [APIFY] Normaliza → Merge(input 3)`. A Web também alimenta o Merge(input 2).

## Score / Perfil
LLM avalia 5 eixos (0-100): audiência, repertório_palco, autoridade_tema, ambição_realismo, urgência_timing. `[SINTESE] Parse + Score` aplica os pesos do CONFIG: `nota = Σ(eixo·peso)/100`. Cortes: Escala ≥75 · Profissionalize-se 45-74 · Iniciante <45. Pesos default: 30/25/20/15/10.

## Painel de edição (nó `⚙️ CONFIG (pesos e cortes)`)
Tudo editável está aqui: PESOS, CORTES, STATUS_VALUE, PERFIL_NO_CONTATO, CLOSER_POR_PERFIL (tabela owner→ID pronta), APIFY_TOKEN, APIFY_ACTOR e **IMERSAO** (nome/url/descrição da oferta — hoje **The Best Weekend**).

## Instagram (Apify) — auto-descoberta
- Actor: **`apify~instagram-scraper`** (não o profile-scraper). Input via `directUrls` + `resultsType: "details"` + `resultsLimit: 12`. Token no CONFIG (`APIFY_TOKEN`).
- `[APIFY] Prepara` descobre o @ em 2 fontes, nesta ordem: **1) cadastro** (`instagram_url`); **2) o `instagram_confirmado` que o Pesquisador Web devolve** (auto-descoberta). Valida o handle (rejeita LinkedIn/lixo, protocolo opcional) antes de gastar chamada.
- `[APIFY] Normaliza` marca status: ok / privado_bloqueado / nao_encontrado / sem_handle (com `motivo`: vazio/linkedin/handle_invalido) / apify_nao_configurado. Também reporta `origem_handle` (cadastro/web).
- O Pesquisador Web tem instrução explícita de preencher `instagram_confirmado` só com @ confirmado por âncora (trava anti-homônimo).

## Rapport + Pontes pra imersão (v4+)
A síntese gera, além dos eixos:
- `rapport_sugestoes` (3): aberturas de conversa curtas e específicas, ancoradas em fatos reais da pessoa.
- `pontes_imersao` (3): como conectar a pessoa à IMERSAO (do CONFIG), adaptadas por perfil (Escala/Profissionalize-se/Iniciante).
Renderizadas no accordion "Como abordar". A descrição da imersão é injetada no prompt da síntese a partir do CONFIG.

## Regra de tempo verbal (v4+)
A síntese distingue cargo **atual** de **anterior**. Na dúvida sobre vínculo vigente, usa passado ("atuou", "foi") em vez de presente. (Corrige bug em que empresa anterior aparecia como atual — ex.: dossiê da Emanuelle dizia "Atitus atualmente" sendo que ela já saiu.)

## Versão econômica (agente Web)
`[WEB] Chat Model` = **gpt-4.1-mini**; agente com **maxIterations: 15** e instrução de eficiência (mínimo 4 fetches). A síntese e o render seguem em Claude Sonnet 4.5 (qualidade preservada).

## Webhook — responde na hora (fim do loop de retry)
`Webhook B2C` usa `responseMode: onReceived` (responde 200 no recebimento) e processa em background. **Motivo:** o modo antigo (`responseNode`) respondia só depois de ~2min; o HubSpot atingia timeout, marcava falha e **reenviava** — cada retry rodava o fluxo inteiro (loop a cada ~1h24, um contato gerando dezenas de execuções). Não existe mais nó `Respond to Webhook`.

## Nota removida
O nó que criava Nota no contato foi **removido**: o escopo `crm.objects.notes.write` **não está disponível** pra chaves de serviço (Private App) deste portal ("isn't available for public use"). O link do dossiê já fica no contato em `hunter_dossie_html_url`, então a Nota era só conveniência.

## Write-back (no CONTATO) — `[HUBSPOT] Patch Contato` é o último nó
- `hunter_dossie_html_url` (link), `score_dossie` (número), `status_do_dossie` ("Atualizado"), `closer_da_agenda` (se mapeado).
- `perfil` NÃO existe no contato por padrão (só no deal). Se criar um `perfil` (dropdown 3 opções) no contato, vire `PERFIL_NO_CONTATO=true`.
- Usuário copia contato→deal manualmente.

## Dependências no n8n
- **Credencial HubSpot dedicada "Dossiê B2C HubSpot"** (Header Auth, id **`vqUunHD1VWP4x0gI`**) — usada nos 3 nós HubSpot (Get Contato, Assoc Notas, Patch Contato). Desacoplada da "Hunter B2B" pra não interferir no B2B. Header: `Name: Authorization` / `Value: Bearer <pat-na1-...>`. Escopos: `crm.objects.contacts.read` + `crm.objects.contacts.write` (notes não existe neste portal).
- Credencial **Apollo API** (id `sCYqAEZD63JgxpLV`).
- Credencial **Anthropic** (`nKIdBl0STB9kFSez`) e **OpenAI** (`xsLRnqjf6a6ia2JG`).
- Sub-workflows **[SUB] Tavily Search** (`OLMdRptl3QZjtqxY`) e **[SUB] Jina Fetch** (`8H1bPjUktvfgoUzD`).
- Endpoint de upload do dossiê: `https://psa-ia-board.vercel.app/api/dossie`.

## Como testar (sem depender do HubSpot)
Bater direto no webhook (n8n Active + só um workflow no path). Do bash real (o `curl` do PowerShell é alias do Invoke-WebRequest e não aceita `-H`):
```
curl -sS -X POST "https://n8n.profissionaissa.tchat.telnet23.com.br/webhook/dossie-b2c-palestrante" -H "Content-Type: application/json" -d '{"id_contato":"212000917863"}'
```
No PowerShell: `Invoke-RestMethod -Uri "..." -Method Post -ContentType "application/json" -Body '{"id_contato":"212000917863"}'`.
Contato de teste usado: Arthur (212000917863) e Emanuelle. Gatilho manual no HubSpot: propriedade `teste_dossie=true` (com re-enrollment ligado; toggle false→true dispara). Lembrar de desligar depois pra não acumular execuções.

## Pendências / próximos passos
1. Ao ativar em produção: garantir gatilho do HubSpot (workflow que dá "Send webhook" quando o negócio B2C entra em "Reunião Agendada" e `hunter_dossie_html_url` é desconhecido) e URL `/webhook/` (não `/webhook-test/`).
2. Preencher `CLOSER_POR_PERFIL` com os 3 IDs.
3. Só um workflow ativo no path `dossie-b2c-palestrante` (desativar/apagar versões antigas).
4. (Estratégia) The Best Weekend é pra quem JÁ palestra; perfil "Iniciante" pode pedir outra oferta. Se houver produto pra iniciantes, dá pra fazer o CONFIG escolher a imersão por perfil.
5. (Opcional) criar `perfil` no contato e ligar `PERFIL_NO_CONTATO`.
6. (Opcional) trava anti-duplicidade: se `hunter_dossie_html_url` já preenchido, encerra sem refazer. Cuidado: quebra re-testes no mesmo contato.

## Gatilho (feito pelo usuário no HubSpot)
Workflow de contato: enrolls quando "Hunter Dossiê HTML URL é desconhecido" E o Negócio associado está em "Reunião Agendada / Qualificado (Funil de Vendas B2C)" → ação "Send webhook" POST pra URL do n8n. (Em teste, usou-se a propriedade `teste_dossie`.)
