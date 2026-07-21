# PSA · Dashboard de Custos & Uso do Claude

Painel Next.js (porta **3070**) com **custos e utilização reais** de Claude/Claude Code do grupo PSA.
Fonte oficial: **CSV de Analytics do claude.ai** (plano Team). Processa tudo **no navegador** — nenhum dado sai da máquina.

## Rodar

```bash
cd "psa-custos-claude"
npm install
npm run dev        # http://localhost:3070
```

## De onde vem o dado (grupo PSA)

O PSA usa **Claude Team** → o dado do grupo está no claude.ai, não no Console de API.

1. Peça acesso **Owner / Primary Owner** no Team (ou que o Owner faça o export).
2. No **claude.ai** → clique nas **iniciais (canto inferior esquerdo)** → **Analytics**.
3. Aba **Claude Code** (ou **Usage/Spend**) → **Export CSV**. Vai até 90 dias, atualizado diariamente.
4. Arraste o CSV pra área de upload do painel (ou "Trocar CSV").

> No plano **Team**, o gasto em US$ do CSV cobre sobretudo **overage**; o uso dentro da cota do assento aparece em **tokens** e o painel dolariza pelo **valor-equivalente de API**. Billing real do Team = assentos × preço do assento (configurável no card "Plano & ROI").

## CSV — colunas reconhecidas

O parser auto-detecta os cabeçalhos (nomes flexíveis, PT/EN). Se algo não mapear, use o painel
**"Mapeamento de colunas"** pra apontar manualmente. Campos:

| Campo | Exemplos de cabeçalho |
|---|---|
| Usuário | `email`, `user`, `member`, `usuário`, `name` |
| Data | `date`, `day`, `data`, `timestamp` |
| Modelo | `model`, `modelo` |
| Tokens entrada | `input_tokens`, `prompt_tokens`, `tokens entrada` |
| Tokens saída | `output_tokens`, `completion_tokens` |
| Cache leitura / escrita | `cache_read...`, `cache_creation...` |
| Tokens total | `total_tokens`, `tokens` |
| Custo | `cost`, `spend`, `usd`, `gasto`, `custo` |

Se não houver coluna de custo, o painel calcula o **valor-equivalente** pelos preços de API
(`lib/pricing.js`) — Opus 5/25, Sonnet 3/15, Haiku 1/5, Fable 10/50 por 1M tokens;
cache leitura 0,1× / escrita 1,25× da entrada.

## Amostra

`public/sample-local.json` é a agregação **real dos logs desta máquina** (uma conta só),
usada como bootstrap. Clique em **"Ver com amostra"** — está claramente marcada como
"não é o grupo". Para o grupo inteiro, use o CSV do claude.ai.

## Alternativa (não implementada): OpenTelemetry ao vivo

Claude Code tem OTEL nativo (`CLAUDE_CODE_ENABLE_TELEMETRY=1` + `OTEL_EXPORTER_OTLP_ENDPOINT`).
Aponta cada máquina pra um coletor → Prometheus/Grafana pra métricas em tempo real por usuário.
Exige infra + rollout por máquina; o caminho CSV foi o escolhido por ser oficial e sem infra.
