# TBS 2026 — Dashboard

Painel de inscrições, funil, parceiros e gaps de tagueamento do **The Best Speaker 2026**, alimentado com dados reais do HubSpot (portal 49656171).

## Stack
- Next.js 14 (app router) + TypeScript
- Tailwind CSS com tema TBS (laranja gradient `#D14A0F → #F08220 → #FFA52A`)
- Recharts para gráficos
- Snapshot em `data/snapshot.json` regenerável via HubSpot API

## Rodar localmente
```bash
cd tbs-2026-dashboard
npm install
npm run dev
# abre em http://localhost:3030
```

## Atualizar dados (HubSpot)
1. No HubSpot: **Settings → Integrations → Private Apps → Create**. Scope mínimo: `crm.objects.contacts.read`. Copia o token (formato `pat-na1-...`).
2. Cria `.env` na raiz com `HUBSPOT_TOKEN=pat-na1-...`
3. Rodar `npm run refresh` (CLI) ou `POST /api/refresh-snapshot` (server).

O snapshot é commitado para que o dashboard funcione sem token. Em produção, agendar o refresh.

## O que tem no dashboard
1. **Timeline das 4 fases** (Inscrições / Vídeos / Votação / Final) — datas oficiais do site.
2. **KPIs grandes** — TBS 2026, interesse pré-lançamento, TBS 2025, TBS 2024, vídeos enviados, classificados.
3. **Funil TBS 2025** — base de referência das 7 etapas com taxas de conversão.
4. **Time series YoY** — inscrições por mês 2024 vs 2025 vs 2026.
5. **Origem & canais** — `tbs___origem_macro` + `hs_analytics_source` (com alerta sobre 93% OFFLINE).
6. **Tabela de parceiros** — ranking com normalização de aliases (3 versões da Janaína Rost → 1).
7. **Demografia** — momento atual / interesse 2026 / região (com alerta de dados insuficientes).
8. **Alertas de gaps de tagueamento** — 5 problemas que precisam ser resolvidos antes do TBS abrir em 01/06.

## Decisões pendentes (precisam vir do usuário)
- Lista oficial de parceiros 2026 → quando fechar, atualizar enum em `nome_do_parceiro` no HubSpot.
- Adicionar `TBS 2025` como opção em `tbs___origem_macro` no HubSpot UI.
- Backfill de `tbs___origem_macro = TBS 2025` em contatos criados entre 2025-06-01 e 2025-12-01 (pode rodar via API depois da opção existir).
- Pergunta de UF/região no form de inscrição 2026.
- Modelo de pagamento de parceiros não está no dashboard (fora de escopo no MVP).

## Próximos passos sugeridos
- Drill-down por parceiro (clicar abre lista de inscritos)
- Mapa do Brasil com `regiao_tbs` (após backfill 2026)
- Compartilhamento como link público
- Webhook do HubSpot para refresh em tempo real

## Memória da sessão
Decisões e gaps documentados em:
- `memory/project_tbs_2026.md`
- `memory/reference_tbs_hubspot.md`
