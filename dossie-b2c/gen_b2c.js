const fs = require("fs");
const os = require("os");
const path = require("path");

// ---------- helpers ----------
const nodes = [];
const connections = {};
let idc = 0;
const uid = () => "n" + (++idc).toString().padStart(3, "0");
function add(name, type, params, opts = {}) {
  const n = { parameters: params || {}, id: uid(), name, type, typeVersion: opts.typeVersion || 1, position: opts.position || [0, 0] };
  if (opts.credentials) n.credentials = opts.credentials;
  if (opts.disabled) n.disabled = true;
  nodes.push(n); return name;
}
function conn(from, to, fromIdx = 0) {
  connections[from] = connections[from] || {};
  connections[from].main = connections[from].main || [];
  while (connections[from].main.length <= fromIdx) connections[from].main.push([]);
  connections[from].main[fromIdx].push({ node: to, type: "main", index: 0 });
}
function connInto(from, to, toIdx) {
  connections[from] = connections[from] || {};
  connections[from].main = connections[from].main || [[]];
  connections[from].main[0].push({ node: to, type: "main", index: toIdx });
}
function sub(from, to, kind) {
  connections[from] = connections[from] || {};
  connections[from][kind] = connections[from][kind] || [[]];
  connections[from][kind][0].push({ node: to, type: kind, index: 0 });
}

// ---------- credentials ----------
const CRED = {
  hsHeader: { httpHeaderAuth: { id: "vqUunHD1VWP4x0gI", name: "Dossiê B2C HubSpot" } },
  apollo: { httpHeaderAuth: { id: "sCYqAEZD63JgxpLV", name: "Apollo API" } },
  anthropic: { anthropicApi: { id: "nKIdBl0STB9kFSez", name: "Anthropic account" } },
  openai: { openAiApi: { id: "xsLRnqjf6a6ia2JG", name: "OpenAi account" } },
};
// HubSpot: os nós Get/PATCH usam a credencial dedicada "Dossiê B2C HubSpot" (id vqUunHD1VWP4x0gI), sem token no JSON.
const DOSSIE_ENDPOINT = "https://psa-ia-board.vercel.app/api/dossie";
const DOSSIE_TOKEN = "671cadd1060dc205d21f0bf991c6ceae2ca2f8a7091036f1ddd1609ae626d674";

// CSS do design system: extrai VERBATIM do dossiê B2B
// Caminho portável: procura em ~/Downloads (funciona em qualquer PC). Ajuste se mover o arquivo.
const B2B_PATH = path.join(os.homedir(), "Downloads", "SDR Farmer _ primeira maquina - Dossiê Empresas.json");
const b2bWf = JSON.parse(fs.readFileSync(B2B_PATH, "utf8"));
const injB2B = b2bWf.nodes.find((n) => n.name === "[RENDER] Inject Template").parameters.jsCode;
const CSS_ESCAPED = injB2B.match(/const css = "([\s\S]*?)";\s*\n\s*const footer/)[1];

// ============================================================
// 0. TRIGGER (recebe webhook do workflow do HubSpot)
// ============================================================
// responseMode "onReceived": responde 200 IMEDIATAMENTE ao HubSpot e segue processando em background.
// Evita o loop de retry do HubSpot (timeout de segundos vs. fluxo de ~2min).
add("Webhook B2C", "n8n-nodes-base.webhook", { httpMethod: "POST", path: "dossie-b2c-palestrante", responseMode: "onReceived", responseCode: 200, responseData: "Dossie B2C recebido, processando.", options: {} },
  { typeVersion: 2, position: [-220, 420] });

// ============================================================
// 1. CONFIG  -> EDITE SOMENTE ESTE BLOCO
// ============================================================
const configCode = `// =====================================================================
//  PAINEL DE CONTROLE DO DOSSIE B2C  ->  EDITE SOMENTE ESTE BLOCO
// =====================================================================
// PESOS de cada eixo (soma = 100). O LLM avalia cada eixo 0-100 e o workflow calcula:
//   nota_final = SOMA(eixo * peso) / 100
const PESOS = {
  audiencia:          30,
  repertorio_palco:   25,
  autoridade_tema:    20,
  ambicao_realismo:   15,
  urgencia_timing:    10
};

// CORTES -> Perfil (nota 0-100)
const CORTES = { escala: 75, profissionalize: 45 }; // >=75 Escala | 45..74 Profissionalize-se | <45 Iniciante

// Valor gravado em status_do_dossie (campo so aceita: "Atualizado" ou "Desatualizado")
const STATUS_VALUE = "Atualizado";

// APIFY (Instagram). Cole seu token. Enquanto vazio, o fluxo roda sem os numeros do IG.
// Actor: instagram-scraper (input via directUrls + resultsType "details").
const APIFY_TOKEN = "apify_api_2QW5d2WPeEgDn7f2AcxIGgdz9Tthtp0EMBTk";  // token Apify
const APIFY_ACTOR = "apify~instagram-scraper";   // Actor escolhido (apify/instagram-scraper)

// IMERSAO (produto B2C de palestrante). Edite nome e descricao. A IA usa isto para gerar as
// "pontes de convite" no dossie (como conectar a pessoa a esta oferta).
const IMERSAO = {
  nome: "The Best Weekend",
  url: "https://profissionaissa.com.br/the-best-weekend/",
  descricao: "imersao presencial e intensiva de 3 dias da PSA para palestrantes acelerarem a carreira. Em 3 dias a pessoa sai com posicionamento definido, palestra estruturada e um modelo de vendas testado e validado, aplicando o Metodo PSA. Inclui apresentacao de pocket speech com feedback individualizado e networking qualificado com grandes palestrantes. Nao e curso nem aula: e pratica real, mao na massa. Vagas limitadas por turma."
};

// Funil de Vendas B2C. Usado para gravar o Perfil no negocio CERTO quando o contato tem varios negocios.
const PIPELINE_B2C = "725182862";

// Gravar o Perfil no CONTATO? So funciona depois que voce criar uma propriedade
// "perfil" (dropdown: Escala / Profissionalize-se / Iniciante) no objeto Contato.
// Enquanto false, o Perfil sai apenas na Nota. Vire true quando criar a propriedade.
const PERFIL_NO_CONTATO = false;

// MAPA Perfil -> Closer (value = ID do owner em closer_da_agenda). "" = nao grava.
const CLOSER_POR_PERFIL = {
  "Escala":            "",
  "Profissionalize-se":"",
  "Iniciante":         ""
};
// ---- TABELA owner -> ID (para preencher o mapa acima) ---------------
// Ricardo Palma=61352275 | Eduardo Tavares=79405596 | Renato Claser Denck=79453133
// Leonardo Marcondes Moreira=79453134 | Amanda de Oliveira=79760676 | Diego Conceicao=79760744
// Thiago Berto=79760745 | Mayda Quadros=79760746 | Aline Maurente=79990679
// Leonardo Bonetti Kirsch=80169105 | Lucas Oliveira=80169395 | Jhuly Correa de Carvalho=80228367
// Eduardo Pereira Freitas=80343399 | Marcio Spagnolo=80436289 | Nicollas Lenuzza=80454573
// Eduardo Vince=80454576 | Daniel Bento Sias=80454577 | Katyeli Ceroni Madril=80454582
// Gabriela Vielmo Miranda=80454583 | Cesar Filho=80454584 | Leandro Bengochea=80454585
// Rafael Teixeira=80454586 | Joao Gabriel Marins Pereira=80454588 | Leticia Silva dos Santos=80454607
// Catarina Varoni Borges=80651489 | Rafael Brack=80688884 | Elenice Dias=80959643
// Gustavo Pacheco=81033487 | Camila Fay=81035544 | Igor Oliveira=81043824 | Luciana Freitas=81191551
// Enzo Albornoz Braga=81528369 | Bruna Dias Simoni=81609856 | Arthur Dorneles=81780832
// Audren Ferrao=81878113 | Max=82068976 | Giovana Bastos da Fontoura=82603870 | Priscila Beckel=83754977
// Amanda Mendonca Duarte=84015882 | Tercio Ferreira da Silva=84249251 | Vitoria Garcia Schaeffer=84497577
// Bernardo Luiz Haab=84612836 | Victor Okajima=84740875 | Rafael de Azevedo Charlau=84793065
// Bruna Machado=85002012 | Francielle Lenz=85846971 | Daniela Silva=85846972 | Yaskara Concato=86184663
// =====================================================================
//  FIM DO PAINEL DE CONTROLE
// =====================================================================

// Extrai o ID do contato do payload do HubSpot (formato varia). Tenta varias chaves.
const b = $('Webhook B2C').first().json.body || $('Webhook B2C').first().json || {};
const props = b.properties || {};
const pick = (o, k) => (o && o[k] != null ? (typeof o[k] === 'object' && o[k].value != null ? o[k].value : o[k]) : null);
const id_contato = String(
  b.id_contato || b.contactId || b.objectId || b.vid || b.hs_object_id ||
  pick(props, 'hs_object_id') || b['Record ID'] || ''
);

return [{ json: { cfg: { PESOS, CORTES, STATUS_VALUE, PERFIL_NO_CONTATO, CLOSER_POR_PERFIL, APIFY_TOKEN, APIFY_ACTOR, IMERSAO, PIPELINE_B2C }, lead: { id_contato } } }];`;
add("⚙️ CONFIG (pesos e cortes)", "n8n-nodes-base.code", { jsCode: configCode }, { typeVersion: 2, position: [0, 420] });
conn("Webhook B2C", "⚙️ CONFIG (pesos e cortes)");

