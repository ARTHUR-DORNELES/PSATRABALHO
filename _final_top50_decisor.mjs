import fs from 'fs';

const top = JSON.parse(fs.readFileSync('_top50_3y_sp_with_dealids.json','utf8'));

// All contacts gathered, indexed by rank
const contacts = {
  1: [
    {firstname:"Luciana",lastname:"Lourencini",phone:"+5516992482042",jobtitle:"Analista"},
    {firstname:"Marcio Santos",lastname:"Santos",phone:"46 99935-6633"},
    {firstname:"Luciana",lastname:"Carla Siqueira Lourencini",phone:"16992482042",jobtitle:"Coordenador(a)/Supervisor(a)"}
  ],
  2: [
    {firstname:"Katya",lastname:"Bertolozzi",phone:"+5511989268163"},
    {firstname:"DIEGO",phone:"+5511991218649",jobtitle:"Gerente"},
    {firstname:"Sabrina",lastname:"Nicoli Rosa",phone:"+5548991802405",jobtitle:"Analista"},
    {firstname:"Rodinei Silva",lastname:"Silva",phone:"1120997500",jobtitle:"Analista"}
  ],
  3: [
    {firstname:"Arlete",lastname:"Guedes",phone:"+55 11 99588-2747",jobtitle:"Analista"},
    {firstname:"Cristina",lastname:"Souza Ferreira",phone:"+5511913700787",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Thiago Costa",lastname:"DA",phone:"19982700345",jobtitle:"Gerente"}
  ],
  4: [
    {firstname:"Liege",lastname:"Freitas",phone:"+5511999124945"},
    {firstname:"Lygia Azevedo",lastname:"Azevedo",phone:"+55 11 98375-3940"},
    {firstname:"Marina Zarcos",lastname:"Zarcos",phone:"+55 11 98717-3757"},
    {firstname:"Juliana Silveira D'Addio",lastname:"Silveira D'Addio",phone:"11998411419",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Ana Guandalini",lastname:"Guandalini",phone:"11 99114-0345",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Katia",lastname:"Rigolon",phone:"+5511995095269",jobtitle:"Analista"}
  ],
  5: [
    {firstname:"Bianca",phone:"+5511910343999",jobtitle:"Assistente"},
    {firstname:"Flaviana",lastname:"Garcia Gouvea",phone:"+5511953146986",jobtitle:"Gerente"}
  ],
  6: [
    {firstname:"Alexandre Vieira",lastname:"Vieira",phone:"+55 11 99329-6446",jobtitle:"Consultor Externo"},
    {firstname:"Wellington Oliveira",lastname:"Oliveira",phone:"11950726587",jobtitle:"Diretor(a)"}
  ],
  7: [
    {firstname:"Cinthia",phone:"+5561994182028",jobtitle:"Analista"}
  ],
  8: [
    {firstname:"Natani",lastname:"Franco",phone:"+55 12 98168-4338"},
    {firstname:"Renato",phone:"+55 11 98989-7977",jobtitle:"Gerente"},
    {firstname:"Nayara",lastname:"Magalhães",phone:"62981295277",jobtitle:"Coordenador(a)/Supervisor(a)"}
  ],
  9: [
    {firstname:"Karolyne",lastname:"Guarnieri Pazine",phone:"+5519984100193"},
    {firstname:"Maria",lastname:"Eugênia Ciaramicoli",phone:"5519998048239",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Adriana Buzin",lastname:"Mello",phone:"19996186056",jobtitle:"Gerente"}
  ],
  10: [
    {firstname:"Rafaela",lastname:"Amma",phone:"+55 11 93078-2220",jobtitle:"Analista"},
    {firstname:"Jessica",phone:"+5519998594984"},
    {firstname:"Felipe",phone:"+5511981082945",jobtitle:"Analista"}
  ],
  11: [{firstname:"Alexandre Marchioro",lastname:"Marchioro",phone:"+5511982087852",jobtitle:"CEO/Presidente(a)"}],
  12: [
    {firstname:"Camila",lastname:"Piccini",phone:"+5511983716144",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Alexandra Lopes Caruso",lastname:"Lopes Caruso",phone:"+5511914157748",jobtitle:"Diretor(a)"}
  ],
  13: [
    {firstname:"Anna nardes",lastname:"Nardes",phone:"11972089052",jobtitle:"Assistente"},
    {firstname:"Larissa",lastname:"Fonseca",phone:"11953354321",jobtitle:"Coordenador(a)/Supervisor(a)"}
  ],
  14: [{firstname:"Aline",lastname:"Vieira",phone:"+5511968320457",jobtitle:"Coordenador(a)/Supervisor(a)"}],
  15: [
    {firstname:"Clara",lastname:"Esteves",phone:"+5531993751903",jobtitle:"Assistente de marketing"},
    {firstname:"Eduardo",lastname:"Pereira",phone:"11 97810-6899"}
  ],
  16: [{firstname:"Monika",lastname:"Jordão",phone:"11 94640-4686",jobtitle:"Gerente"}],
  17: [
    {firstname:"Fernanda Cristina",lastname:"Garcia",phone:"+5511971126636"},
    {firstname:"Rita",lastname:"Matsuda",phone:"+55 11 96478-1096",jobtitle:"Setor de Compras"},
    {firstname:"Tânia",lastname:"Santos",phone:"+5511959441966",jobtitle:"Analista"}
  ],
  18: [
    {firstname:"Neide",phone:"+551334999809"},
    {firstname:"Jannine Bastos",lastname:"Bastos",phone:"+551334762000",jobtitle:"Outro"}
  ],
  19: [
    {firstname:"Mylena",phone:"11996333560",jobtitle:"Outro"},
    {firstname:"Lisiane Leal",lastname:"OIiveira",phone:"5511998842506",jobtitle:"Gerente"}
  ],
  20: [{firstname:"Nouryon Almeida",lastname:"Almeida",phone:"5511969350903",jobtitle:"Analista"}],
  21: [
    {firstname:"Rafaela",phone:"+5519999974432"},
    {firstname:"Telefone Coorporativo",phone:"+551938027227"},
    {firstname:"Rodrigo Soares Santana",lastname:"Soares Santana",phone:"+5511987009911",jobtitle:"Analista"}
  ],
  22: [{firstname:"Ester dos Santos",lastname:"Dos Santos Lima",phone:"+5511983574635",jobtitle:"Analista"}],
  23: [{firstname:"Malu",phone:"+5519953310538",jobtitle:"Analista"}],
  24: [{firstname:"Camille Delduque",lastname:"Delduque",phone:"+55 11 95773-0866",jobtitle:"Analista"}],
  25: [{firstname:"Elias Ribeiro",lastname:"Nasser",phone:"5511983050091",jobtitle:"Gerente"}],
  26: [{firstname:"Jodamar",phone:"+5511992443086",jobtitle:"Auxiliar"}],
  27: [{firstname:"Bruno",lastname:"Reis",phone:"5511965527297",jobtitle:"Diretor(a)"}],
  28: [{firstname:"Katia Magalhães",lastname:"Magalhães",phone:"11999505991",jobtitle:"Analista"}],
  29: [{firstname:"Leonardo Lamas Cardoso",lastname:"Cardoso",phone:"19993348730",jobtitle:"Assistente"}],
  30: [{firstname:"Tatiana",phone:"5511975686662",jobtitle:"Diretor(a)"}],
  31: [{firstname:"Leticia Gessi",lastname:"Gessi",phone:"5516996209160",jobtitle:"Coordenador(a)/Supervisor(a)"}],
  32: [{firstname:"Marcelle",phone:"+5511996378303",jobtitle:"Analista"}],
  33: [{firstname:"Rosangela",lastname:"Servidoni",phone:"5511996213553",jobtitle:"Coordenador(a)/Supervisor(a)"}],
  34: [
    {firstname:"Rafael Bertoni",lastname:"Bertoni",phone:"+55 11 99238-6623",jobtitle:"Outro"},
    {firstname:"Ludmila",phone:"11995555021"}
  ],
  35: [{firstname:"Mariana Hadachi",lastname:"Hadachi",phone:"5511982255177",jobtitle:"Gerente"}],
  36: [
    {firstname:"Vanda",lastname:"Almeida",phone:"+5511939008439"},
    {firstname:"Maite Bluhu",lastname:"Bluhu",phone:"+5511996136516",jobtitle:"Gerente"}
  ],
  37: [
    {firstname:"Leticia",lastname:"Mondadori dos Santos",phone:"+5511969181211"},
    {firstname:"Barbara",lastname:"Amancio",phone:"55 11 99778-0952"}
  ],
  38: [
    {firstname:"Regionaldo",phone:"+5519999043321"},
    {firstname:"Felipe",lastname:"Luchete",phone:"+5511949167304"},
    {firstname:"Reginaldo",phone:"+5519999043321",jobtitle:"Coordenador(a)/Supervisor(a)"}
  ],
  39: [
    {firstname:"Leticia",lastname:"Monteiro de Vasconcelos Alencar",phone:"+5541992769120",jobtitle:"Assistente"},
    {firstname:"Maira Gequelin",lastname:"Gequelin",phone:"5541991452275",jobtitle:"Diretor(a)"}
  ],
  40: [{firstname:"Livia",lastname:"Cecchettini",phone:"+5511995292262",jobtitle:"Executive Director (ED)"}],
  41: [
    {firstname:"Lia",lastname:"Moretti",phone:"+5511992028245"},
    {firstname:"Marianne",lastname:"Carvalho",phone:"+5511945462561"},
    {firstname:"David",lastname:"Rodrigues",phone:"+5511989748180"}
  ],
  42: [
    {firstname:"Pedro Andrade",lastname:"Andrade",phone:"+55 17 99608-3088",jobtitle:"Gerente"},
    {firstname:"Camila",lastname:"Alves",phone:"+55 67 99177-8118",jobtitle:"Analista"}
  ],
  43: [{firstname:"paola",phone:"5511971703689",jobtitle:"Coordenador(a)/Supervisor(a)"}],
  44: [{firstname:"Enzo Perrella",lastname:"Perrella",phone:"+5511949951154",jobtitle:"Gerente"}],
  45: [{firstname:"Flavio",phone:"5511941477474",jobtitle:"Diretor(a)"}],
  46: [
    {firstname:"Tatiana",phone:"13997407418",jobtitle:"Coordenador(a)/Supervisor(a)"},
    {firstname:"Renata",lastname:"Nery",phone:"+55 64 9653-7959",jobtitle:"Analista"}
  ],
  47: [{firstname:"Edson Barreto",lastname:"Barreto",phone:"+5511988802577",jobtitle:"Gerente"}],
  48: [{firstname:"Raissa Florence",lastname:"Florence",phone:"+5519991290273",jobtitle:"Diretor(a)"}],
  49: [{firstname:"Renata Belfort Belfort",lastname:"Belfort",phone:"+55-11-9981-09537",jobtitle:"Analista"}],
  50: [{firstname:"Natália",phone:"+5511986545972",jobtitle:"Assistente"}]
};

// Rank job titles (lower = higher priority for "decision maker")
const RANK = (jt) => {
  const t = (jt||'').toLowerCase();
  if (t.includes('ceo') || t.includes('presidente') || t.includes('executive director')) return 1;
  if (t.includes('diretor') || t.includes('head')) return 2;
  if (t.includes('gerente')) return 3;
  if (t.includes('coordenador') || t.includes('supervisor')) return 4;
  if (t.includes('analista') || t.includes('especialista')) return 5;
  if (t.includes('outro') || t.includes('consultor') || t.includes('compras')) return 6;
  if (t.includes('assistente') || t.includes('auxiliar')) return 7;
  return 8;
};

const cleanFirst = (s) => (s||'').trim().split(/\s+/)[0];

// For each company, pick best contact
const final = top.map((t, i) => {
  const rank = i + 1;
  const list = contacts[rank] || [];
  list.sort((a,b) => RANK(a.jobtitle) - RANK(b.jobtitle));
  const best = list[0];
  return {
    rank,
    empresa: t.razao.substring(0,55),
    nome_comercial: (t.nomes.split(' | ')[0] || '').substring(0,35),
    deals: t.deals_count,
    total_brl: t.sum_amount,
    decisor_nome: best ? cleanFirst(best.firstname) : '—',
    decisor_full: best ? `${best.firstname} ${best.lastname||''}`.trim() : '—',
    decisor_cargo: best?.jobtitle || '—',
    decisor_phone: best?.phone || '—',
  };
});

// Pretty table
console.log('═'.repeat(155));
console.log('TOP 50 CLIENTES B2B-SP — últimos 3 anos (deals closedwon · Funil B2B HubSpot)');
console.log('═'.repeat(155));
console.log('#  | Deals | R$ Total       | Empresa                                              | Decisor (1º nome) | Cargo         | Telefone');
console.log('-'.repeat(155));
final.forEach(r => {
  const rank = String(r.rank).padStart(2);
  const d = String(r.deals).padStart(5);
  const amt = r.total_brl.toLocaleString('pt-BR',{minimumFractionDigits:0, maximumFractionDigits:0}).padStart(10);
  const emp = r.empresa.padEnd(52).substring(0,52);
  const dec = (r.decisor_nome||'').padEnd(18).substring(0,18);
  const cg = (r.decisor_cargo||'').substring(0,13).padEnd(13);
  console.log(`${rank} | ${d} | R$ ${amt} | ${emp} | ${dec} | ${cg} | ${r.decisor_phone}`);
});

fs.writeFileSync('_top50_3y_sp_FINAL.json', JSON.stringify(final, null, 2));
console.log('\nSaved _top50_3y_sp_FINAL.json');
