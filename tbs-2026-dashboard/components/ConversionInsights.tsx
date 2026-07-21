'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import type { DrillQuery } from '@/lib/drill';
import type { MetaAdsData } from '@/lib/meta-ads';
import type { GoogleAdsData } from '@/lib/google-ads';
import { useDrill } from './DrillProvider';

type Tone = 'opportunity' | 'leak' | 'channel' | 'attention';

type Insight = {
  tone: Tone;
  tag: string;
  metric?: string;
  title: string;
  body: string;
  drill?: DrillQuery;
};

const TONE_STYLES: Record<Tone, { tag: string; accent: string; bar: string }> = {
  opportunity: { tag: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', accent: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  channel: { tag: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', accent: 'text-sky-700 dark:text-sky-300', bar: 'bg-sky-500' },
  leak: { tag: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', accent: 'text-amber-700 dark:text-amber-300', bar: 'bg-amber-500' },
  attention: { tag: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', accent: 'text-fuchsia-700 dark:text-fuchsia-300', bar: 'bg-fuchsia-500' },
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const pctTxt = (n: number) => `${(n * 100).toFixed(0)}%`;

function buildInsights(data: Snapshot, meta?: MetaAdsData, google?: GoogleAdsData): Insight[] {
  const out: Insight[] = [];
  const buckets = data.channels?.buckets ?? [];
  const bMap = new Map<string, number>(buckets.map((b) => [b.key as string, b.count]));
  const get = (k: string) => bMap.get(k) ?? 0;
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const share = (n: number) => (total > 0 ? n / total : 0);

  const paidSocial = get('paid_social');
  const paidSearch = get('paid_search');
  const comunidade = get('comunidade');
  const whatsapp = get('whatsapp');
  const organico = get('organic_social');
  const email = get('email');
  const untracked = get('untracked');
  const direto = get('direto');

  const metaSpend = meta?.configured ? meta.totalSpend : 0;
  const googleSpend = google?.configured ? google.totalSpend : 0;

  // ── 1. CPL por canal pago — onde realocar verba (alavanca direta de mais inscritos) ──
  const cplSocial = paidSocial > 0 && metaSpend > 0 ? metaSpend / paidSocial : null;
  const cplSearch = paidSearch > 0 && googleSpend > 0 ? googleSpend / paidSearch : null;
  if (cplSocial != null || cplSearch != null) {
    let body: string;
    let metric: string;
    if (cplSocial != null && cplSearch != null) {
      const melhor = cplSocial <= cplSearch ? 'Social Pago (Meta)' : 'Pesquisa Paga (Google)';
      const pior = cplSocial <= cplSearch ? 'Pesquisa Paga (Google)' : 'Social Pago (Meta)';
      metric = brl(Math.min(cplSocial, cplSearch));
      body = `CPL Social Pago = ${brl(cplSocial)} (${formatNumber(paidSocial)} inscritos) · Pesquisa Paga = ${brl(cplSearch)} (${formatNumber(paidSearch)}). ${melhor} traz inscrito mais barato — realoque verba pra ele e segure/teste o ${pior} antes de escalar.`;
    } else if (cplSocial != null) {
      metric = brl(cplSocial);
      body = `Cada inscrito de Social Pago (Meta) custa ${brl(cplSocial)} (${formatNumber(paidSocial)} inscritos por ${brl(metaSpend)}). Esse é seu canal de aquisição nº1 hoje — escale os criativos/públicos que estão puxando e duplique o que converte.`;
    } else {
      metric = brl(cplSearch!);
      body = `Cada inscrito de Pesquisa Paga (Google) custa ${brl(cplSearch!)} (${formatNumber(paidSearch)} inscritos por ${brl(googleSpend)}).`;
    }
    out.push({ tone: 'channel', tag: 'CPL · onde investir', metric, title: 'custo por inscrito na mídia paga', body, drill: { type: 'paid_funnel', value: 'inscritos', edition: '2026' } });
  }

  // Verba queimando: gastou e não trouxe inscrito
  if (metaSpend > 0 && paidSocial === 0) {
    out.push({ tone: 'leak', tag: 'Verba sem retorno', metric: brl(metaSpend), title: 'gastos no Meta sem inscrito atribuído', body: 'O Meta já gastou mas nenhum inscrito foi atribuído a Social Pago. Verifique se as UTMs dos anúncios estão corretas (utm_medium=paid_social) — sem isso o investimento não aparece como inscrição e parece pior do que é.' });
  } else if (googleSpend > 0 && paidSearch === 0) {
    out.push({ tone: 'leak', tag: 'Verba sem retorno', metric: brl(googleSpend), title: 'gastos no Google sem inscrito atribuído', body: 'O Google Ads gastou mas nenhum inscrito caiu em Pesquisa Paga. Cheque o tagueamento de UTM dos anúncios de Search.' });
  }

  // ── 2. Ritmo de inscrições — acelerando ou caindo? ──
  const v = data.inscricoesHora ?? [];
  if (v.length >= 4) {
    const last4 = v.slice(-2).reduce((s, b) => s + b.total, 0);
    const prev4 = v.slice(-4, -2).reduce((s, b) => s + b.total, 0);
    if (prev4 > 0 || last4 > 0) {
      const delta = prev4 > 0 ? (last4 - prev4) / prev4 : 1;
      const caindo = delta < -0.15;
      out.push({
        tone: caindo ? 'leak' : 'opportunity',
        tag: 'Ritmo de inscrições',
        metric: `${delta >= 0 ? '+' : ''}${pctTxt(delta)}`,
        title: caindo ? 'o ritmo está caindo nas últimas 2h' : 'ritmo das últimas 2h vs 2h anteriores',
        body: caindo
          ? `As últimas 2h trouxeram ${formatNumber(last4)} inscrições vs ${formatNumber(prev4)} no período anterior. Quando cai assim, age rápido: suba budget no canal de menor CPL, troque o criativo cansado ou dispare uma régua de CRM/WhatsApp pra reaquecer.`
          : `Últimas 2h: ${formatNumber(last4)} inscrições (vs ${formatNumber(prev4)} antes). Está pegando tração — mantenha/aumente o investimento no canal que está puxando enquanto o ritmo sobe.`,
      });
    }
  }

  // ── 3. Gargalo: confirmou a inscrição mas não completou o cadastro ──
  const sMap = new Map((data.funnel?.stages ?? []).map((s) => [s.key as string, s.value]));
  const confirmada = sMap.get('inscricao_confirmada') ?? 0;
  const cadastro = sMap.get('completou_cadastro') ?? 0;
  if (confirmada >= 20 && cadastro < confirmada) {
    const dropPct = 1 - cadastro / confirmada;
    if (dropPct >= 0.3) {
      out.push({
        tone: 'leak',
        tag: 'Gargalo do funil',
        metric: pctTxt(dropPct),
        title: 'confirmam a inscrição mas não completam o cadastro',
        body: `${formatNumber(confirmada)} confirmaram a inscrição, mas só ${formatNumber(cadastro)} completaram o cadastro (perda de ${pctTxt(dropPct)}). Recuperar parte disso vale mais que comprar tráfego novo: dispare lembrete (e-mail/WhatsApp) pra quem parou e simplifique a página de cadastro.`,
        drill: { type: 'funnel', value: 'completou_cadastro' },
      });
    }
  }

  // ── 4. Canais gratuitos/baratos subaproveitados (escaláveis sem CAC) ──
  const gratis = comunidade + whatsapp + organico;
  if (total >= 30) {
    if (whatsapp === 0 && comunidade > 0) {
      out.push({ tone: 'opportunity', tag: 'Canal de CAC zero', metric: formatNumber(comunidade), title: 'inscritos vieram da Comunidade (sem custo de mídia)', body: `A Comunidade já trouxe ${formatNumber(comunidade)} inscritos (${pctTxt(share(comunidade))}) sem gastar em mídia — é seu canal de menor CAC. Intensifique: mais avisos na comunidade e ative o WhatsApp (hoje em 0), que pode replicar isso de graça.`, drill: { type: 'tbs_fonte', value: 'comunidade', edition: '2026' } });
    } else if (share(gratis) < 0.25) {
      out.push({ tone: 'opportunity', tag: 'Alavanca barata', metric: pctTxt(share(gratis)), title: 'da entrada é de canais gratuitos (orgânico/comunidade/WhatsApp)', body: `Só ${pctTxt(share(gratis))} dos inscritos vêm de canais sem custo de mídia. Tem espaço grande pra crescer inscrição barata: disparos na comunidade, WhatsApp e indicação ("indique e concorra") reduzem seu CAC médio.` });
    }
  }

  // ── 5. Atribuição perdida (não rastreado + direto) ──
  const semRastro = untracked + direto;
  if (total >= 30 && share(semRastro) >= 0.15) {
    out.push({
      tone: 'attention',
      tag: 'Atribuição perdida',
      metric: pctTxt(share(semRastro)),
      title: 'dos inscritos entram sem origem clara (direto/sem UTM)',
      body: `${formatNumber(semRastro)} inscritos (${pctTxt(share(semRastro))}) entram como direto/não rastreado — você não sabe o que os trouxe, então não dá pra escalar nem cortar o que não funciona. Padronize UTMs em TODOS os links (bio, e-mail, WhatsApp, anúncios) pra enxergar o que realmente gera inscrição.`,
      drill: { type: 'tbs_fonte', value: 'untracked', edition: '2026' },
    });
  }

  // ── 6. Região mais fraca = oportunidade (final reserva vaga por região) ──
  const regioes = data.regioes2026 ?? [];
  if (regioes.length > 0 && regioes.some((r) => r.count > 0)) {
    const ordenado = [...regioes].sort((a, b) => a.count - b.count);
    const fraca = ordenado[0];
    const forte = ordenado[ordenado.length - 1];
    if (fraca && forte && forte.count > fraca.count) {
      out.push({
        tone: 'channel',
        tag: 'Oportunidade regional',
        metric: fraca.label,
        title: 'é a região com menos inscritos',
        body: `${fraca.label} tem ${formatNumber(fraca.count)} inscritos vs ${formatNumber(forte.count)} no ${forte.label}. Como a final reserva vaga por região, a concorrência é menor lá — campanha segmentada com o gancho "represente a sua região" converte mais barato nessas praças.`,
        drill: { type: 'regiao', value: fraca.label, edition: '2026' },
      });
    }
  }

  return out;
}

export function ConversionInsights({ data, meta, google }: { data: Snapshot; meta?: MetaAdsData; google?: GoogleAdsData }) {
  const { open } = useDrill();
  const insights = buildInsights(data, meta, google);
  if (insights.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Insights pra crescer inscrições</h2>
          <p className="card-subtitle">leitura acionável dos dados ao vivo · onde investir, o que corrigir, o que escalar</p>
        </div>
        <span className="text-[11px] text-tbs-mute-light dark:text-tbs-mute hidden sm:inline">priorizado por impacto</span>
      </div>
      <div className="divider-accent mb-5" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((ins, i) => {
          const s = TONE_STYLES[ins.tone];
          const clickable = !!ins.drill;
          const Wrapper = clickable ? 'button' : 'div';
          return (
            <Wrapper
              key={i}
              {...(clickable ? { onClick: () => open(ins.drill!), type: 'button' as const } : {})}
              className={`relative text-left rounded-xl border border-tbs-line-light dark:border-tbs-line bg-tbs-bg-light/40 dark:bg-tbs-bg-3/30 p-4 pl-5 overflow-hidden transition ${
                clickable ? 'cursor-pointer hover:border-tbs-orange/60 hover:bg-tbs-orange-50/50 dark:hover:bg-tbs-bg-3/60' : ''
              }`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`tbs-pill ${s.tag}`}>{ins.tag}</span>
                {clickable && <span className="text-[10px] text-tbs-mute-light dark:text-tbs-mute uppercase tracking-wider">ver contatos →</span>}
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                {ins.metric && <span className={`text-2xl font-mono font-bold tabular-nums ${s.accent}`}>{ins.metric}</span>}
                <span className="text-sm font-semibold text-tbs-ink-light dark:text-white">{ins.title}</span>
              </div>
              <p className="text-xs text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">{ins.body}</p>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