// ============================================================
// 2. GET CONTATO -> LEAD BASE (fonte unica de identidade)
// ============================================================
add("[HUBSPOT] Get Contato", "n8n-nodes-base.httpRequest", {
  url: "=https://api.hubapi.com/crm/v3/objects/contacts/{{ $('⚙️ CONFIG (pesos e cortes)').item.json.lead.id_contato }}",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  sendQuery: true,
  queryParameters: { parameters: [{ name: "properties", value: "firstname,lastname,email,phone,mobilephone,jobtitle,company,city,state,estado_tbs,estado__menu_suspenso_,qual_a_sua_idade,qual_sua_idade_,seu_momento_profissional_atual,e_palestrante,qual_sua_urgncia_em_se_desenvolver_como_palestrante,tema,macro_tema,linkedin_url,hs_linkedin_url,linkedinbio,qual_o_perfil_do_instagram_ou_linkedin_dele_a__,hs_lead_status,lifecyclestage,recent_conversion_event_name,createdate" }] },
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [240, 420], credentials: CRED.hsHeader });
conn("⚙️ CONFIG (pesos e cortes)", "[HUBSPOT] Get Contato");

const leadBase = `const CFG = $('⚙️ CONFIG (pesos e cortes)').first().json;
const c = ($('[HUBSPOT] Get Contato').first().json.properties) || {};
return [{ json: {
  cfg: CFG.cfg,
  lead: {
    id_contato: CFG.lead.id_contato,
    email: c.email || '',
    firstname: c.firstname || '',
    lastname: c.lastname || '',
    linkedin_url: c.linkedin_url || c.hs_linkedin_url || '',
    instagram_url: c.qual_o_perfil_do_instagram_ou_linkedin_dele_a__ || '',
    idade: c.qual_a_sua_idade || c.qual_sua_idade_ || '',
    estado: c.estado_tbs || c.estado__menu_suspenso_ || c.state || '',
    atuacao_hoje: c.seu_momento_profissional_atual || '',
    ja_palestrante: c.e_palestrante || '',
    urgencia: c.qual_sua_urgncia_em_se_desenvolver_como_palestrante || '',
    tema: c.tema || c.macro_tema || '',
    cargo: c.jobtitle || '',
    empresa: c.company || '',
    dominio_email: (c.email || '').split('@')[1] || ''
  },
  contato_props: c
}}];`;
add("[LEAD] Base", "n8n-nodes-base.code", { jsCode: leadBase }, { typeVersion: 2, position: [480, 420] });
conn("[HUBSPOT] Get Contato", "[LEAD] Base");

// ============================================================
// BRANCH A - HUBSPOT (form declarado + notas associadas)
// ============================================================
add("[HUBSPOT] Assoc Notas", "n8n-nodes-base.httpRequest", {
  url: "=https://api.hubapi.com/crm/v4/objects/contacts/{{ $('[LEAD] Base').item.json.lead.id_contato }}/associations/notes",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [760, 200], credentials: CRED.hsHeader });
conn("[LEAD] Base", "[HUBSPOT] Assoc Notas");

const hsNorm = `const lb = $('[LEAD] Base').first().json;
let notas = [];
try { notas = ($('[HUBSPOT] Assoc Notas').first().json.results || []).map(r => r.toObjectId); } catch(e){}
return [{ json: { hubspot: {
  form_declarado: lb.lead,
  contato_props: lb.contato_props,
  ids_notas: notas
} }}];`;
add("[HUBSPOT] Normaliza Output", "n8n-nodes-base.code", { jsCode: hsNorm }, { typeVersion: 2, position: [1000, 200] });
conn("[HUBSPOT] Assoc Notas", "[HUBSPOT] Normaliza Output");

