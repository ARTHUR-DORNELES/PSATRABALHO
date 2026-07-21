// Test submission no form da LP TBS pra verificar se o pipeline aceita dados.
// Se passar (200/204), o form está OK e o problema é no embed do site.
// Se falhar, o problema é configuração no HubSpot (campo obrigatório,
// workflow bloqueando, etc.).

const PORTAL_ID = "49656171";
const FORM_GUID = "3b15026a-9b09-418d-91cc-77ec76467823";

const TEST_EMAIL = `tbday-debug-${Date.now()}@profissionaissa.com`;
const payload = {
  fields: [
    { objectTypeId: "0-1", name: "firstname", value: "Teste" },
    { objectTypeId: "0-1", name: "lastname", value: "Debug" },
    { objectTypeId: "0-1", name: "email", value: TEST_EMAIL },
    { objectTypeId: "0-1", name: "phone", value: "+5511999990000" },
    { objectTypeId: "0-1", name: "pessoas_ao_seu_redor_ja_te_pediram_ajuda_com_comunicacao__apresentacoes_negociacoes", value: "Submissão de teste via API pra debug do embed da LP." },
    { objectTypeId: "0-1", name: "voce_ja_pensou_que_poderia_ganhar_dinheiro_com_sua_habilidade_de_se_comunicar_o_que_te_aproxima", value: "teste" },
    { objectTypeId: "0-1", name: "o_que_voce_acha_que_falta_para_transformar_uma_habilidade_pessoal_em_um_negocio_real_e_rentavel", value: "teste" },
    { objectTypeId: "0-1", name: "o_que_te_daria_mais_seguranca_para_entrar_num_mercado_novo_criar_tudo_do_zero_ou_operar", value: "teste" },
    { objectTypeId: "0-1", name: "o_que_te_faria_olhar_para_uma_oportunidade_como_essa_e_dizer_isso_foi_feito_pra_mim", value: "teste" },
    { objectTypeId: "0-1", name: "voce_acredita_que_pessoas_com_boa_comunicacao_conseguem_de_fato_transformar_isso_em_uma_profissao", value: "teste" },
    { objectTypeId: "0-1", name: "na_sua_visao_o_que_uma_pessoa_precisaria_ter_para_conseguir_atuar_profissionalmente", value: "teste" },
    { objectTypeId: "0-1", name: "quando_voce_imagina_dar_o_primeiro_passo_em_algo_assim_qual_sente_que_seria_sua_maior_dificuldade", value: "teste" },
    { objectTypeId: "0-1", name: "o_que_faria_voce_acreditar_que_existe_uma_oportunidade_real_e_sustentavel_para_viver_de_comunicacao", value: "teste" },
    { objectTypeId: "0-1", name: "pensando_na_ideia_de_transformar_sua_comunicacao_em_uma_atividade_profissional_o_que_mais_te_empolga", value: "teste" },
  ],
  context: {
    pageUri: "https://tbday-sorteio.vercel.app/",
    pageName: "TBS Sorteio · Debug Test",
  },
};

console.log(`Submetendo com email: ${TEST_EMAIL}\n`);

const r = await fetch(
  `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  },
);

const body = await r.text();
console.log(`HTTP ${r.status}`);
console.log(`Response: ${body.slice(0, 1500)}`);

if (r.ok) {
  console.log("\n✓ Submissão aceita. Aguardar 30s e checar se aparece em /forms/...");
} else {
  console.log("\n✗ Submissão rejeitada. O JSON da resposta indica o motivo.");
}
