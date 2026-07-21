# Pesquisa Inovação — Dashboard

Dashboard de performance dos disparos `[PSA] Pesquisa - Inovação - *` com botão de atualização em tempo real contra o HubSpot Marketing Email API.

## Setup (5 min)

```bash
cd pesquisa-inovacao-dashboard
npm install
cp .env.example .env
# edite .env e cole seu HUBSPOT_TOKEN
npm start
```

Abra http://localhost:4173 e clique em **Atualizar** no topo.

## Como obter o `HUBSPOT_TOKEN`

1. HubSpot → Settings → Integrations → **Private Apps** → "Create a private app"
2. Em **Scopes**, marque `content` (leitura de marketing emails) ou `marketing.campaigns.read`
3. Copie o token gerado (`pat-na1-...`) e cole em `.env` como `HUBSPOT_TOKEN`

## Identificar os 5 e-mails

Duas formas — preencha **uma** delas em `.env`:

**A. Por ID (mais preciso)** — pega o ID na URL do e-mail no HubSpot:
```
EMAIL_IDS=12345678,12345679,12345680,12345681,12345682
```

**B. Por prefixo de nome (default)** — busca todos os e-mails que começam com:
```
EMAIL_NAME_PREFIX=[PSA] Pesquisa - Inovação
```

## Como funciona o botão "Atualizar"

1. Browser faz `POST /api/refresh`
2. Servidor Node chama o HubSpot, busca os e-mails e suas estatísticas
3. Salva em `data.json` e devolve o JSON
4. Página re-renderiza KPIs, cards de segmento, barras e tabela
5. Badge "Live" aparece ao lado de "HubSpot Marketing Email" no topo

Sem rodar o servidor, o dashboard ainda funciona com o snapshot estático do `data.json` (badge "Snapshot").

## Trocar o benchmark

Edite no `.env`:
```
BENCHMARK_OPEN_RATE=22
BENCHMARK_CLICK_RATE=2.5
```

Os cards "vs. expectativa" e as marcas de benchmark nos gráficos recalculam automaticamente.

## Editar descrição/badge de cada segmento

As descrições e os badges customizados ficam em `data.json`. O `/api/refresh` mantém os campos `name`, `delivered`, `opens`, `clicks`, `openRate`, `clickRate` atualizados, mas se você quiser persistir `description` e `badge` próprios, edite manualmente no `data.json` depois do primeiro refresh — ou ajuste a função `buildSegment()` em `server.mjs` para preservar.

## Troubleshooting

- **"HUBSPOT_TOKEN não configurado"** → preencha `.env` (não `.env.example`)
- **"Nenhum e-mail encontrado"** → confirme `EMAIL_NAME_PREFIX` ou use `EMAIL_IDS`
- **HubSpot 401** → token sem o scope `content`
- **HubSpot 403** → Private App não tem acesso ao asset; verifique permissões