// ============================================================
// BRANCH B - APOLLO (People Match)
// ============================================================
add("[APOLLO] People Match", "n8n-nodes-base.httpRequest", {
  method: "POST", url: "https://api.apollo.io/api/v1/people/match",
  authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth",
  sendHeaders: true, headerParameters: { parameters: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-cache" }] },
  sendBody: true, specifyBody: "json",
  jsonBody: "={\n  \"email\": \"{{ $('[LEAD] Base').item.json.lead.email }}\",\n  \"first_name\": \"{{ $('[LEAD] Base').item.json.lead.firstname }}\",\n  \"last_name\": \"{{ $('[LEAD] Base').item.json.lead.lastname }}\",\n  \"linkedin_url\": \"{{ $('[LEAD] Base').item.json.lead.linkedin_url }}\",\n  \"reveal_personal_emails\": false,\n  \"reveal_phone_number\": false\n}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [760, 420], credentials: CRED.apollo });
conn("[LEAD] Base", "[APOLLO] People Match");

const apolloNorm = `const p = ($json.person) || ($json.people && $json.people[0]) || {};
const emp = (p.employment_history || []).slice(0,6).map(e => ({ periodo: (e.start_date||'')+' a '+(e.end_date||'atual'), cargo: e.title, org: e.organization_name }));
return [{ json: { apollo: {
  nome: [p.first_name,p.last_name].filter(Boolean).join(' '),
  cargo_atual: p.title || '', empresa_atual: (p.organization && p.organization.name) || '',
  cidade: [p.city,p.state,p.country].filter(Boolean).join(', '),
  linkedin_url: p.linkedin_url || '', headline: p.headline || '', seniority: p.seniority || '',
  funcoes: p.functions || [], trajetoria: emp
} }}];`;
add("[APOLLO] Normaliza Output", "n8n-nodes-base.code", { jsCode: apolloNorm }, { typeVersion: 2, position: [1000, 420] });
conn("[APOLLO] People Match", "[APOLLO] Normaliza Output");

// ============================================================
// BRANCH C - WEB (Pesquisador focado NA PESSOA)
// ============================================================
const webInput = { assignments: { assignments: [
  { id: "w1", name: "firstname", value: "={{ $('[LEAD] Base').item.json.lead.firstname }}", type: "string" },
  { id: "w2", name: "lastname", value: "={{ $('[LEAD] Base').item.json.lead.lastname }}", type: "string" },
  { id: "w3", name: "linkedin_url", value: "={{ $('[LEAD] Base').item.json.lead.linkedin_url }}", type: "string" },
  { id: "w4", name: "instagram_url", value: "={{ $('[LEAD] Base').item.json.lead.instagram_url }}", type: "string" },
  { id: "w5", name: "tema", value: "={{ $('[LEAD] Base').item.json.lead.tema }}", type: "string" },
  { id: "w6", name: "cidade", value: "={{ $('[LEAD] Base').item.json.lead.estado }}", type: "string" },
  { id: "w7", name: "cargo", value: "={{ $('[LEAD] Base').item.json.lead.cargo }}", type: "string" },
  { id: "w8", name: "empresa", value: "={{ $('[LEAD] Base').item.json.lead.empresa }}", type: "string" },
  { id: "w9", name: "dominio_email", value: "={{ $('[LEAD] Base').item.json.lead.dominio_email }}", type: "string" },
] }, options: {} };
add("[WEB] Prepara Input", "n8n-nodes-base.set", webInput, { typeVersion: 3.4, position: [760, 660] });
conn("[LEAD] Base", "[WEB] Prepara Input");

const webSystem = `Voce e o Pesquisador Web do Dossie B2C da PSA (curadoria de palestrantes). Alvo: UMA PESSOA especifica candidata a palestrante.

=== TRAVA DE IDENTIDADE (REGRA #1, ACIMA DE TUDO) ===
Nomes se repetem. Existe risco ALTO de homonimo (outra pessoa com o mesmo nome). Sua prioridade #1 e garantir que TODA informacao pertence a ESTA pessoa, identificada pelos ancoras abaixo (recebidos no input): LinkedIn, Instagram, cargo, empresa, cidade, dominio de email.

REGRAS:
1. So atribua um fato a pessoa se a fonte CONFIRMAR pelo menos um ancora forte (mesmo perfil de LinkedIn/Instagram informado, OU mesma empresa + cidade, OU mesmo dominio de email).
2. Se um resultado tem o nome certo mas NAO confirma nenhum ancora (empresa/cidade/handle diferentes), trate como OUTRA PESSOA e DESCARTE. Registre em "descartados_por_homonimo".
3. NUNCA chute o Instagram/LinkedIn por nome. So use handles que (a) foram informados no input, ou (b) voce confirmou que pertencem a esta pessoa (bio cita a empresa/cargo/cidade certos). Se nao houver Instagram informado nem confirmavel, deixe "nao captado".
4. Na duvida entre atribuir ou descartar, DESCARTE. Melhor um bucket vazio do que um fato de outra pessoa.
5. Nunca invente: ausencia e informacao ("nao captado").

FILOSOFIA: dentro da trava de identidade, busque fundo. Capture bastante, mas SO desta pessoa.

FERRAMENTAS: web_search (Tavily, queries curtas 2-6 palavras pt-BR, aceita site: e frase exata) e web_fetch (Jina, le a pagina inteira; use apos achar URL, minimo 4 fetches). Seja eficiente: priorize as fontes mais promissoras e nao repita buscas parecidas.

DATA ATUAL: julho de 2026. Priorize 2025-2026.

7 BUCKETS (retorne JSON puro com estas chaves):
1. audiencia_social: seguidores Instagram e LinkedIn (numeros), plataformas ativas, frequencia de post, engajamento aparente. Handles/URLs.
2. producao_conteudo: sobre o que posta/fala, formatos, consistencia, 3 temas recorrentes.
3. repertorio_palco: evidencias de ja ter palestrado (fotos em palco, eventos, cursos, portfolio, canal, livro), cada um com URL.
4. autoridade_tema: formacao, certificacoes, cargos, premios, mencoes em imprensa/podcasts, cada um com fonte.
5. referencias_citadas: quem admira/cita/segue; linguagem/tom que usa.
6. momento_de_vida: transicao de carreira, lancamento recente, o que a empolga hoje.
7. ultimos_posts: 3 a 5 posts recentes com 1 linha de resumo e link cada.
+ "ancoras_verificaveis": lista de fatos datados e com fonte que o closer pode citar.
+ "instagram_confirmado": SE e SOMENTE SE voce confirmou (via ancoras) que um Instagram pertence a ESTA pessoa, coloque aqui APENAS o @handle (sem URL, sem @, ex.: "joao.silva"). Se nao houver Instagram confirmavel, deixe "". NUNCA chute por nome, NUNCA coloque handle de homonimo. Este campo alimenta uma coleta automatizada, entao so preencha com certeza.`;
add("[WEB] Pesquisador Agent", "@n8n/n8n-nodes-langchain.agent", {
  promptType: "define",
  text: "=Pesquise sobre a pessoa ESPECIFICA abaixo. Aplique a TRAVA DE IDENTIDADE.\n\nNome: {{ $json.firstname }} {{ $json.lastname }}\nTema declarado: {{ $json.tema }}\n\nANCORAS DE IDENTIDADE (use para confirmar que os resultados sao dela):\n- LinkedIn: {{ $json.linkedin_url }}\n- Instagram informado: {{ $json.instagram_url }}\n- Cargo: {{ $json.cargo }}\n- Empresa: {{ $json.empresa }}\n- Cidade/estado: {{ $json.cidade }}\n- Dominio de email: {{ $json.dominio_email }}\n\nDescarte qualquer resultado que nao confirme ao menos um ancora. Preencha os 7 buckets (+ descartados_por_homonimo). JSON puro.",
  options: { systemMessage: webSystem, maxIterations: 15 },
}, { typeVersion: 1.9, position: [1000, 660] });
conn("[WEB] Prepara Input", "[WEB] Pesquisador Agent");

add("[WEB] Chat Model", "@n8n/n8n-nodes-langchain.lmChatOpenAi", { model: { __rl: true, mode: "list", value: "gpt-4.1-mini" }, options: {} },
  { typeVersion: 1.2, position: [960, 880], credentials: CRED.openai });
sub("[WEB] Chat Model", "[WEB] Pesquisador Agent", "ai_languageModel");

add("web_search", "@n8n/n8n-nodes-langchain.toolWorkflow", {
  description: "Busca na web via Tavily. Queries curtas 2-6 palavras, pt-BR. Aceita site: e frase exata.",
  workflowId: { __rl: true, cachedResultName: "[SUB] Tavily Search", mode: "list", value: "OLMdRptl3QZjtqxY" },
  workflowInputs: { mappingMode: "defineBelow", matchingColumns: [], schema: [{ canBeUsedToMatch: true, display: true, displayName: "query", id: "query", required: true, type: "string" }],
    value: { query: "={{ $fromAI('query', 'Termo curto 2-6 palavras, sem aspas duplas', 'string') }}" } },
}, { typeVersion: 2.2, position: [1100, 880] });
sub("web_search", "[WEB] Pesquisador Agent", "ai_tool");

add("web_fetch", "@n8n/n8n-nodes-langchain.toolWorkflow", {
  description: "Le o conteudo completo de uma pagina web (markdown) via Jina. Use apos achar URL no web_search.",
  workflowId: { __rl: true, cachedResultName: "[SUB] Jina Fetch", mode: "list", value: "8H1bPjUktvfgoUzD" },
  workflowInputs: { mappingMode: "defineBelow", matchingColumns: [], schema: [{ canBeUsedToMatch: true, display: true, displayName: "url", id: "url", required: true, type: "string" }],
    value: { url: "={{ $fromAI('url', 'URL publica completa', 'string') }}" } },
}, { typeVersion: 2.2, position: [1240, 880] });
sub("web_fetch", "[WEB] Pesquisador Agent", "ai_tool");

const webNorm = `const raw = $json.output || $json.text || '';
let parsed = null;
try { parsed = JSON.parse(String(raw).replace(/^\\\`\\\`\\\`json\\s*/i,'').replace(/\\\`\\\`\\\`\\s*$/,'').trim()); } catch(e){ parsed = { _raw: String(raw).slice(0,8000) }; }
return [{ json: { web: parsed } }];`;
add("[WEB] Normaliza Output", "n8n-nodes-base.code", { jsCode: webNorm }, { typeVersion: 2, position: [1400, 660] });
conn("[WEB] Pesquisador Agent", "[WEB] Normaliza Output");

// ============================================================
// BRANCH D - APIFY (Instagram estruturado)
// ============================================================
const apifyPrep = `// Descobre o @handle em 2 fontes: 1) cadastro (HubSpot); 2) Instagram confirmado pelo Pesquisador Web.
// O campo do HubSpot mistura Instagram e LinkedIn, entao validamos antes de gastar chamada Apify.
const lead = $('[LEAD] Base').first().json.lead;
const cfg = $('⚙️ CONFIG (pesos e cortes)').first().json.cfg;
let web = {};
try { web = ($('[WEB] Normaliza Output').first().json.web) || {}; } catch (e) {}
const candidatos = [
  { raw: String(lead.instagram_url || '').trim(), origem: 'cadastro' },
  { raw: String(web.instagram_confirmado || '').trim(), origem: 'web' }
];
let u = '', motivo = '', origem = '';
for (const c of candidatos) {
  if (!c.raw) continue;
  if (/linkedin\\.com/i.test(c.raw)) { if (!motivo) motivo = 'linkedin'; continue; }
  const cand = c.raw
    .replace(/^(https?:\\/\\/)?(www\\.)?instagram\\.com\\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();
  if (/^[a-zA-Z0-9._]{1,30}$/.test(cand)) { u = cand; origem = c.origem; motivo = ''; break; }
  if (!motivo) motivo = 'handle_invalido';
}
if (!u && !motivo) motivo = 'vazio';
const tem_handle = !!u;
const directUrl = tem_handle ? ('https://www.instagram.com/' + u + '/') : '';
// Input do Actor apify/instagram-scraper: perfil + ultimos posts (resultsType "details").
const input = tem_handle ? { directUrls: [ directUrl ], resultsType: 'details', resultsLimit: 12, addParentData: false } : {};
return [{ json: { username: u, tem_handle, motivo, origem, directUrl, input, token: cfg.APIFY_TOKEN || '', actor: cfg.APIFY_ACTOR || 'apify~instagram-scraper' } }];`;
add("[APIFY] Prepara", "n8n-nodes-base.code", { jsCode: apifyPrep }, { typeVersion: 2, position: [1640, 900] });
// Apify roda DEPOIS da Web (usa o @ que a Web confirmou quando o cadastro nao tem).
conn("[WEB] Normaliza Output", "[APIFY] Prepara");

add("[APIFY] Instagram", "n8n-nodes-base.httpRequest", {
  method: "POST",
  url: "=https://api.apify.com/v2/acts/{{ $json.actor }}/run-sync-get-dataset-items?token={{ $json.token }}",
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ JSON.stringify($json.input) }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } }, timeout: 120000 },
}, { typeVersion: 4.2, position: [1840, 900] });
conn("[APIFY] Prepara", "[APIFY] Instagram");

