// Fluxo oficial de inscrição TBS 2026 — 6 páginas, 15 status.
// Documentado em 2026-05-19 a partir do briefing da equipe.

export type HubspotStatus =
  | { kind: 'existing'; property: string; value: string } // valor já existe no enum tbs___etapa
  | { kind: 'rename_existing'; property: string; existingValue: string; newName: string } // valor existe com nome diferente do brief — usar existente
  | { kind: 'pending_new_value'; property: string; valueProposed: string } // novo valor a criar no enum
  | { kind: 'pending_new_property' } // propriedade inteira ainda não existe
  | { kind: 'click_tracking' }; // tracking de clique em botão da LP

export type FlowStage = {
  id: string;
  page: number; // 1 | 2 | 2.1 | 3 | 4 | 5 | 6
  pageLabel: string;
  status: string;
  description?: string;
  hubspot: HubspotStatus;
  isDropoff?: boolean;
  hasReguaEmail?: boolean;
  reguaLabel?: string;
  // Mapeamento opcional pra drill (só se HubSpot status === 'existing' ou 'rename_existing')
  drillStageValue?: string;
};

export const TBS_FLOW: FlowStage[] = [
  // ───────────────────────────── PÁGINA 1
  {
    id: 'p1-inscrito',
    page: 1,
    pageLabel: 'Inscrição inicial (LP)',
    status: 'Inscrito',
    description:
      'Preencheu o form "[TBS] Inscrição Principal - 2026 (FORM NOVO)". A partir daqui o lead já entra como "Concluir inscrição" — lógica nova desde 2026-05-19.',
    hubspot: { kind: 'existing', property: 'tbs___etapa', value: 'Concluir inscrição' },
    drillStageValue: 'Concluir inscrição',
  },

  // ───────────────────────────── PÁGINA 2
  {
    id: 'p2-garantir',
    page: 2,
    pageLabel: 'LP de upsell',
    status: 'Clicou "Garantir minha vaga"',
    description: 'Click no botão HubSpot embedado · vai pra checkout Kiwify',
    hubspot: { kind: 'click_tracking' },
  },
  {
    id: 'p2-so-inscricao',
    page: 2,
    pageLabel: 'LP de upsell',
    status: 'Clicou "Quero seguir só com a inscrição"',
    description: 'Click no botão HubSpot embedado · pula upsell e vai pra etapa 3',
    hubspot: { kind: 'click_tracking' },
  },
  {
    id: 'p2-abandono',
    page: 2,
    pageLabel: 'LP de upsell',
    status: 'Abandonou a página',
    description: 'Cadastrou no form mas não clicou em nenhum dos 2 CTAs',
    hubspot: { kind: 'pending_new_property' },
    isDropoff: true,
    hasReguaEmail: true,
    reguaLabel: 'Régua abandono de carrinho',
  },

  // ───────────────────────────── PÁGINA 2.1
  {
    id: 'p2.1-pago-redirect',
    page: 2.1,
    pageLabel: 'Checkout The Best School',
    status: 'Pagamento confirmado + redirect login',
    description: 'Comprou e clicou em "Continuar login no TBS" · entra na plataforma',
    hubspot: { kind: 'pending_new_value', property: 'tbs___etapa', valueProposed: 'Pagamento confirmado' },
  },
  {
    id: 'p2.1-pago-sem-redirect',
    page: 2.1,
    pageLabel: 'Checkout The Best School',
    status: 'Pagamento confirmado sem redirect',
    description: 'Comprou mas não clicou em "Continuar login no TBS"',
    hubspot: { kind: 'pending_new_value', property: 'tbs___etapa', valueProposed: 'Pagamento confirmado' },
    isDropoff: true,
    hasReguaEmail: true,
    reguaLabel: 'Régua completar inscrição',
  },
  {
    id: 'p2.1-comunidade',
    page: 2.1,
    pageLabel: 'Checkout The Best School',
    status: 'Entrou na comunidade The Best School',
    description: 'Clicou no CTA "Entrar na comunidade"',
    hubspot: { kind: 'pending_new_property' },
  },

  // ───────────────────────────── PÁGINA 3
  {
    id: 'p3-iniciou',
    page: 3,
    pageLabel: 'Dados pessoais e senha',
    status: 'Iniciou inscrição',
    description: 'Clicou no CTA "Próximo" da pág 3',
    hubspot: { kind: 'pending_new_property' },
  },
  {
    id: 'p3-abandono',
    page: 3,
    pageLabel: 'Dados pessoais e senha',
    status: 'Abandonou a página',
    description: 'Entrou na pág 3 mas não clicou em "Próximo"',
    hubspot: { kind: 'pending_new_property' },
    isDropoff: true,
    hasReguaEmail: true,
    reguaLabel: 'Régua abandono de página',
  },

  // ───────────────────────────── PÁGINA 4
  {
    id: 'p4-perfil-completo',
    page: 4,
    pageLabel: 'Perfil do palestrante',
    status: 'Preencheu perfil (nome, data, bio, frase)',
    description:
      'Coleta de dados — não muda o estágio (continua em "Concluir inscrição" desde a pág 1). Pra trackear quem completou o perfil precisaria de propriedade dedicada (ex: tbs_perfil_preenchido).',
    hubspot: { kind: 'pending_new_property' },
  },
  {
    id: 'p4-abandono',
    page: 4,
    pageLabel: 'Perfil do palestrante',
    status: 'Abandonou a página',
    description: 'Entrou na pág 4 mas não clicou em "Finalizar cadastro"',
    hubspot: { kind: 'pending_new_property' },
    isDropoff: true,
  },

  // ───────────────────────────── PÁGINA 5
  {
    id: 'p5-finalizou',
    page: 5,
    pageLabel: 'Termos & Regulamento',
    status: 'Inscrição concluída',
    description: 'Aceitou termos · alimenta tbs___etapa = "Inscrição confirmada" (⚠️ validar nome)',
    hubspot: {
      kind: 'rename_existing',
      property: 'tbs___etapa',
      existingValue: 'Inscrição confirmada',
      newName: 'Inscrição concluída',
    },
    drillStageValue: 'Inscrição confirmada',
  },
  {
    id: 'p5-nao-aceitou',
    page: 5,
    pageLabel: 'Termos & Regulamento',
    status: 'Não aceitou os termos',
    description: 'Clicou em "Finalizar cadastro" mas não em "Aceitar e continuar"',
    hubspot: { kind: 'pending_new_property' },
    isDropoff: true,
  },

  // ───────────────────────────── PÁGINA 6
  {
    id: 'p6-video',
    page: 6,
    pageLabel: 'Plataforma TBS',
    status: 'Vídeo enviado',
    description: 'Upload bem-sucedido · alimenta tbs___etapa = "Upload vídeo concluído"',
    hubspot: { kind: 'existing', property: 'tbs___etapa', value: 'Upload vídeo concluído' },
    drillStageValue: 'Upload vídeo concluído',
  },
  {
    id: 'p6-sem-video',
    page: 6,
    pageLabel: 'Plataforma TBS',
    status: 'Vídeo não enviado',
    description: 'Aceitou termos na pág 5 mas não fez upload do vídeo na pág 6',
    hubspot: { kind: 'pending_new_property' },
    isDropoff: true,
  },
];

