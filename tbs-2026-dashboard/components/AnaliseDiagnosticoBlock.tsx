'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import type { MetaAdsData } from '@/lib/meta-ads';
import type { GoogleAdsData } from '@/lib/google-ads';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

type Sev = 'critico' | 'atencao' | 'oportunidade' | 'ok';
type Finding = { area: string; sev: Sev; analise: string; diagnostico: string; acoes: string[] };

const SEV_META: Record<Sev, { label: string; dot: string; chip: string }> = {
  critico: { label: 'Crítico', dot: 'bg-red-500', chip: 'text-red-600 dark:text-red-400 border-red-500/40' },
  atencao: { label: 'Atenção', dot: 'bg-amber-500', chip: 'text-amber-600 dark:text-amber-400 border-amber-500/40' },
  oportunidade: { label: 'Oportunidade', dot: 'bg-sky-500', chip: 'text-sky-600 dark:text-sky-400 border-sky-500/40' },
  ok: { label: 'Saudável', dot: 'bg-emerald-500', chip: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40' },
};

export function AnaliseDiagnosticoBlock({ data, meta, google }: { data: Snapshot; meta?: MetaAdsData; google?: GoogleAdsData }) {
  // ── Métricas-base (ao vivo) ──
  const stages = new Map((data.funnel?.stages ?? []).map((s) => [s.key as string, s.value]));
  const inscritos = data.headline?.edition2026?.total ?? stages.get('inscricao_confirmada') ?? 0;
  const cadastro = stages.get('completou_cadastro') ?? 0;
  const upload = stages.get('upload_video_concluido') ?? 0;
  const ia = stages.get('analise_ia_pronto') ?? 0;

  const t = data.tbschool;
  const vendas = t?.concluido ?? 0;
  const receitaSchool = t?.receitaTotal ?? 0;
  const iniciaramCheckout = t ? t.concluido + t.abandonou + t.aguardando + t.cancelado : 0;
  const taxaCheckout = iniciaramCheckout > 0 ? vendas / iniciaramCheckout : 0;

  const canais = (data.conversaoCanal ?? [])
    .filter((c) => c.inscritos > 0)
    .map((c) => ({ ...c, taxa: c.inscritos > 0 ? c.vendas / c.inscritos : 0 }));
  const totalRastreado = canais.reduce((s, c) => s + c.inscritos, 0);
  const untracked = canais.find((c) => c.key === 'untracked');
  const untrackedPct = totalRastreado > 0 && untracked ? untracked.inscritos / totalRastreado : 0;
  const canaisReais = canais.filter((c) => c.key !== 'untracked');
  const melhorCanal = [...canaisReais].filter((c) => c.vendas > 0).sort((a, b) => b.taxa - a.taxa)[0];
  const maiorVolume = [...canaisReais].sort((a, b) => b.inscritos - a.inscritos)[0];
  const piorConversor = [...canaisReais].filter((c) => c.inscritos >= 20).sort((a, b) => a.taxa - b.taxa)[0];

  const spend = (meta?.configured ? meta.totalSpend : 0) + (google?.configured ? google.totalSpend : 0);
  const paidReceita = data.paidRoi?.paidReceita ?? 0;
  const paidCompra = data.paidRoi?.paidCompra ?? 0;
  const paidInscritos = data.paidRoi?.paidInscritos ?? 0;
  const roasTripwire = spend > 0 ? paidReceita / spend : null;
  const cpl = paidInscritos > 0 ? spend / paidInscritos : null;

  const hrs = data.inscricoesHora ?? [];
  const last3 = hrs.slice(-3).reduce((s, b) => s + b.total, 0);
  const prev3 = hrs.slice(-6, -3).reduce((s, b) => s + b.total, 0);
  const ritmoDelta = prev3 > 0 ? (last3 - prev3) / prev3 : 0;

  const regioes = data.regioes2026 ?? [];
  const totalReg = regioes.reduce((s, r) => s + r.count, 0);
  const topRegiao = [...regioes].sort((a, b) => b.count - a.count)[0];
  const topRegiaoPct = totalReg > 0 && topRegiao ? topRegiao.count / totalReg : 0;

  // ── Motor de achados ──
  const f: Finding[] = [];

  // 1) Funil de candidatura
  const steps = [
    { label: 'Inscrição', v: inscritos },
    { label: 'Cadastro', v: cadastro },
    { label: 'Upload de vídeo', v: upload },
    { label: 'Análise de IA', v: ia },
  ];
  let maiorQueda = { de: '', para: '', perda: 0 };
  for (let i = 0; i < steps.length - 1; i++) {
    const perda = steps[i].v > 0 ? (steps[i].v - steps[i + 1].v) / steps[i].v : 0;
    if (perda > maiorQueda.perda) maiorQueda = { de: steps[i].label, para: steps[i + 1].label, perda };
  }
  if (inscritos > 0) {
    f.push({
      area: 'Funil de candidatura (The Best Speaker)',
      sev: maiorQueda.perda >= 0.6 ? 'critico' : maiorQueda.perda >= 0.4 ? 'atencao' : 'ok',
      analise: `${formatNumber(inscritos)} inscritos → ${formatNumber(cadastro)} completaram cadastro → ${formatNumber(upload)} enviaram vídeo → ${formatNumber(ia)} com análise de IA.`,
      diagnostico:
        maiorQueda.perda > 0
          ? `Maior vazamento entre "${maiorQueda.de}" e "${maiorQueda.para}": perda de ${pct(maiorQueda.perda)} dos candidatos nessa passagem.`
          : 'Funil progredindo sem gargalo agudo evidente.',
      acoes: [
        `Disparar régua de CRM/WhatsApp pra quem travou em "${maiorQueda.de || 'cadastro'}" reativando a próxima etapa.`,
        'Reduzir fricção da etapa que mais perde (passo único, lembrete de prazo, tutorial de upload de vídeo).',
      ],
    });
  }

  // 2) Mídia paga × ROAS (o ponto que afeta decisão de C-level)
  if (spend > 0) {
    f.push({
      area: 'Mídia paga & ROAS',
      sev: 'atencao',
      analise: `Investido ${brl(spend)} · receita de TBSchool vinda de mídia paga ${brl(paidReceita)} (${formatNumber(paidCompra)} vendas) · ROAS aparente ${roasTripwire != null ? roasTripwire.toFixed(2) + 'x' : '—'}${cpl != null ? ` · CPL ${brl(cpl)}` : ''}.`,
      diagnostico:
        'O ROAS aparente mede SÓ o tripwire de R$19,90. A receita real do funil (deals high-ticket no pipeline B2C ligados a inscritos) NÃO entra nessa conta — por isso o número parece negativo e pode levar a cortar campanha que de fato se paga lá na frente.',
      acoes: [
        'Adotar o ROAS de funil completo (tripwire + receita do produto principal) antes de decidir corte de verba.',
        'Não avaliar campanha de topo só pelo R$19,90 — usar CPL + avanço pra etapas de venda como métrica intermediária.',
      ],
    });
  }

  // 3) Canais de aquisição
  if (melhorCanal || maiorVolume) {
    f.push({
      area: 'Canais de aquisição',
      sev: 'oportunidade',
      analise: [
        maiorVolume && `Maior volume: ${maiorVolume.label} (${formatNumber(maiorVolume.inscritos)} inscritos, ${pct(maiorVolume.taxa)} de conversão).`,
        melhorCanal && `Melhor conversão: ${melhorCanal.label} (${pct(melhorCanal.taxa)} · ${formatNumber(melhorCanal.vendas)} vendas).`,
      ]
        .filter(Boolean)
        .join(' '),
      diagnostico:
        piorConversor && piorConversor.taxa < (melhorCanal?.taxa ?? 1)
          ? `${piorConversor.label} traz volume (${formatNumber(piorConversor.inscritos)}) mas converte pouco (${pct(piorConversor.taxa)}) — dinheiro/atenção indo pra um canal de baixa qualidade.`
          : 'Distribuição de canais saudável; o melhor conversor tem espaço pra escalar.',
      acoes: [
        melhorCanal ? `Escalar investimento/esforço em ${melhorCanal.label} (maior taxa de conversão em venda).` : 'Identificar o canal de maior conversão e priorizar.',
        piorConversor ? `Revisar oferta/criativo de ${piorConversor.label} ou redirecionar verba pro que converte.` : 'Monitorar conversão por canal semanalmente.',
      ],
    });
  }

  // 4) Conversão TBSchool (checkout)
  if (iniciaramCheckout > 0) {
    f.push({
      area: 'Checkout do The Best School',
      sev: taxaCheckout < 0.4 ? 'atencao' : 'ok',
      analise: `${formatNumber(iniciaramCheckout)} iniciaram o checkout · ${formatNumber(vendas)} finalizaram (${pct(taxaCheckout)}) · receita líquida ${brl(receitaSchool)}.`,
      diagnostico:
        taxaCheckout < 0.4
          ? `${pct(1 - taxaCheckout)} abandonam o checkout — há dinheiro sendo perdido no carrinho.`
          : `Taxa de conclusão de ${pct(taxaCheckout)} é saudável pra um tripwire.`,
      acoes: [
        'Recuperação de carrinho: e-mail/WhatsApp automático pra quem abandonou em até 1h.',
        'Testar reduzir passos do checkout e reforçar prova social/urgência na página de pagamento.',
      ],
    });
  }

  // 5) Saúde do tagueamento
  if (totalRastreado > 0) {
    f.push({
      area: 'Saúde do tagueamento (origem)',
      sev: untrackedPct >= 0.2 ? 'atencao' : 'ok',
      analise: `${pct(1 - untrackedPct)} dos inscritos têm origem classificada; ${untracked ? formatNumber(untracked.inscritos) : 0} (${pct(untrackedPct)}) seguem sem fonte.`,
      diagnostico:
        untrackedPct >= 0.2
          ? 'Fatia relevante sem rastreio compromete a confiança em qualquer decisão por canal.'
          : 'Cobertura de origem boa — decisões por canal são confiáveis.',
      acoes: [
        'Padronizar UTM em TODOS os links (anúncios, e-mail, bio, WhatsApp, parceiros).',
        'Auditar semanalmente o balde "Não rastreado" e reclassificar a origem na fonte.',
      ],
    });
  }

  // 6) Ritmo de inscrições
  if (hrs.length >= 6) {
    const caindo = ritmoDelta < -0.15;
    f.push({
      area: 'Ritmo de inscrições',
      sev: caindo ? 'atencao' : 'oportunidade',
      analise: `Últimas 3h: ${formatNumber(last3)} inscrições vs ${formatNumber(prev3)} nas 3h anteriores (${ritmoDelta >= 0 ? '+' : ''}${pct(ritmoDelta)}).`,
      diagnostico: caindo
        ? 'Ritmo desacelerando — janela de atenção pra não perder tração da campanha.'
        : 'Ritmo estável/acelerando — momento de reforçar o que está puxando.',
      acoes: caindo
        ? ['Subir budget no canal de menor CPL e renovar criativo cansado.', 'Disparar ação de urgência (prazo/lote) pra reacender a entrada.']
        : ['Manter/aumentar investimento no canal que está puxando enquanto o ritmo sobe.', 'Preparar criativos de reserva pra sustentar quando o atual saturar.'],
    });
  }

  // 7) Concentração regional
  if (topRegiao && totalReg > 0) {
    f.push({
      area: 'Representação regional',
      sev: topRegiaoPct >= 0.5 ? 'oportunidade' : 'ok',
      analise: `${topRegiao.label} concentra ${pct(topRegiaoPct)} dos inscritos (${formatNumber(topRegiao.count)} de ${formatNumber(totalReg)}).`,
      diagnostico:
        topRegiaoPct >= 0.5
          ? 'Forte concentração numa região — risco de teto de mercado e regiões inteiras subexploradas.'
          : 'Distribuição regional relativamente equilibrada.',
      acoes: [
        'Testar campanhas geo-segmentadas nas regiões de baixa presença (criativo/linguagem regional).',
        'Ativar palestrantes/parceiros âncora nas regiões fracas pra gerar prova local.',
      ],
    });
  }

  const ordem: Record<Sev, number> = { critico: 0, atencao: 1, oportunidade: 2, ok: 3 };
  f.sort((a, b) => ordem[a.sev] - ordem[b.sev]);

  const conversaoGeral = totalRastreado > 0 ? canaisReais.reduce((s, c) => s + c.vendas, 0) / totalRastreado : 0;

  return (
    <section className="card">
      <div className="mb-1">
        <h2 className="card-title">Análise, diagnóstico e plano de ação</h2>
        <p className="card-subtitle">leitura automática dos dados ao vivo do dashboard · priorizado por severidade</p>
      </div>
      <div className="divider-accent mb-5" />

      {/* Resumo executivo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Inscritos TBS" value={formatNumber(inscritos)} />
        <Kpi label="Vendas TBSchool" value={formatNumber(vendas)} accent="success" />
        <Kpi label="Receita TBSchool" value={brl(receitaSchool)} accent="success" />
        <Kpi label="Investido em mídia" value={spend > 0 ? brl(spend) : '—'} accent="orange" />
        <Kpi label="Conversão geral" value={pct(conversaoGeral)} accent="orange" />
      </div>

      {/* Achados */}
      <div className="space-y-3">
        {f.map((item) => (
          <div key={item.area} className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-4 bg-white dark:bg-tbs-bg-3/30">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-semibold text-tbs-ink-light dark:text-white">{item.area}</h3>
              <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold border rounded-full px-2 py-0.5 ${SEV_META[item.sev].chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${SEV_META[item.sev].dot}`} />
                {SEV_META[item.sev].label}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] leading-relaxed">
              <Part icon="📊" titulo="Análise" texto={item.analise} />
              <Part icon="🔍" titulo="Diagnóstico" texto={item.diagnostico} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-1">✅ Plano de ação</div>
                <ul className="list-disc pl-4 space-y-1 text-tbs-ink-light dark:text-white/90">
                  {item.acoes.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Diagnóstico gerado a partir dos números atuais do painel (atualiza junto com o dash). Use como ponto de partida de reunião — cada achado aponta o vazamento e a ação correspondente.
      </p>
    </section>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'success' | 'orange' }) {
  const color = accent === 'success' ? 'text-emerald-600 dark:text-emerald-400' : accent === 'orange' ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : 'text-tbs-ink-light dark:text-white';
  return (
    <div className="rounded-xl p-3 border border-tbs-line-light dark:border-tbs-line bg-white dark:bg-tbs-bg-3/30">
      <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">{label}</div>
      <div className={`kpi-value text-xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Part({ icon, titulo, texto }: { icon: string; titulo: string; texto: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-1">{icon} {titulo}</div>
      <p className="text-tbs-ink-light dark:text-white/90">{texto}</p>
    </div>
  );
}