const apifyNorm = `const prep = $('[APIFY] Prepara').first().json;
const resp = $json;
// sem handle valido no cadastro -> nada a buscar
if (!prep.tem_handle) {
  const notaPorMotivo = {
    vazio: 'Instagram nao informado no cadastro e nao confirmado pela pesquisa web.',
    linkedin: 'So havia LinkedIn (cadastro/web), nao um Instagram. Instagram nao coletado.',
    handle_invalido: 'O que foi encontrado nao parece um @ valido de Instagram. Instagram nao coletado.'
  };
  return [{ json: { apify: { instagram: { status: 'sem_handle', motivo: prep.motivo, nota: notaPorMotivo[prep.motivo] || 'Instagram nao informado.' } } } }];
}
// sem token configurado -> nao rodou
if (!prep.token) {
  return [{ json: { apify: { instagram: { status: 'apify_nao_configurado', username: prep.username, nota: 'Apify sem token configurado (preencha no CONFIG).' } } } }];
}
const arr = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.items) ? resp.items : (resp ? [resp] : []));
const p = arr[0] || {};
// erro / perfil nao encontrado
if (!p || p.error || (p.username == null && p.followersCount == null)) {
  return [{ json: { apify: { instagram: { status: 'nao_encontrado', username: prep.username, nota: 'Perfil nao encontrado ou retorno vazio do Apify.' } } } }];
}
const priv = (p.private === true) || (p.isPrivate === true);
const posts = (p.latestPosts || p.posts || []).slice(0,6).map(x => ({
  legenda: String(x.caption || '').slice(0,140),
  curtidas: (x.likesCount != null ? x.likesCount : null),
  comentarios: (x.commentsCount != null ? x.commentsCount : null),
  url: x.url || '', data: x.timestamp || x.takenAt || ''
}));
const comEng = posts.filter(x => x.curtidas != null);
const engaj = comEng.length ? Math.round(comEng.reduce((a,x)=>a+((x.curtidas||0)+(x.comentarios||0)),0)/comEng.length) : null;
return [{ json: { apify: { instagram: {
  status: priv ? 'privado_bloqueado' : 'ok',
  origem_handle: prep.origem,
  username: p.username || prep.username,
  seguidores: (p.followersCount != null ? p.followersCount : null),
  seguindo: (p.followsCount != null ? p.followsCount : null),
  posts_total: (p.postsCount != null ? p.postsCount : null),
  verificado: !!(p.verified || p.isVerified),
  bio: p.biography || '',
  engajamento_medio: engaj,
  ultimos_posts: priv ? [] : posts,
  nota: priv ? 'Perfil PRIVADO/bloqueado: seguidores visiveis, mas posts nao acessiveis.' : ''
} } } }];`;
add("[APIFY] Normaliza Output", "n8n-nodes-base.code", { jsCode: apifyNorm }, { typeVersion: 2, position: [2040, 900] });
conn("[APIFY] Instagram", "[APIFY] Normaliza Output");

// ============================================================
// MERGE -> AGGREGA -> SINTESE -> PARSE+SCORE
// ============================================================
add("Merge 4 Ramos", "n8n-nodes-base.merge", { numberInputs: 4 }, { typeVersion: 3.1, position: [1640, 420] });
connInto("[HUBSPOT] Normaliza Output", "Merge 4 Ramos", 0);
connInto("[APOLLO] Normaliza Output", "Merge 4 Ramos", 1);
connInto("[WEB] Normaliza Output", "Merge 4 Ramos", 2);
connInto("[APIFY] Normaliza Output", "Merge 4 Ramos", 3);

const aggCode = `const safe=(n)=>{try{return $(n).first().json||{};}catch(e){return{};}};
const hubspot=(safe('[HUBSPOT] Normaliza Output').hubspot)||{};
const apollo=(safe('[APOLLO] Normaliza Output').apollo)||{};
const web=(safe('[WEB] Normaliza Output').web)||{};
const apify=(safe('[APIFY] Normaliza Output').apify)||{};
const sz=(o)=>JSON.stringify(o,null,2).length; const MAX=280000;
const trim=(o,m)=>{const s=JSON.stringify(o,null,2);return s.length<=m?o:{_truncado:true,conteudo:s.slice(0,m)};};
let web2=trim(web, Math.max(40000, MAX - sz(apollo) - sz(hubspot) - sz(apify)));
return [{ json: { input_consolidado: { hubspot, apollo, web: web2, apify } } }];`;
add("[SINTESE] Aggrega", "n8n-nodes-base.code", { jsCode: aggCode }, { typeVersion: 2, position: [1840, 420] });
conn("Merge 4 Ramos", "[SINTESE] Aggrega");