// Lista de status ainda não rastreados no HubSpot — alimenta o checklist em DataAlerts
export type PendingField = {
  description: string;
  pages: string;
  fixHint: string;
};

export function listPendingFields(): PendingField[] {
  const items: PendingField[] = [];
  const seen = new Set<string>();
  for (const stage of TBS_FLOW) {
    const h = stage.hubspot;
    let key: string | null = null;
    let item: PendingField | null = null;
    if (h.kind === 'pending_new_property') {
      key = `prop:${stage.id}`;
      item = {
        description: `Status "${stage.status}" — pág ${stage.page}`,
        pages: `página ${stage.page} · ${stage.pageLabel}`,
        fixHint: 'Criar propriedade (boolean ou enum) no HubSpot e popular via workflow do form/click.',
      };
    } else if (h.kind === 'click_tracking') {
      key = `click:${stage.id}`;
      item = {
        description: `Click tracking "${stage.status}" — pág ${stage.page}`,
        pages: `página ${stage.page} · ${stage.pageLabel}`,
        fixHint: 'Configurar HubSpot tracking no botão CTA + propriedade boolean / form fill.',
      };
    } else if (h.kind === 'pending_new_value') {
      key = `enum_value:${h.property}=${h.valueProposed}`;
      if (seen.has(key)) continue;
      item = {
        description: `Adicionar valor "${h.valueProposed}" no enum ${h.property}`,
        pages: `página ${stage.page} · ${stage.pageLabel}`,
        fixHint: 'Settings → Properties → editar enum tbs___etapa → adicionar opção "Pagamento confirmado".',
      };
    } else if (h.kind === 'rename_existing') {
      key = `rename:${h.property}=${h.existingValue}`;
      if (seen.has(key)) continue;
      item = {
        description: `Renomear "${h.existingValue}" → "${h.newName}" no enum ${h.property}`,
        pages: `página ${stage.page} · ${stage.pageLabel}`,
        fixHint:
          'Settings → Properties → tbs___etapa → editar opção. ⚠️ Cuidado: renomeação retroativa afeta dados históricos.',
      };
    }
    if (item && key && !seen.has(key)) {
      items.push(item);
      seen.add(key);
    }
  }
  return items;
}

export function summarizeFlow() {
  const total = TBS_FLOW.length;
  const existing = TBS_FLOW.filter((s) => s.hubspot.kind === 'existing').length;
  const pendingValue = TBS_FLOW.filter((s) => s.hubspot.kind === 'pending_new_value').length;
  const pendingProp = TBS_FLOW.filter((s) => s.hubspot.kind === 'pending_new_property').length;
  const click = TBS_FLOW.filter((s) => s.hubspot.kind === 'click_tracking').length;
  const rename = TBS_FLOW.filter((s) => s.hubspot.kind === 'rename_existing').length;
  return { total, existing, pendingValue, pendingProp, click, rename };
}
