import snapshotJson from '@/data/snapshot.json';

export type AlertSeverity = 'info' | 'warn' | 'danger';

export type Snapshot = {
  generatedAt: string;
  source: string;
  currentEdition: number;
  phases: { key: string; label: string; start: string; end: string }[];
  headline: {
    edition2024: { total: number; label: string; note: string };
    edition2025: { total: number; label: string; note: string };
    edition2026: { total: number; label: string; note: string; interesse: number };
  };
  funnel: {
    edition: number;
    label: string;
    stages: { key: string; label: string; value: number; absolute: boolean }[];
    conversion: Record<string, number>;
  };
  timeseries: {
    label: string;
    months: { month: string; y2024: number; y2025: number; y2026: number }[];
    note: string;
  };
  origem: {
    macro: { label: string; value: number; note?: string }[];
    analyticsSource: { label: string; value: number; pct: number }[];
    noteOrigem: string;
    noteSource: string;
  };
  parceiros: {
    edition: string;
    label: string;
    ranking: { partner: string; count: number; aliases: string[] }[];
    trash: { label: string; count: number }[];
    totalContatos: number;
    validosAposNormalizacao: number;
    note: string;
  };
  demografia: {
    regiao: { available: boolean; reason?: string; distribuicao: { label: string; value: number }[] };
    momento: {
      available: boolean;
      respondedAbsolute: number;
      respondedPct: number;
      distribuicao: { label: string; value: number; pct: number }[];
    };
    interesse2026: { true: number; false: number };
  };
  daily: {
    edition2026: {
      label: string;
      inscricoes: { date: string; count: number }[];
      videos: { date: string; count: number }[];
      votos: { date: string; count: number }[];
      note: string;
      dailyStages?: { date: string; byStage: Record<string, number> }[];
    };
    edition2025Reference: {
      label: string;
      inscricoes: { date: string; count: number }[];
      videos: { date: string; count: number }[];
      votos: { date: string; count: number }[];
      note: string;
    };
  };
  perfil: {
    label: string;
    idade: {
      respondedAbsolute: number;
      respondedPct: number;
      buckets: { label: string; value: number; pct: number }[];
      note: string;
    };
    estados: {
      respondedAbsolute: number;
      respondedPct: number;
      top: { uf: string; value: number; pct: number }[];
      note: string;
    };
    generoNorm: {
      respondedAbsolute: number;
      respondedPct: number;
      distribuicao: { label: string; value: number; pct: number }[];
      rawDistinctValues: string[];
      note: string;
    };
    areaAtuacao: {
      respondedAbsolute: number;
      respondedPct: number;
      top: { label: string; value: number; pct: number }[];
      note: string;
    };
  };
  emailsTbs: {
    label: string;
    respondedAbsolute: number;
    respondedPct: number;
    distribuicao: { label: string; rawValue: string; value: number; pct: number }[];
    note: string;
  };
  channels: {
    label: string;
    sampleSize: number;
    totalInPeriod: number;
    coverage: { withSignal: number; withSignalPct: number; noSignal: number; noSignalPct: number };
    offlineInvestigation?: {
      sampleSize: number;
      total: number;
      title: string;
      subtitle: string;
      bySource: { label: string; value: number; pct: number }[];
      byDomain: { label: string; value: number; pct: number }[];
      byLifecycle: { label: string; value: number; pct: number }[];
      byConversionEvents: { label: string; value: number; pct: number }[];
      keyFinding: string;
      actionItem: string;
    };
    buckets: {
      key: 'email' | 'whatsapp' | 'paid_social' | 'organic_social' | 'paid_search' | 'comunidade' | 'direto' | 'untracked' | 'crm' | 'paid' | 'social' | 'organic' | 'direct' | 'referral';
      label: string;
      description: string;
      count: number;
      pct: number;
      drillUtmSources?: string[];
      subBreakdown?: {
        dimension: 'platform' | 'campaign' | 'source' | 'medium' | 'content' | 'term';
        dimensionLabel: string;
        items: {
          label: string;
          value: number;
          drillField?: 'utm_source_tbs' | 'utm_medium_tbs' | 'utm_campaign_tbs' | 'utm_content_tbs' | 'utm_term_tbs';
        }[];
      }[];
    }[];
    topUtmSource: { label: string; value: number }[];
    topUtmMedium: { label: string; value: number }[];
    topUtmCampaign: { label: string; value: number }[];
    note: string;
  };
  alertasTagueamento: {
    severity: AlertSeverity;
    titulo: string;
    detalhe: string;
    fix: string;
  }[];
  regioes2026?: { key: string; label: string; count: number }[];
  conversaoCanal?: { key: string; label: string; color: string; inscritos: number; vendas: number; vendasCohort: number; liveVendas?: number; upsellVendas?: number }[];
  // Disparos de WhatsApp identificados por propriedade de contato (carimbada pela automação HubSpot) —
  // permite ROI por disparo específico sem UTM. Ver lib/data.ts DISPARO_HUBSPOT_DEFS.
  disparosHubspot?: { key: string; label: string; impactados: number; liveVendas: number; upsellVendas: number; retorno: number }[];
  entrySite?: {
    total: number;
    withReferrer: number;
    referrers: { label: string; value: number }[];
  };
  // Inscritos por dia segmentados por origem (mesma classificação do card "Origens de entrada").
  origemDiaria?: { date: string; byFonte: Record<string, number> }[];
  tbschool?: {
    concluido: number;
    abandonou: number;
    aguardando: number;
    cancelado: number;
    receitaTotal: number;
    porProduto?: { label: string; count: number; receita: number }[];
  };
  // Painel separado (abaixo do "The Best School" padrão): compradores da LIVE que NÃO são inscritos no TBS
  // 2026 — campanha nova (a partir de jul/2026) vende só a live pra fora do funil de inscrição. O painel
  // padrão (tbschool acima) passou a contar SÓ inscritos; este aqui é o espelho pra quem não é.
  tbschoolNaoInscrito?: {
    concluido: number;
    receitaTotal: number;
    porProduto?: { label: string; count: number; receita: number }[];
    daily: { date: string; vendas: number; receita: number }[];
  };
  tbschoolDaily?: { date: string; byStatus: Record<string, number> }[];
  tbschoolReceitaDaily?: { date: string; receita: number }[];
  tbschoolMidiaDaily?: { date: string; vendas: number; receita: number }[]; // vendas/dia do TBSchool vindas de mídia paga
  tbschoolCrmDaily?: { date: string; vendas: number; receita: number }[]; // vendas/dia do TBSchool via CRM (e-mail + WhatsApp)
  tbschoolUpsellDaily?: { date: string; vendas: number; receita: number }[]; // vendas/receita de upsell (gravação) por dia
  schoolByStage?: { key: string; label: string; total: number; buyers: number; taxa: number }[];
  livePrice?: { key: string; label: string; periodo: string; vendas: number; receita: number; inscritos: number; taxaConversao: number; paidReceita: number; upsellVendas: number }[];
  tbschoolProdutos?: { tripwire: { vendas: number; receita: number; vendasSocialPago: number; paidReceita: number }; upsell: { vendas: number; receita: number; vendasSocialPago: number; paidReceita: number } };
  inscricoesHora?: { bucket: string; total: number; paid: number; crm?: number; cadastros?: number; videos?: number; compra: number; receita: number; compraPaga: number }[];
  // Vendas/faturamento/upsell por HORA (data de pagamento) — pro resumo comparar "hoje até Xh vs ontem até Xh".
  vendasHora?: { bucket: string; vendas: number; receita: number; upsell: number }[];
  paidRoi?: {
    vendidos: number; // TBSchool concluído (todas as origens)
    paidInscritos: number; // inscritos via mídia paga (Social Pago + Pesquisa Paga)
    paidCheckout: number; // desses, quantos iniciaram checkout TBSchool
    paidCompra: number; // desses, quantos finalizaram a compra
    paidReceita: number; // soma do valor líquido das compras vindas de mídia paga
    paidReceitaMeta?: number; // receita líquida atribuída ao Meta (Social Pago)
    paidReceitaGoogle?: number; // receita líquida atribuída ao Google (Pesquisa Paga)
    paidCompraMeta?: number; // nº de compras atribuídas ao Meta
    paidCompraGoogle?: number; // nº de compras atribuídas ao Google
    paidReceitaNovos?: number; // receita de mídia paga de leads NOVOS (createdate >= 01/06)
    paidReceitaAntigos?: number; // receita de mídia paga de leads ANTIGOS (createdate < 01/06, base reativada)
    paidCompraNovos?: number; // nº de compras de leads novos
    paidCompraAntigos?: number; // nº de compras de leads antigos
    paidInscritosNovos?: number; // inscritos de mídia paga que são leads novos
    paidInscritosAntigos?: number; // inscritos de mídia paga que são leads antigos
    paidCheckoutNovos?: number; // checkouts iniciados por leads novos
    paidCheckoutAntigos?: number; // checkouts iniciados por leads antigos
    paidCompraNovos19?: number; // compras da live a R$19,90 — leads novos
    paidCompraNovos29?: number; // compras da live a R$29,00 — leads novos
    paidCompraAntigos19?: number; // compras da live a R$19,90 — base reativada
    paidCompraAntigos29?: number; // compras da live a R$29,00 — base reativada
  };
  // Aba "Visão integrada" — cruza inscrições (Speaker) × vendas (School).
  visaoIntegrada?: {
    funil: { key: string; label: string; value: number; pctTopo: number }[];
    receita: number;
    ticketMedio: number;
    compradores: number; // compradores únicos (1 por contato)
    diario: { date: string; inscritos: number; vendas: number; taxa: number }[]; // venda pela DATA DE INSCRIÇÃO
    quemCompra: { base: number; novos: number; receitaBase: number; receitaNovos: number };
    porRegiao: { key: string; label: string; inscritos: number; vendas: number; taxa: number }[];
    tempoAteCompra: { key: string; label: string; vendas: number }[];
    perfilComprador: {
      area: { label: string; vendas: number; pct: number }[];
      idade: { label: string; vendas: number; pct: number }[];
    };
  };
  // Influência do Otaviano: pago (criativo em anúncio · fica no Social Pago) × orgânico (redes/ManyChat).
  otavianoInfluencia?: {
    pago: { inscritos: number; vendas: number; receita: number };
    organico: { inscritos: number; vendas: number; receita: number };
  };
  // Influência do Karnal: criativo dele no utm_content. Pago = anúncio (Social Pago) · orgânico = mesmo criativo fora de mídia paga.
  karnalInfluencia?: {
    pago: { inscritos: number; vendas: number; receita: number };
    organico: { inscritos: number; vendas: number; receita: number };
  };
};

export const snapshot = snapshotJson as Snapshot;

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function formatPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