const sinteseSystem = `Voce e o Agente de Sintese do Dossie B2C da PSA. Recebe 3 blocos brutos (hubspot, apollo, web) sobre UMA pessoa candidata a palestrante e produz um dossie estruturado que ajuda o closer na reuniao.

INPUT: JSON com chaves hubspot, apollo, web, apify. Qualquer bloco pode estar parcial/vazio. Ausencia e informacao ("nao captado"), nunca invente.

FONTE DO INSTAGRAM (bloco apify.instagram): e a fonte CONFIAVEL de seguidores/engajamento (numeros reais). Use-a com prioridade sobre o que a web disser sobre Instagram. Trate o campo apify.instagram.status:
- "ok": use seguidores, engajamento_medio e ultimos_posts nas notas e no dossie.
- "privado_bloqueado": DIGA no dossie que o Instagram e privado/bloqueado (use os seguidores se vierem, mas avise que os posts nao sao acessiveis).
- "nao_encontrado": diga "Instagram nao encontrado".
- "sem_handle": diga "Instagram nao informado no cadastro".
- "apify_nao_configurado": diga "Instagram nao coletado (integracao Apify pendente)".
Sempre registre o status do Instagram em fontes_e_entraves.entraves quando nao for "ok".

OUTPUT: SOMENTE JSON puro (sem markdown). Estrutura fixa:
{
  "meta": { "lead_nome": "", "atuacao_hoje": "", "ja_palestrante": "", "tema_principal": "", "estado": "", "idade": "", "fontes_consultadas": 0 },
  "avaliacao_eixos": { "audiencia": 0, "repertorio_palco": 0, "autoridade_tema": 0, "ambicao_realismo": 0, "urgencia_timing": 0 },
  "justificativa_eixos": { "audiencia": "", "repertorio_palco": "", "autoridade_tema": "", "ambicao_realismo": "", "urgencia_timing": "" },
  "resumo_executivo": "",
  "ganchos_conexao": { "tres_topicos": [], "referencias_citadas": [], "ultimos_posts": [{ "resumo": "", "link": "" }], "momento_de_vida": "", "tom_da_pessoa": "" },
  "gancho_abordagem": "",
  "rapport_sugestoes": ["", "", ""],
  "pontes_imersao": ["", "", ""],
  "fontes_e_entraves": { "fontes": [], "entraves": [] },
  "links": [{ "label": "", "url": "" }]
}

REGRAS:
1. Use "voce", nunca "tu". ZERO travessoes (parenteses/virgula/ponto).
2. Cada eixo 0-100 baseado em EVIDENCIA. Sem evidencia -> nota baixa + justificativa "sem evidencia captada".
3. NAO calcule nota final nem perfil (o workflow faz depois com os pesos). Voce so avalia os 5 eixos.
4. Cruze fontes: fato em >1 fonte = confie; em 1 so = sinalize.
5. TRAVA DE IDENTIDADE: os dados declarados (bloco hubspot) sao a verdade sobre quem a pessoa e. Se o bloco web trouxer profissao/trajetoria que CONTRADIZ o declarado (ex.: web diz "barbeiro" mas o declarado e outra area), trate como possivel homonimo: NAO use esse fato e registre em fontes_e_entraves.entraves ("possivel homonimo descartado: ..."). Prefira sempre o declarado no HubSpot. Nunca misture duas pessoas no mesmo dossie.
6. VINCULO ATUAL (regra critica, erra muito aqui): distinga cargos ATUAIS de ANTERIORES.
   - O bloco APOLLO pode estar DESATUALIZADO: o cargo/empresa que ele marca como "atual" pode ser antigo. NAO assuma que o emprego atual do Apollo e o atual de verdade.
   - SINAL MAIS FORTE de emprego atual = o DOMINIO DO E-MAIL corporativo (bloco hubspot). Se o e-mail e @empresa.com, a pessoa quase certamente trabalha NESSA empresa hoje. Use o dominio do e-mail como sinal primario para meta.atuacao_hoje.
   - Ordem de prioridade para "emprego atual": (1) declarado no HubSpot, (2) dominio do e-mail, (3) evidencia web recente (2025-2026). O Apollo entra so como historico/trajetoria, NAO como verdade sobre o presente.
   - Se as fontes divergirem, NAO crave: use passado para o que nao for claramente atual ("atuou", "foi", "passou por") e sinalize a incerteza. E muito melhor dizer "ja atuou em X" do que errar afirmando que ainda esta la.
   - Na duvida sobre o cargo atual, prefira descrever a AREA/atuacao ("atua com inovacao e novos negocios") em vez de cravar empresa e titulo especificos que podem estar velhos.
7. RAPPORT: preencha rapport_sugestoes com ATE 3 aberturas de conversa CURTAS e ESPECIFICAS, cada uma ancorada num fato real e DIFERENTE desta pessoa (trajetoria, pauta, conteudo, momento), no tom dela. Nada generico ("vi seu trabalho") - cite algo concreto. Se so houver base para 1 ou 2, gere 1 ou 2 - NAO repita o mesmo gancho reescrito.
8. PONTES PARA A IMERSAO: preencha pontes_imersao com ATE 3 formas de conectar ESTA pessoa a IMERSAO descrita no input (nome + descricao). Cada ponte parte de algo concreto e DIFERENTE do perfil dela (um gap, uma ambicao, um momento de vida, o descompasso entre autoridade e vitrine) e mostra como a imersao resolve. Use "voce". Se o perfil for "Escala", foque em escalar/monetizar o que ela ja faz; se "Profissionalize-se", foque em estruturar e profissionalizar; se "Iniciante", foque em comecar do zero com metodo. Se faltar base, gere menos pontes em vez de repetir.
9. NAO REPITA (regra de qualidade): cada secao (resumo_executivo, justificativa_eixos, ganchos_conexao, gancho_abordagem, rapport, pontes) deve trazer um angulo NOVO. NUNCA reescreva o mesmo fato em varias secoes so para preencher. Quando ha POUCA informacao captada, seja BREVE e honesto: um dossie curto e verdadeiro vale mais que paragrafos redundantes. Prefira dizer "informacao limitada nesta versao" a repetir os 2-3 fatos que voce tem. Densidade > volume.
10. LINKS (para o dossie deixar clicavel): preencha links com os enderecos REAIS encontrados sobre ESTA pessoa (Instagram, LinkedIn, site pessoal, materia de imprensa, canal YouTube, perfil institucional). Cada item = { label curto (ex.: "Instagram", "LinkedIn", "Materia na Exame"), url completa }. So URLs confirmadas desta pessoa (trava de identidade); nao invente. Se nao houver, deixe [].`;
add("[SINTESE] Chain", "@n8n/n8n-nodes-langchain.chainLlm", {
  promptType: "define",
  text: "=INPUT CONSOLIDADO (3 blocos):\n\n{{ JSON.stringify($json.input_consolidado, null, 2) }}\n\nIMERSAO (produto B2C, use para gerar pontes_imersao):\n{{ JSON.stringify($('⚙️ CONFIG (pesos e cortes)').first().json.cfg.IMERSAO, null, 2) }}\n\nGere o dossie JSON conforme o system message.",
  messages: { messageValues: [{ message: sinteseSystem }] },
}, { typeVersion: 1.6, position: [2040, 420] });
conn("[SINTESE] Aggrega", "[SINTESE] Chain");

add("[SINTESE] Chat Model", "@n8n/n8n-nodes-langchain.lmChatAnthropic", {
  model: { __rl: true, mode: "id", value: "claude-sonnet-4-5-20250929" }, options: { maxTokensToSample: 8000, temperature: 0.2 },
}, { typeVersion: 1.3, position: [2000, 640], credentials: CRED.anthropic });
sub("[SINTESE] Chat Model", "[SINTESE] Chain", "ai_languageModel");

const scoreCode = `const raw = $json.output || $json.text || '';
let D = null;
try { D = JSON.parse(String(raw).replace(/^\\\`\\\`\\\`json\\s*/i,'').replace(/\\\`\\\`\\\`\\s*$/,'').trim()); } catch(e){ D = null; }
const cfg = $('⚙️ CONFIG (pesos e cortes)').first().json.cfg;
const P = cfg.PESOS, C = cfg.CORTES, MAP = cfg.CLOSER_POR_PERFIL;
let nota = 0, perfil = 'Iniciante', closer = '';
if (D && D.avaliacao_eixos) {
  const e = D.avaliacao_eixos;
  const somaPesos = Object.values(P).reduce((a,b)=>a+b,0) || 100;
  nota = Math.round(((e.audiencia||0)*P.audiencia + (e.repertorio_palco||0)*P.repertorio_palco + (e.autoridade_tema||0)*P.autoridade_tema + (e.ambicao_realismo||0)*P.ambicao_realismo + (e.urgencia_timing||0)*P.urgencia_timing) / somaPesos);
  if (nota >= C.escala) perfil = 'Escala'; else if (nota >= C.profissionalize) perfil = 'Profissionalize-se'; else perfil = 'Iniciante';
  closer = (MAP && MAP[perfil]) || '';
}
return [{ json: { dossier: D, parse_error: D?null:'JSON invalido', raw_response: D?null:String(raw).slice(0,4000), score_final: nota, perfil, closer_id: closer, pesos_usados: P, cortes_usados: C } }];`;
add("[SINTESE] Parse + Score", "n8n-nodes-base.code", { jsCode: scoreCode }, { typeVersion: 2, position: [2240, 420] });
conn("[SINTESE] Chain", "[SINTESE] Parse + Score");

// ============================================================
// RENDER HTML
// ============================================================
const renderSystem = `Voce e o gerador de conteudo HTML do Dossie B2C da PSA. Recebe o dossie JSON ja avaliado (score_final e perfil ja calculados) e devolve APENAS os accordions de conteudo (cabecalho, placar e rodape sao montados por fora). Portugues do Brasil, use "voce", ZERO travessoes.

SAIDA: SOMENTE uma sequencia de blocos .accordion (sem <html>/<head>/<body>/masthead/stats-row/footer). Devolva HTML CRU, NUNCA cercado em blocos de codigo markdown (nao use tres crases nem "html" antes/depois). Use EXATAMENTE estas classes:

<div class="accordion open">
  <button class="accordion-header" onclick="toggleAccordion(this)">
    <span class="accordion-icon">+</span>
    <span class="accordion-title">TITULO</span>
    <span class="accordion-tag success">ROTULO</span>
  </button>
  <div class="accordion-body"><div class="accordion-content"> ... </div></div>
</div>

Componentes disponiveis dentro de .accordion-content:
- <p>, <strong>, <em>
- <ul class="refined-list"><li>...</li></ul>
- <table class="data-table"><thead><tr><th>..</th></tr></thead><tbody><tr><td>..</td></tr></tbody></table>
- <span class="pill pill-green|pill-amber|pill-red|pill-gray">texto</span>
- <div class="message-card"><div class="message-card-header"><span class="message-card-title">Gancho de abordagem</span></div><div class="message-card-body">MENSAGEM</div></div>
- <div class="subsection-intro">nota em italico</div>
- <div class="callout callout-info|callout-success|callout-warning|callout-critical"><div class="callout-label">ROTULO</div><p>...</p></div>
- <ul class="sources-list"><li><span class="source-num">1</span><span class="source-title">fonte</span><span class="source-conf">alta</span></li></ul>

GERE EXATAMENTE ESTES 5 ACCORDIONS, NESTA ORDEM:
1. (open, tag success) "Como abordar" -> message-card com gancho_abordagem; refined-list dos 3 topicos; referencias citadas; tom; momento de vida. Depois um <div class="subsection-intro">Rapport (como quebrar o gelo)</div> seguido de <ul class="refined-list"> com os 3 itens de rapport_sugestoes. Depois um <div class="subsection-intro">Ponte para a imersao</div> seguido de <ul class="refined-list"> com os 3 itens de pontes_imersao. Se algum vier vazio, escreva "Nao captado nesta versao".
2. (tag info) "Audiencia e conteudo" -> numeros de seguidores/engajamento (pills); ultimos_posts como refined-list com link.
3. (tag info) "Repertorio e autoridade" -> evidencias de palco, formacao, mencoes (com links).
4. (open, tag info) "Placar por eixo" -> data-table Eixo | Nota (0-100) | Justificativa, uma linha por eixo.
5. (tag gray) "Fontes e entraves" -> sources-list das fontes; refined-list dos entraves.

Sem evidencia: escreva "Nao captado nesta versao". Devolva SOMENTE os 5 blocos .accordion.`;
add("[RENDER] Agent Dossie HTML", "@n8n/n8n-nodes-langchain.chainLlm", {
  promptType: "define",
  text: "=Dossie avaliado (JSON):\n\n{{ JSON.stringify({ dossier: $json.dossier, score_final: $json.score_final, perfil: $json.perfil }, null, 2) }}\n\nGere os 5 accordions conforme o system message.",
  messages: { messageValues: [{ message: renderSystem }] },
}, { typeVersion: 1.6, position: [2440, 420] });
conn("[SINTESE] Parse + Score", "[RENDER] Agent Dossie HTML");

