# Dossiê B2C — Palestrante Candidato · HANDOFF

Documento de continuidade. Se você (ou o Claude em outra máquina) abrir isto, tem o estado completo do projeto.

## O que é
Fluxo n8n que, quando um lead B2C entra na etapa **"Reunião Agendada / Qualificado"** (Funil de Vendas B2C) no HubSpot, gera automaticamente um dossiê do candidato a palestrante: enriquece dados, dá nota 0-100, define Perfil (Escala / Profissionalize-se / Iniciante), sugere closer e grava tudo no **contato**. Espelha o Hunter B2B ("SDR Farmer / Dossiê Empresas").

## Arquivos aqui
- `Dossie_B2C_Palestrante.json` — workflow n8n importável (Import from File).
- `gen_b2c.js` — gerador do workflow. **Edite este e rode `node gen_b2c.js`** pra regenerar o JSON (mais seguro que editar o JSON à mão). Ele lê o CSS do dossiê B2B a partir de `~/Downloads/SDR Farmer _ primeira maquina - Dossiê Empresas.json` (ajuste `B2B_PATH` se mover).

## Arquitetura (36 nós)
`Webhook → CONFIG → Get Contato → [LEAD] Base → 4 coletores paralelos → Merge → Aggrega → Síntese (Claude) → Parse+Score → Render HTML → Upload → write-back no contato → Nota → Respond`

Coletores: **HubSpot** (form+CRM), **Apollo** (cargo/trajetória), **Web** (Tavily+Jina: Google/imprensa), **Apify** (Instagram estruturado).

## Score / Perfil
LLM avalia 5 eixos (0-100): audiência, repertório_palco, autoridade_tema, ambição_realismo, urgência_timing. O nó `[SINTESE] Parse + Score` aplica os pesos do CONFIG:
`nota = Σ(eixo·peso)/100`. Cortes: Escala ≥75 · Profissionalize-se 45-74 · Iniciante <45.
Pesos default: 30/25/20/15/10.

## Painel de edição
Tudo editável está no nó **`⚙️ CONFIG (pesos e cortes)`**: PESOS, CORTES, STATUS_VALUE, PERFIL_NO_CONTATO, CLOSER_POR_PERFIL (com tabela owner→ID), APIFY_TOKEN, APIFY_ACTOR.

## Write-back (no CONTATO)
- `hunter_dossie_html_url` (link do dossiê), `score_dossie` (número), `status_do_dossie` ("Atualizado"), `closer_da_agenda` (se mapeado).
- `perfil` NÃO existe no contato (só no deal) → sai na Nota. Se criar um `perfil` (dropdown 3 opções) no contato, vire `PERFIL_NO_CONTATO=true`.
- Nota associada ao contato (typeId 202). Usuário copia contato→deal manualmente.

## Trava de identidade (anti-homônimo)
O pesquisador recebe âncoras (LinkedIn, cargo, empresa, cidade, domínio de e-mail) e só usa fontes que confirmam ao menos um âncora; descarta homônimos. A síntese prioriza o declarado no HubSpot. (Bug corrigido: dossiê do Arthur vinha com "barbeiro" e IG errado por homônimo.)

## Instagram bloqueado
`[APIFY] Normaliza` marca status: ok / privado_bloqueado / nao_encontrado / sem_handle / apify_nao_configurado. A síntese avisa no dossiê e registra nos entraves.

## Dependências no n8n (reusadas do B2B)
- Credencial **Hunter B2B HubSpot** (Header Auth, id `in5KFjziH1wjm6Cx`) — usada em TODOS os nós HubSpot (Get/PATCH/POST). Sem token cru no JSON (removido por causa do push protection do GitHub).
- Credencial **Apollo API** (id `sCYqAEZD63JgxpLV`).
- Credencial **Anthropic** (`nKIdBl0STB9kFSez`) e **OpenAI** (`xsLRnqjf6a6ia2JG`).
- Sub-workflows **[SUB] Tavily Search** (`OLMdRptl3QZjtqxY`) e **[SUB] Jina Fetch** (`8H1bPjUktvfgoUzD`).
- Endpoint de upload do dossiê: `https://psa-ia-board.vercel.app/api/dossie`.

## Pendências / próximos passos
1. Trocar `webhook-test` → `webhook` na URL do HubSpot ao ativar o fluxo (produção).
2. Preencher `CLOSER_POR_PERFIL` com os 3 IDs (quem atende cada perfil).
3. Colar `APIFY_TOKEN` no CONFIG (e confirmar se o formulário captura o @ do Instagram; sem o @, precisa validar handle).
4. (Opcional) criar `perfil` no contato e ligar `PERFIL_NO_CONTATO`.
5. (Opcional) trava anti-duplicidade no início: se `hunter_dossie_html_url` já preenchido, encerra sem refazer.
6. (Opcional) versão econômica: reduzir maxIterations e usar gpt-4.1-mini no agente web.

## Gatilho (feito pelo usuário no HubSpot)
Workflow de contato: enrolls quando "Hunter Dossiê HTML URL é desconhecido" E o Negócio associado está em "Reunião Agendada / Qualificado (Funil de Vendas B2C)" → ação "Send webhook" POST pra URL do n8n.
