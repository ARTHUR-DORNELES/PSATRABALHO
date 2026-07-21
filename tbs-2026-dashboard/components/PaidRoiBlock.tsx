'use client';
import type { Snapshot } from '@/lib/snapshot';
import { formatNumber } from '@/lib/snapshot';
import type { MetaAdsData } from '@/lib/meta-ads';
import type { GoogleAdsData } from '@/lib/google-ads';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

// Janela de cada preço (por DATA — o gasto do Meta é atribuído por dia):
// R$ 19,90 esteve no ar de 01/06 até a virada; R$ 29,00 a partir de 05/06. Conta só o gasto do LANÇAMENTO.
const LAUNCH_DAY = '2026-06-01';
const PRICE_CUT_DAY = '2026-06-05'; // a partir desse dia = preço novo (R$ 29,00)

export function PaidRoiBlock({ data, meta: metaAds }: { data: Snapshot; meta?: MetaAdsData; google?: GoogleAdsData }) {
  const lp = data.livePrice;
  const roi = data.paidRoi;
  const prod = data.tbschoolProdutos;
  const p1 = lp?.find((c) => c.key === 'p1990');
  const p2 = lp?.find((c) => c.key === 'p2900');

  // Origem do lead: base reativada (contato criado antes de 01/06) × novo da campanha (criado a partir de 01/06).
  const leadOrigem = [
    { key: 'reativada', label: 'Base reativada', sub: 'já no Hub antes de 01/06', inscritos: roi?.paidInscritosAntigos ?? 0, compras: roi?.paidCompraAntigos ?? 0, receita: roi?.paidReceitaAntigos ?? 0, live19: roi?.paidCompraAntigos19 ?? 0, live29: roi?.paidCompraAntigos29 ?? 0 },
    { key: 'nova', label: 'Novos da campanha', sub: 'criados no Hub a partir de 01/06', inscritos: roi?.paidInscritosNovos ?? 0, compras: roi?.paidCompraNovos ?? 0, receita: roi?.paidReceitaNovos ?? 0, live19: roi?.paidCompraNovos19 ?? 0, live29: roi?.paidCompraNovos29 ?? 0 },
  ];
  const temLeadOrigem = leadOrigem[0].inscritos + leadOrigem[1].inscritos > 0;
  // Totais de compras da live por preço (para o % de composição base × novos DENTRO de cada preço).
  const tot19 = leadOrigem[0].live19 + leadOrigem[1].live19;
  const tot29 = leadOrigem[0].live29 + leadOrigem[1].live29;

  // Gasto do Meta por janela (somando o gasto diário).
  const daily = metaAds?.daily ?? [];
  const sumSpend = (pred: (d: string) => boolean) => daily.filter((d) => pred(d.date)).reduce((a, d) => a + d.spend, 0);
  const gastoA = sumSpend((d) => d >= LAUNCH_DAY && d < PRICE_CUT_DAY); // 01–04/06 (R$ 19,90)
  const gastoB = sumSpend((d) => d >= PRICE_CUT_DAY); // 05/06 → hoje (R$ 29,00)
  const gastoGeral = gastoA + gastoB;
  const temGasto = gastoGeral > 0;

  type Seg = { key: string; label: string; sub: string; gasto: number; inscritos: number; compras: number; upsell: number; receita: number; receitaLive: number };
  const segGeral: Seg = {
    key: 'geral', label: 'Geral', sub: 'lançamento · 01/06 → hoje',
    gasto: gastoGeral,
    inscritos: (p1?.inscritos ?? 0) + (p2?.inscritos ?? 0),
    compras: (p1?.vendas ?? 0) + (p2?.vendas ?? 0),
    upsell: (p1?.upsellVendas ?? 0) + (p2?.upsellVendas ?? 0),
    receita: (p1?.paidReceita ?? 0) + (p2?.paidReceita ?? 0),
    receitaLive: (p1?.receita ?? 0) + (p2?.receita ?? 0),
  };
  const seg1990: Seg = {
    key: 'p1990', label: 'R$ 19,90', sub: 'no ar 01/06 → 05/06',
    gasto: gastoA, inscritos: p1?.inscritos ?? 0, compras: p1?.vendas ?? 0, upsell: p1?.upsellVendas ?? 0, receita: p1?.paidReceita ?? 0, receitaLive: p1?.receita ?? 0,
  };
  const seg2900: Seg = {
    key: 'p2900', label: 'R$ 29,00', sub: 'no ar 05/06 → hoje',
    gasto: gastoB, inscritos: p2?.inscritos ?? 0, compras: p2?.vendas ?? 0, upsell: p2?.upsellVendas ?? 0, receita: p2?.paidReceita ?? 0, receitaLive: p2?.receita ?? 0,
  };
  const segmentos = [segGeral, seg1990, seg2900];

  const resultado = segGeral.receita - segGeral.gasto;
  const lucro = resultado >= 0;

  // Vencedor entre os dois preços (a coluna "Geral" é o consolidado e não compete).
  // Só métricas de EFICIÊNCIA recebem ★: CPL/CPA → menor vence; conversão/ROAS → maior vence.
  // Linhas de volume/gasto não competem (dependem do tempo no ar e do investido — "mais" ≠ "melhor").
  const win = (a: number, b: number, dir: 'hi' | 'lo'): 'p1990' | 'p2900' | null =>
    !isFinite(a) || !isFinite(b) || a === b ? null : (dir === 'hi' ? a > b : a < b) ? 'p1990' : 'p2900';
  const cpl = (s: Seg) => (s.inscritos > 0 && s.gasto > 0 ? s.gasto / s.inscritos : NaN);
  const conv = (s: Seg) => (s.inscritos > 0 ? (s.compras + s.upsell) / s.inscritos : NaN);
  const cpa = (s: Seg) => (s.compras > 0 && s.gasto > 0 ? s.gasto / s.compras : NaN);
  const roas = (s: Seg) => (s.gasto > 0 ? s.receita / s.gasto : NaN); // live + upsell
  const roasLive = (s: Seg) => (s.gasto > 0 ? s.receitaLive / s.gasto : NaN); // só a venda da live

  // "Prova real": o cálculo com os números reais, mostrado no hover de cada célula.
  const upR = (s: Seg) => Math.max(0, s.receita - s.receitaLive); // receita do upsell no segmento
  const linhas: { label: string; help: string; val: (s: Seg) => string; proof: (s: Seg) => string; strong?: boolean; winner?: 'p1990' | 'p2900' | null }[] = [
    { label: 'Gasto Meta (janela)', help: 'investido no Meta enquanto o preço esteve no ar', val: (s) => brl(s.gasto),
      proof: (s) => `Soma do gasto diário do Meta na janela (${s.sub}) = ${brl(s.gasto)}. Fonte: API do Meta Ads (conta The Best Speaker).` },
    { label: 'Inscritos (Social Pago)', help: 'inscritos de mídia paga que entraram na janela', val: (s) => formatNumber(s.inscritos),
      proof: (s) => `Contatos com origem Social Pago (Meta) e data de inscrição na janela (${s.sub}) = ${formatNumber(s.inscritos)}. Fonte: HubSpot.` },
    { label: 'CPL (custo por inscrito)', help: 'gasto da janela ÷ inscritos da janela', val: (s) => (isFinite(cpl(s)) ? brl(cpl(s)) : '—'), winner: win(cpl(seg1990), cpl(seg2900), 'lo'),
      proof: (s) => (isFinite(cpl(s)) ? `${brl(s.gasto)} (gasto) ÷ ${formatNumber(s.inscritos)} (inscritos) = ${brl(cpl(s))}` : 'sem dados suficientes') },
    { label: 'Compras (live)', help: 'vendas do tripwire nesse preço', val: (s) => formatNumber(s.compras),
      proof: (s) => `Negócios fechados do tripwire, de Social Pago, classificados pelo valor pago (${s.key === 'p1990' ? '≤ R$ 21' : s.key === 'p2900' ? '> R$ 21' : 'ambos'}) = ${formatNumber(s.compras)}. Fonte: pipeline The Best School (HubSpot/Kiwify).` },
    { label: 'Upsells (Gravação da live)', help: 'compradores que também levaram o upsell (R$ 197)', val: (s) => formatNumber(s.upsell),
      proof: (s) => `Desses compradores, quantos também fecharam o upsell "Gravação da live" (R$ 197) = ${formatNumber(s.upsell)}.` },
    { label: 'Taxa de conversão', help: 'negócios (live + upsell) ÷ inscritos da janela', val: (s) => (s.inscritos > 0 ? `${(conv(s) * 100).toFixed(1)}%` : '—'), winner: win(conv(seg1990), conv(seg2900), 'hi'),
      proof: (s) => (s.inscritos > 0 ? `(${formatNumber(s.compras)} compras + ${formatNumber(s.upsell)} upsell) ÷ ${formatNumber(s.inscritos)} inscritos = ${(conv(s) * 100).toFixed(1)}%` : 'sem inscritos') },
    { label: 'CPA (custo por venda)', help: 'gasto da janela ÷ compras da janela', val: (s) => (isFinite(cpa(s)) ? brl(cpa(s)) : '—'), winner: win(cpa(seg1990), cpa(seg2900), 'lo'),
      proof: (s) => (isFinite(cpa(s)) ? `${brl(s.gasto)} (gasto) ÷ ${formatNumber(s.compras)} (compras) = ${brl(cpa(s))}` : 'sem dados suficientes') },
    { label: 'Receita (live + upsell)', help: 'soma dos negócios fechados do segmento', val: (s) => brl(s.receita),
      proof: (s) => `Live: ${formatNumber(s.compras)} × valor líquido = ${brl(s.receitaLive)} + Upsell: ${formatNumber(s.upsell)} × R$ 185,20 = ${brl(upR(s))} → total ${brl(s.receita)}.` },
    { label: 'ROAS (só live)', help: 'receita SÓ da venda da live ÷ gasto da janela', val: (s) => (s.gasto > 0 ? `${roasLive(s).toFixed(2)}x` : '—'), strong: true, winner: win(roasLive(seg1990), roasLive(seg2900), 'hi'),
      proof: (s) => (s.gasto > 0 ? `Receita da live ${brl(s.receitaLive)} ÷ gasto ${brl(s.gasto)} = ${roasLive(s).toFixed(2)}x — NÃO inclui o upsell.` : 'sem gasto na janela') },
    { label: 'ROAS (live + upsell)', help: 'receita total (live + upsell) ÷ gasto da janela', val: (s) => (s.gasto > 0 ? `${roas(s).toFixed(2)}x` : '—'), strong: true, winner: win(roas(seg1990), roas(seg2900), 'hi'),
      proof: (s) => (s.gasto > 0 ? `Receita ${brl(s.receita)} (live ${brl(s.receitaLive)} + upsell ${brl(upR(s))}) ÷ gasto ${brl(s.gasto)} = ${roas(s).toFixed(2)}x` : 'sem gasto na janela') },
  ];

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h2 className="card-title">Mídia paga × Vendas do The Best School</h2>
          <p className="card-subtitle">ROAS/CPL/CPA por <strong>preço da live</strong> · o gasto do Meta é atribuído pela <strong>janela de data</strong> em que cada preço esteve no ar · receita = negócios fechados (Social Pago)</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute">Ponto de equilíbrio (Ads)</div>
          <div className={`kpi-value text-2xl ${lucro ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{lucro ? '+' : ''}{brl(resultado)}</div>
        </div>
      </div>
      <div className="divider-accent mb-5" />

      {/* Investido do lançamento (base do CPL/ROAS) */}
      <div className="rounded-xl p-4 border border-tbs-orange/40 bg-tbs-orange/5 mb-2 inline-block">
        <div className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold">Investido no lançamento (Meta)</div>
        <div className="kpi-value text-2xl mt-1 text-tbs-orange-deep dark:text-tbs-orange-light">{brl(gastoGeral)}</div>
        <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-1 font-mono">gasto de 01/06 em diante{metaAds?.totalSpend ? ` · conta toda: ${brl(metaAds.totalSpend)}` : ''}</div>
      </div>
      <p className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mb-5">Agora <strong>CPL e ROAS por coluna fazem sentido</strong>: cada preço usa o <strong>gasto da própria janela de data</strong> (não o gasto total). Só entra o gasto do lançamento (01/06+), não o aquecimento de antes.</p>

      {!temGasto || !p1 || !p2 ? (
        <div className="text-sm text-tbs-mute-light dark:text-tbs-mute py-6 text-center">
          {(!p1 || !p2) ? 'Aguardando dados de venda por preço.' : 'Aguardando gasto diário do Meta (API) pra calcular CPL/ROAS por janela.'}
        </div>
      ) : (
        <>
          {/* Cabeçalho das 3 colunas */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 items-end mb-1">
            <div />
            {segmentos.map((s, i) => (
              <div key={s.key} className={`text-center rounded-t-lg pt-1.5 px-1 ${i === 0 ? '' : 'bg-tbs-orange/10'}`}>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-tbs-ink-light dark:text-white">{s.label}</div>
                <div className="text-[9px] text-tbs-mute-light dark:text-tbs-mute leading-tight">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Linhas de métrica × 3 colunas (preço) */}
          <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line overflow-hidden">
            {linhas.map((l, i) => (
              <div key={l.label} className={`grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 items-center px-3 py-2.5 ${i % 2 ? 'bg-white dark:bg-tbs-bg-3/30' : 'bg-tbs-line-light/30 dark:bg-tbs-bg-3/10'}`}>
                <div>
                  <div className={`text-xs font-semibold ${l.strong ? 'text-tbs-orange-deep dark:text-tbs-orange-light' : 'text-tbs-ink-light dark:text-white'}`}>{l.label}</div>
                  <div className="text-[10px] text-tbs-mute-light dark:text-tbs-mute leading-tight">{l.help}</div>
                </div>
                {segmentos.map((s, j) => {
                  const venceu = j > 0 && l.winner === s.key;
                  return (
                    <div key={s.key} title={l.proof(s)} className={`text-center font-mono tabular-nums cursor-help ${l.strong ? 'text-sm font-bold' : 'text-xs'} ${venceu ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-tbs-ink-light dark:text-white'} ${j === 0 ? '' : 'bg-tbs-orange/5 rounded py-1'}`}>{l.val(s)}{venceu ? ' ★' : ''}</div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">★</span> marca o preço vencedor em cada métrica de <strong>eficiência</strong> (CPL e CPA — menor vence; conversão e ROAS — maior vence). As linhas de <strong>volume e gasto não competem</strong> (dependem do tempo no ar e do quanto foi investido) e a coluna <strong>Geral</strong> é o consolidado — nenhuma das duas recebe ★.
          </p>
        </>
      )}

      {/* Upsell · Gravação da live (R$ 197) — ticket médio de referência */}
      {prod && prod.upsell.vendas > 0 && (
        <div className="mt-4 rounded-lg p-3 bg-tbs-orange-50/40 dark:bg-tbs-bg-3/30 border border-tbs-line-light dark:border-tbs-line flex items-center justify-between gap-3">
          <div className="text-xs text-tbs-ink-light dark:text-white">
            <strong>Upsell · Gravação da live (R$ 197)</strong> — referência, fora da live
          </div>
          <div className="text-xs font-mono text-tbs-mute-light dark:text-tbs-mute">
            {formatNumber(prod.upsell.vendas)} vendas · ticket médio <strong className="text-emerald-600 dark:text-emerald-400">{brl(prod.upsell.vendas > 0 ? prod.upsell.receita / prod.upsell.vendas : 0)}</strong>
          </div>
        </div>
      )}

      {/* Origem do lead: base reativada × novos da campanha */}
      {temLeadOrigem && (
        <div className="mt-6 border-t border-tbs-line-light dark:border-tbs-line pt-5">
          <h3 className="text-[10px] uppercase tracking-wider text-tbs-mute-light dark:text-tbs-mute font-semibold mb-1">
            Origem do lead · base reativada × novos da campanha
          </h3>
          <p className="text-[10px] text-tbs-mute-light dark:text-tbs-mute mb-3">Quanto da mídia paga é gente que <strong>já estava na base</strong> (reativada) vs <strong>lead novo</strong> trazido pela campanha. <strong>Sem CPL/ROAS aqui</strong> — o gasto não divide por idade do lead.</p>
          <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2 items-end mb-1">
            <div />
            {leadOrigem.map((s) => (
              <div key={s.key} className="text-center rounded-t-lg pt-1.5 px-1 bg-tbs-orange/10">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-tbs-ink-light dark:text-white">{s.label}</div>
                <div className="text-[9px] text-tbs-mute-light dark:text-tbs-mute leading-tight">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line overflow-hidden">
            {([
              { label: 'Inscritos (mídia paga)', val: (s: typeof leadOrigem[number]) => formatNumber(s.inscritos) },
              { label: 'Compraram', val: (s: typeof leadOrigem[number]) => `${formatNumber(s.compras)} · ${(s.inscritos > 0 ? (s.compras / s.inscritos) * 100 : 0).toFixed(1)}%` },
              { label: '↳ Live a R$ 19,90', val: (s: typeof leadOrigem[number]) => `${formatNumber(s.live19)}${tot19 > 0 ? ` · ${Math.round((s.live19 / tot19) * 100)}%` : ''}` },
              { label: '↳ Live a R$ 29,00', val: (s: typeof leadOrigem[number]) => `${formatNumber(s.live29)}${tot29 > 0 ? ` · ${Math.round((s.live29 / tot29) * 100)}%` : ''}` },
              { label: 'Receita (live + upsell)', val: (s: typeof leadOrigem[number]) => brl(s.receita) },
            ]).map((l, i) => (
              <div key={l.label} className={`grid grid-cols-[1.3fr_1fr_1fr] gap-2 items-center px-3 py-2.5 ${i % 2 ? 'bg-white dark:bg-tbs-bg-3/30' : 'bg-tbs-line-light/30 dark:bg-tbs-bg-3/10'}`}>
                <div className="text-xs font-semibold text-tbs-ink-light dark:text-white">{l.label}</div>
                {leadOrigem.map((s) => (
                  <div key={s.key} className="text-center font-mono tabular-nums text-xs text-tbs-ink-light dark:text-white bg-tbs-orange/5 rounded py-1">{l.val(s)}</div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
            Nas linhas <strong>R$ 19,90 × R$ 29,00</strong>, o <strong>%</strong> é a <strong>composição daquele preço</strong> (base × novos somam 100% na linha): ex. "de quem comprou a R$ 19,90, X% era base e Y% novos". ⚠️ O preço também é um corte de <strong>tempo</strong> (mudou em 05/06): a base foi reativada no lançamento barato e os novos seguiram chegando depois — então não leia como "tolerância a preço", e sim como <strong>quem sustentou cada fase</strong>. Idade do lead = criação do contato no Hub (corte 01/06); preço pelo valor líquido do negócio.
          </p>
        </div>
      )}

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-4 leading-relaxed">
        Como o preço mudou numa <strong>data</strong>, o gasto do Meta é separado por dia e atribuído à janela de cada preço — por isso <strong>CPL e ROAS por coluna são válidos</strong> (cada um divide pelo gasto que realmente rodou naquela janela). Vendas classificadas pelo <strong>valor pago</strong> (≤ R$ 21 = R$ 19,90); inscritos pela <strong>data de inscrição</strong> (Social Pago). <strong>Ressalva:</strong> quem se inscreveu na janela do R$ 19,90 mas comprou depois (a R$ 29,00) tem o gasto numa janela e a venda na outra — pequena contaminação cruzada. <strong>Importante:</strong> a receita aqui é só o The Best School — não inclui os negócios high-ticket do B2C que o tráfego pago também gera.
      </p>
    </section>
  );
}