add("[RENDER] Chat Model", "@n8n/n8n-nodes-langchain.lmChatAnthropic", {
  model: { __rl: true, mode: "id", value: "claude-sonnet-4-5-20250929" }, options: { maxTokensToSample: 20000, temperature: 0.2 },
}, { typeVersion: 1.3, position: [2400, 640], credentials: CRED.anthropic });
sub("[RENDER] Chat Model", "[RENDER] Agent Dossie HTML", "ai_languageModel");

// ============================================================
// DIAGNOSTICO DO LEAD (pagina lead-facing, preto/laranja PSA) - chamariz da reuniao
// Roda entre o Render interno e o Inject: gera o diagnostico, sobe e devolve a URL,
// que o Inject do dossie interno embute como botao.
// ============================================================
const diagSystem = `Voce escreve o "Diagnostico de Perfil de Palestrante" da PSA, um material LEAD-FACING (a propria pessoa vai ler). Objetivo: ser o chamariz que faz o lead querer ir a reuniao. Tom aspiracional, generoso, profissional, cara de apresentacao de produto premium. Portugues do Brasil, "voce", ZERO travessoes.

REGRAS CRITICAS:
- NUNCA exponha score, nota, perfil interno (Escala/Profissionalize-se/Iniciante), closer, nem linguagem de CRM/vendas. Isto e para o LEAD ver.
- Nada de julgamento negativo. "Pontos a desenvolver" sao OPORTUNIDADES, sempre ligadas ao que a IMERSAO (no input) resolve.
- So use fatos reais do dossie recebido. Nao invente. Com pouca info, seja conciso e aspiracional, sem encher.
- Fale COM a pessoa (2a pessoa), reconhecendo a jornada dela.

OUTPUT: SOMENTE JSON puro (sem markdown):
{
  "abertura": "1-2 frases que reconhecem quem a pessoa e e criam identificacao",
  "pontos_fortes": ["3 a 4 forcas reais dela como potencial palestrante"],
  "a_desenvolver": [{ "ponto": "oportunidade de evolucao", "como_tbw_ajuda": "como a imersao destrava isso" }],
  "potencial": "1 paragrafo sobre o que ela pode alcancar como palestrante",
  "posicionamento": "1-2 frases sugerindo um posicionamento/tese de palco para ela",
  "fecho_aspiracional": "convite curto e forte para a conversa/imersao"
}
Gere 2 a 3 itens em a_desenvolver.`;
add("[LEAD-DIAG] Agent", "@n8n/n8n-nodes-langchain.chainLlm", {
  promptType: "define",
  text: "=Dossie interno (base factual, NAO copie tom nem numeros):\n\n{{ JSON.stringify($('[SINTESE] Parse + Score').first().json.dossier, null, 2) }}\n\nIMERSAO (para ligar os pontos a desenvolver):\n{{ JSON.stringify($('⚙️ CONFIG (pesos e cortes)').first().json.cfg.IMERSAO, null, 2) }}\n\nGere o diagnostico lead-facing em JSON.",
  messages: { messageValues: [{ message: diagSystem }] },
}, { typeVersion: 1.6, position: [2440, 900] });
conn("[RENDER] Agent Dossie HTML", "[LEAD-DIAG] Agent");

add("[LEAD-DIAG] Chat Model", "@n8n/n8n-nodes-langchain.lmChatAnthropic", {
  model: { __rl: true, mode: "id", value: "claude-sonnet-4-5-20250929" }, options: { maxTokensToSample: 4000, temperature: 0.5 },
}, { typeVersion: 1.3, position: [2400, 1120], credentials: CRED.anthropic });
sub("[LEAD-DIAG] Chat Model", "[LEAD-DIAG] Agent", "ai_languageModel");

const diagInject = String.raw`
let raw = ($json.text) || ($json.output) || '';
let J = null;
try { J = JSON.parse(String(raw).replace(/^\s*\x60\x60\x60json\s*/i,'').replace(/^\s*\x60\x60\x60\s*/i,'').replace(/\x60\x60\x60\s*$/i,'').trim()); } catch(e){ J = {}; }
const ps = $('[SINTESE] Parse + Score').first().json;
const meta = (ps.dossier && ps.dossier.meta) || {};
const lb = $('[LEAD] Base').first().json.lead;
const IM = ($('⚙️ CONFIG (pesos e cortes)').first().json.cfg.IMERSAO) || {};
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nome = meta.lead_nome || [lb.firstname, lb.lastname].filter(Boolean).join(' ') || 'Voce';
const fortes = (J.pontos_fortes || []).map(x => '<li>' + esc(x) + '</li>').join('');
const dev = (J.a_desenvolver || []).map(x => '<div class="card"><div class="card-t">' + esc(x.ponto) + '</div><div class="card-b">' + esc(x.como_tbw_ajuda) + '</div></div>').join('');
const css = 'body{margin:0;background:#0b0b0d;color:#f5f5f5;font-family:Manrope,Arial,sans-serif;line-height:1.55}.wrap{max-width:840px;margin:0 auto;padding:56px 28px}.kick{color:#FF6A00;font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:12px}h1{font-size:40px;line-height:1.05;margin:12px 0 8px;font-weight:800}h1 em{color:#FF6A00;font-style:normal}.lead{font-size:19px;color:#cfcfcf;margin-bottom:16px}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#FF6A00;margin:40px 0 14px}ul{padding-left:0;list-style:none;margin:0}ul li{padding:12px 0 12px 30px;border-bottom:1px solid #1f1f22;position:relative}ul li:before{content:"";position:absolute;left:0;top:18px;width:12px;height:12px;background:#FF6A00;border-radius:2px}.card{background:#141417;border-left:3px solid #FF6A00;border-radius:8px;padding:18px 20px;margin-bottom:14px}.card-t{font-weight:700;font-size:17px;margin-bottom:6px}.card-b{color:#c9c9c9;font-size:15px}.p{font-size:17px;color:#e6e6e6}.cta{margin-top:48px;background:linear-gradient(135deg,#FF6A00,#ff8c3a);color:#0b0b0d;border-radius:12px;padding:28px;text-align:center}.cta .f{font-size:22px;font-weight:800;margin-bottom:16px}.cta a{display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px}.ft{margin-top:48px;color:#6a6a6a;font-size:12px;letter-spacing:.1em;text-transform:uppercase}';
const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diagnostico de Palestrante - ' + esc(nome) + '</title><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"><style>' + css + '</style></head><body><div class="wrap">' +
  '<div class="kick">Diagnostico de Perfil de Palestrante</div>' +
  '<h1>' + esc(nome) + ', <em>seu palco te espera</em></h1>' +
  '<p class="lead">' + esc(J.abertura || '') + '</p>' +
  '<h2>Seus pontos fortes</h2><ul>' + fortes + '</ul>' +
  '<h2>Onde voce pode evoluir</h2>' + dev +
  '<h2>Seu potencial</h2><p class="p">' + esc(J.potencial || '') + '</p>' +
  '<h2>Posicionamento sugerido</h2><p class="p">' + esc(J.posicionamento || '') + '</p>' +
  '<div class="cta"><div class="f">' + esc(J.fecho_aspiracional || 'Vamos construir isso juntos.') + '</div><a href="' + esc(IM.url || '#') + '" target="_blank" rel="noopener">Conhecer ' + esc(IM.nome || 'a imersao') + '</a></div>' +
  '<div class="ft">Profissionais SA &middot; ' + esc(IM.nome || '') + '</div>' +
  '</div></body></html>';
return [{ json: { text: html, lead_nome: nome } }];`;
add("[LEAD-DIAG] Inject", "n8n-nodes-base.code", { jsCode: diagInject }, { typeVersion: 2, position: [2640, 900] });
conn("[LEAD-DIAG] Agent", "[LEAD-DIAG] Inject");

add("[LEAD-DIAG] Upload", "n8n-nodes-base.httpRequest", {
  method: "POST", url: DOSSIE_ENDPOINT,
  sendHeaders: true, headerParameters: { parameters: [{ name: "Authorization", value: "=Bearer " + DOSSIE_TOKEN }] },
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ { \"html\": $('[LEAD-DIAG] Inject').first().json.text, \"lead\": $('[LEAD-DIAG] Inject').first().json.lead_nome + ' - Diagnostico', \"empresa\": \"B2C-DIAG\" } }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [2840, 900] });
conn("[LEAD-DIAG] Inject", "[LEAD-DIAG] Upload");

const injectCode = 'const css = "' + CSS_ESCAPED + '";\n' + String.raw`
let conteudo = ($('[RENDER] Agent Dossie HTML').first().json.text) || ($('[RENDER] Agent Dossie HTML').first().json.output) || '';
// Remove cercas de codigo markdown que o modelo as vezes coloca (tres crases + html)
conteudo = String(conteudo).replace(/^\s*\x60\x60\x60html\s*/i, '').replace(/^\s*\x60\x60\x60\s*/i, '').replace(/\x60\x60\x60\s*$/i, '').trim();
const ps = $('[SINTESE] Parse + Score').first().json;
const D = ps.dossier || {}; const meta = D.meta || {}; const eixos = D.avaliacao_eixos || {};
const P = ps.pesos_usados || {}; const C = ps.cortes_usados || {};
const lb = $('[LEAD] Base').first().json.lead;
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nome = meta.lead_nome || [lb.firstname, lb.lastname].filter(Boolean).join(' ') || 'Lead';
const tema = meta.tema_principal || lb.tema || '';
const perfil = ps.perfil || 'Iniciante';
const score = (ps.score_final != null ? ps.score_final : 0);
const resumo = D.resumo_executivo || 'Resumo executivo nao captado nesta versao.';
const d = new Date();
const dataPt = String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();

const masthead =
  '<header class="masthead"><div class="masthead-meta"><span>Dossie B2C &middot; Candidato a Palestrante</span><span>Gerado em ' + dataPt + '</span></div>' +
  '<h1 class="masthead-title">Dossie <em>B2C</em> &middot; ' + esc(nome) + '</h1>' +
  '<p class="masthead-subtitle">' + esc(resumo) + '</p></header>';

const summary =
  '<section class="summary-band"><div class="summary-grid">' +
  '<div class="summary-cell"><div class="summary-cell-label">Perfil</div><div class="summary-cell-value">' + esc(perfil) + '</div><div class="summary-cell-note">Escala &middot; Profissionalize-se &middot; Iniciante</div></div>' +
  '<div class="summary-cell"><div class="summary-cell-label">Score do Dossie</div><div class="summary-cell-value">' + score + '<small style="font-size:16px;color:var(--muted)"> /100</small></div><div class="summary-cell-note">ponderado pelos 5 eixos</div></div>' +
  '<div class="summary-cell"><div class="summary-cell-label">Atuacao hoje</div><div class="summary-cell-value" style="font-size:20px">' + esc(meta.atuacao_hoje || lb.atuacao_hoje || 'n/d') + '</div><div class="summary-cell-note">' + esc((meta.ja_palestrante||lb.ja_palestrante) ? ('Ja palestrante: ' + (meta.ja_palestrante||lb.ja_palestrante)) : '') + '</div></div>' +
  '<div class="summary-cell"><div class="summary-cell-label">Tema / Local</div><div class="summary-cell-value" style="font-size:20px">' + esc(tema || 'n/d') + '</div><div class="summary-cell-note">' + esc([meta.estado||lb.estado, (meta.idade||lb.idade) ? ((meta.idade||lb.idade) + ' anos') : ''].filter(Boolean).join(' &middot; ')) + '</div></div>' +
  '</div></section>';

const stat = (label, val) => { const v = (val == null ? 0 : val); const cls = v >= 70 ? 'green' : (v >= 45 ? 'amber' : 'accent'); return '<div><div class="stat-label">' + label + '</div><div class="stat-value ' + cls + '">' + v + '<small style="font-size:13px;color:var(--muted)">/100</small></div></div>'; };
const statsRow = '<div class="stats-row">' + stat('Audiencia', eixos.audiencia) + stat('Repertorio/Palco', eixos.repertorio_palco) + stat('Autoridade', eixos.autoridade_tema) + stat('Ambicao x Realismo', eixos.ambicao_realismo) + stat('Urgencia/Timing', eixos.urgencia_timing) + '</div>';

const controls = '<div class="controls"><button class="control-btn" onclick="toggleAll(true)">Expandir tudo</button><button class="control-btn" onclick="toggleAll(false)">Recolher tudo</button></div>';

const comoFunciona =
  '<div class="accordion"><button class="accordion-header" onclick="toggleAccordion(this)"><span class="accordion-icon">+</span><span class="accordion-title">Como este dossie foi gerado</span><span class="accordion-tag info">Metodo</span></button>' +
  '<div class="accordion-body"><div class="accordion-content">' +
  '<p>Montado automaticamente por um fluxo (n8n) quando o lead B2C e qualificado (entra na etapa Reuniao Agendada do funil B2C). Etapas:</p>' +
  '<ul class="refined-list">' +
  '<li><strong>Coleta em 3 frentes ao mesmo tempo:</strong> HubSpot (formulario + CRM), Apollo (cargo e trajetoria) e Pesquisador Web (LinkedIn, Instagram, Google).</li>' +
  '<li><strong>Sintese (IA):</strong> cruza as 3 fontes e da nota 0 a 100 a cada um dos 5 eixos, com justificativa por evidencia.</li>' +
  '<li><strong>Nota final e Perfil:</strong> o fluxo aplica os pesos configurados. Pesos atuais: Audiencia ' + P.audiencia + '%, Repertorio/Palco ' + P.repertorio_palco + '%, Autoridade ' + P.autoridade_tema + '%, Ambicao x Realismo ' + P.ambicao_realismo + '%, Urgencia/Timing ' + P.urgencia_timing + '%. Cortes: Escala (>= ' + C.escala + '), Profissionalize-se (' + C.profissionalize + ' a ' + (C.escala - 1) + '), Iniciante (< ' + C.profissionalize + ').</li>' +
  '<li><strong>Gravacao:</strong> o link deste dossie, o Score e o closer sugerido sao gravados no Contato (dossie_b2c_html_url, score_dossie, closer_da_agenda).</li>' +
  '</ul>' +
  '<p class="footnote">Resultado calculado por IA a partir de fontes publicas + CRM. Use como apoio; confirme dados sensiveis na conversa.</p>' +
  '</div></div></div>';

const footer = '<footer style="background:var(--ink);color:var(--paper);padding:32px 48px;margin-top:64px"><div style="max-width:1100px;margin:0 auto;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(250,248,243,0.6)"><p style="margin-bottom:8px">Profissionais SA &middot; Dossie B2C &middot; Candidato a Palestrante</p><p>Construido em ' + dataPt + ' &middot; ' + esc(nome) + ' &middot; Uso interno</p></div></footer>';

const script = '<' + 'script>function toggleAccordion(b){b.parentElement.classList.toggle("open");}function toggleAll(e){document.querySelectorAll(".accordion").forEach(a=>{e?a.classList.add("open"):a.classList.remove("open");});}<' + '/script>';

// Links clicaveis (Instagram, LinkedIn, noticias, sites) que a pesquisa achou
const links = Array.isArray(D.links) ? D.links.filter(l => l && l.url) : [];
const linksBar = links.length ? ('<section class="summary-band" style="padding-top:0"><div style="max-width:1100px;margin:0 auto;padding:8px 48px 20px"><div class="summary-cell-label">Perfis e fontes</div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">' + links.map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" class="control-btn" style="text-decoration:none">' + esc(l.label || l.url) + '</a>').join('') + '</div></div></section>') : '';

// Botao para o Diagnostico do Lead (pagina lead-facing, para o closer enviar)
let diagUrl = '';
try { diagUrl = ($('[LEAD-DIAG] Upload').first().json.url) || ''; } catch(e){}
const diagBtn = diagUrl ? ('<div style="max-width:1100px;margin:20px auto 0;padding:0 48px"><a href="' + esc(diagUrl) + '" target="_blank" rel="noopener" class="control-btn" style="text-decoration:none;background:var(--ink);color:var(--paper);font-weight:700">Diagnostico do Lead (pagina para enviar) &rarr;</a></div>') : '';

const article = '<article class="dossier">' + statsRow + controls + conteudo + comoFunciona + '</article>';
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">';
const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Dossie B2C - ' + esc(nome) + '</title>' + fonts + '<style>' + css + '</style></head><body>' + masthead + summary + diagBtn + linksBar + article + footer + script + '</body></html>';
return [{ json: { text: html, lead_nome: nome, perfil: perfil, score: score } }];`;
add("[RENDER] Inject Template", "n8n-nodes-base.code", { jsCode: injectCode }, { typeVersion: 2, position: [2640, 420] });
conn("[LEAD-DIAG] Upload", "[RENDER] Inject Template");

add("[RENDER] Convert to File", "n8n-nodes-base.convertToFile", { operation: "toText", sourceProperty: "text", options: { fileName: "=dossie_b2c_{{ $now.toFormat('yyyyMMdd_HHmmss') }}.html" } },
  { typeVersion: 1.1, position: [2840, 420] });
conn("[RENDER] Inject Template", "[RENDER] Convert to File");

add("[RENDER] Upload Dossie", "n8n-nodes-base.httpRequest", {
  method: "POST", url: DOSSIE_ENDPOINT,
  sendHeaders: true, headerParameters: { parameters: [{ name: "Authorization", value: "=Bearer " + DOSSIE_TOKEN }] },
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ { \"html\": $('[RENDER] Inject Template').first().json.text, \"lead\": $('[RENDER] Inject Template').first().json.lead_nome, \"empresa\": \"B2C\" } }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [3040, 420] });
conn("[RENDER] Convert to File", "[RENDER] Upload Dossie");

// ============================================================
// WRITE-BACK no CONTATO
// ============================================================
const montaProps = `const ps = $('[SINTESE] Parse + Score').first().json;
const cfg = $('⚙️ CONFIG (pesos e cortes)').first().json.cfg;
const url = ($('[RENDER] Upload Dossie').first().json.url) || '';
const props = { dossie_b2c_html_url: url, score_dossie: ps.score_final, status_do_dossie: cfg.STATUS_VALUE };
if (ps.closer_id) props.closer_da_agenda = ps.closer_id;
if (cfg.PERFIL_NO_CONTATO) props.perfil = ps.perfil; // so grava se voce criou a prop no contato
const contactId = String($('[LEAD] Base').first().json.lead.id_contato);
return [{ json: { contactProps: props, contactId } }];`;
add("[HUBSPOT] Monta Props", "n8n-nodes-base.code", { jsCode: montaProps }, { typeVersion: 2, position: [3240, 300] });
conn("[RENDER] Upload Dossie", "[HUBSPOT] Monta Props");

add("[HUBSPOT] Patch Contato", "n8n-nodes-base.httpRequest", {
  method: "PATCH", url: "=https://api.hubapi.com/crm/v3/objects/contacts/{{ $json.contactId }}",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ JSON.stringify({ properties: $json.contactProps }) }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [3440, 300], credentials: CRED.hsHeader });
conn("[HUBSPOT] Monta Props", "[HUBSPOT] Patch Contato");

// ============================================================
// WRITE-BACK no NEGOCIO (perfil) — grava Perfil no negocio do funil B2C associado ao contato
// Requer escopos crm.objects.deals.read + crm.objects.deals.write na credencial HubSpot.
// ============================================================
add("[HUBSPOT] Assoc Deals", "n8n-nodes-base.httpRequest", {
  url: "=https://api.hubapi.com/crm/v4/objects/contacts/{{ $('[LEAD] Base').first().json.lead.id_contato }}/associations/deals",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [3240, 540], credentials: CRED.hsHeader });
conn("[HUBSPOT] Patch Contato", "[HUBSPOT] Assoc Deals");

add("[HUBSPOT] Le Deals", "n8n-nodes-base.httpRequest", {
  method: "POST", url: "https://api.hubapi.com/crm/v3/objects/deals/batch/read",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ JSON.stringify({ properties: ['pipeline','createdate'], inputs: (($json.results)||[]).map(r => ({ id: String(r.toObjectId) })) }) }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [3440, 540], credentials: CRED.hsHeader });
conn("[HUBSPOT] Assoc Deals", "[HUBSPOT] Le Deals");

const pickDeal = `const ps = $('[SINTESE] Parse + Score').first().json;
const cfg = $('⚙️ CONFIG (pesos e cortes)').first().json.cfg;
const deals = ($json.results) || [];
// so negocios do funil B2C (contato pode ter varios negocios)
const b2c = deals.filter(d => d.properties && String(d.properties.pipeline) === String(cfg.PIPELINE_B2C));
b2c.sort((a,b) => new Date(b.properties.createdate) - new Date(a.properties.createdate)); // mais recente primeiro
const alvo = b2c[0];
if (!alvo || !ps.perfil) { return []; } // sem negocio B2C -> nao grava (nada a fazer)
return [{ json: { dealId: String(alvo.id), perfil: ps.perfil } }];`;
add("[DEAL] Escolhe B2C", "n8n-nodes-base.code", { jsCode: pickDeal }, { typeVersion: 2, position: [3640, 540] });
conn("[HUBSPOT] Le Deals", "[DEAL] Escolhe B2C");

add("[HUBSPOT] Patch Deal Perfil", "n8n-nodes-base.httpRequest", {
  method: "PATCH", url: "=https://api.hubapi.com/crm/v3/objects/deals/{{ $json.dealId }}",
  authentication: "predefinedCredentialType", nodeCredentialType: "httpHeaderAuth",
  sendBody: true, specifyBody: "json",
  jsonBody: "={{ JSON.stringify({ properties: { perfil: $json.perfil } }) }}",
  options: { response: { response: { neverError: true, responseFormat: "json" } } },
}, { typeVersion: 4.2, position: [3840, 540], credentials: CRED.hsHeader });
conn("[DEAL] Escolhe B2C", "[HUBSPOT] Patch Deal Perfil");

// (Nota removida: o escopo de Notas nao esta disponivel para chaves de servico deste portal
//  ("isn't available for public use"). O link do dossie ja fica no contato em dossie_b2c_html_url,
//  entao a Nota era apenas conveniencia. [HUBSPOT] Patch Contato e o ultimo no do fluxo.)
// (Respond to Webhook tambem removido: o Webhook B2C responde 200 no recebimento.)

// ============================================================
// STICKY NOTES
// ============================================================
function sticky(content, pos, size, color) { add("Nota_" + uid(), "n8n-nodes-base.stickyNote", { content, height: size[1], width: size[0], color: color || 4 }, { typeVersion: 1, position: pos }); }
sticky("## ⚙️ PAINEL DE CONTROLE\\nPesos, cortes, status, flag de Perfil e mapa Perfil→Closer estão DENTRO do nó `⚙️ CONFIG` (com a tabela owner→ID pronta pra colar).\\nO gatilho é o workflow do HubSpot que dispara quando o Negócio B2C entra em 'Reunião Agendada'. Só o **ID do contato** precisa chegar no webhook.", [-260, 180], [460, 200], 6);
sticky("## 📥 4 COLETORES\\nTudo parte do **contato** (Get Contato → LEAD Base).\\nHubSpot = form+CRM · Apollo = cargo/trajetória · Web = Google/imprensa · **Apify = Instagram** (nº reais de seguidores/engajamento).\\nApify: cole token no CONFIG. Sem token, o fluxo roda e marca 'Instagram não coletado'. IG privado → dossiê avisa que está bloqueado.", [720, 20], [460, 170], 5);
sticky("## 🧮 SÍNTESE → SCORE → PERFIL\\nIA dá nota 0-100 por eixo → workflow aplica os pesos → nota final → Perfil → closer.", [2000, 260], [420, 120], 7);
sticky("## 📄 RENDER + WRITE-BACK (CONTATO)\\nGera HTML (design B2B + 'Como funciona') e sobe pro board.\\nGrava no **Contato**: `dossie_b2c_html_url`, `score_dossie`, `status_do_dossie`, `closer_da_agenda` (+ `perfil` se o flag estiver ligado).\\nVocê copia do contato pro Negócio manualmente.", [3040, 180], [480, 170], 3);

// ============================================================
const workflow = {
  name: "Dossiê B2C — Palestrante Candidato",
  nodes, connections, active: false,
  settings: { executionOrder: "v1" }, pinData: {}, meta: { templateId: "b2c-dossie" }, tags: [],
};
const out = path.join(__dirname, "Dossie_B2C_Palestrante.json");
fs.writeFileSync(out, JSON.stringify(workflow, null, 2));
console.log("OK ->", out, "| nodes:", nodes.length);
