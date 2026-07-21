'use client';
import { useMemo, useState } from 'react';
import type { Snapshot } from '@/lib/snapshot';
import type { WhatsappCosts } from '@/lib/whatsapp-costs';

// Custo fixo por mensagem pros disparos rastreados via propriedade HubSpot (sem template exato pra usar o custo real da Meta).
const DISPARO_CUSTO_MSG = 0.3;

const fmtR = (n: number) => 'R$ ' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n));
const fmtR2 = (n: number) => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtN = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

export function DisparosCostBlock({ data, whatsapp }: { data: Snapshot; whatsapp?: WhatsappCosts }) {
  const disparos = whatsapp?.disparos ?? [];
  // seleção do usuário: por padrão marca os que são TBS
  const [sel, setSel] = useState<Set<string>>(() => new Set(disparos.filter((d) => d.isTbs).map((d) => d.id)));

  const selData = useMemo(() => {
    const rows = disparos.filter((d) => sel.has(d.id));
    const custoBrl = rows.reduce((a, b) => a + b.costBrl, 0);
    const custoUsd = rows.reduce((a, b) => a + b.costUsd, 0);
    const enviadas = rows.reduce((a, b) => a + b.sent, 0);
    return { custoBrl, custoUsd, enviadas, n: rows.length };
  }, [disparos, sel]);

  // cobertura: quanto do custo de marketing já está detalhado por template
  const attributedBrl = (whatsapp?.accounts ?? []).reduce((a, b) => a + b.attributedUsd, 0) * (whatsapp?.fxUsdBrl ?? 0);
  const totalBrl = whatsapp?.totalMarketingBrl ?? 0;
  const coverage = totalBrl > 0 ? attributedBrl / totalBrl : 0;
  // vendas atribuídas ao WhatsApp (canal) — pro retorno agregado; CAC usa o custo TOTAL exato
  const waCanal = data.conversaoCanal?.find((c) => c.key === 'whatsapp');
  const waVendas = waCanal?.vendas ?? 0;
  const waLive = waCanal?.liveVendas;
  const waUpsell = waCanal?.upsellVendas;
  const cac = waVendas > 0 ? totalBrl / waVendas : 0;

  if (!whatsapp?.configured) {
    return (
      <section className="card">
        <h2 className="card-title">Custo & ROI de disparo · WhatsApp</h2>
        <p className="card-subtitle">Integração não configurada{whatsapp?.error ? ` — ${whatsapp.error}` : ' (falta WHATSAPP_MGMT_TOKEN)'}.</p>
      </section>
    );
  }

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setAll = (ids: string[]) => setSel(new Set(ids));

  return (
    <section className="card">
      <h2 className="card-title">Custo & ROI de disparo · WhatsApp</h2>
      <p className="card-subtitle">
        Max + Maria · custo real da Meta (modelo por mensagem) · período {whatsapp.periodSince.split('-').reverse().slice(0, 2).join('/')} → {whatsapp.periodUntil.split('-').reverse().slice(0, 2).join('/')}
        {' · '}<span className="text-tbs-orange font-semibold">câmbio R$ {whatsapp.fxUsdBrl.toFixed(2)}/US$</span>
        {whatsapp.fxDate ? ` (${whatsapp.fxDate.slice(8, 10)}/${whatsapp.fxDate.slice(5, 7)} ${whatsapp.fxDate.slice(11, 16)})` : ''}
      </p>
      <div className="divider-accent mb-4" />

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {whatsapp.accounts.map((a) => (
          <div key={a.waba} className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3">
            <div className="text-[11px] uppercase tracking-wide text-tbs-mute-light dark:text-tbs-mute">{a.waba} · marketing</div>
            <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{fmtR(a.marketingUsd * whatsapp.fxUsdBrl)}</div>
            <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">US$ {a.marketingUsd.toFixed(2)} · {fmtN(a.marketingVol)} msgs</div>
          </div>
        ))}
        <div className="rounded-xl border border-tbs-orange/40 bg-tbs-orange/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-tbs-orange-deep dark:text-tbs-orange-light">Total marketing</div>
          <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{fmtR(whatsapp.totalMarketingBrl)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">US$ {whatsapp.totalMarketingUsd.toFixed(2)}</div>
        </div>
      </div>

      {/* Controles de seleção */}
      <div className="flex flex-wrap items-center gap-2 mb-2 text-[12px]">
        <span className="text-tbs-mute-light dark:text-tbs-mute">Escolha os disparos na tela:</span>
        <button onClick={() => setAll(disparos.map((d) => d.id))} className="rounded-lg border border-tbs-line-light dark:border-tbs-line px-2.5 py-1 hover:border-tbs-orange/60">Todos</button>
        <button onClick={() => setAll(disparos.filter((d) => d.isTbs).map((d) => d.id))} className="rounded-lg border border-tbs-line-light dark:border-tbs-line px-2.5 py-1 hover:border-tbs-orange/60">Só TBS</button>
        <button onClick={() => setAll([])} className="rounded-lg border border-tbs-line-light dark:border-tbs-line px-2.5 py-1 hover:border-tbs-orange/60">Limpar</button>
      </div>

      {/* Tabela selecionável */}
      <div className="overflow-auto max-h-[420px] rounded-xl border border-tbs-line-light dark:border-tbs-line">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-tbs-surface-light dark:bg-tbs-surface">
              <th className="px-2 py-2 text-center sticky top-0 bg-tbs-surface-light dark:bg-tbs-surface">✓</th>
              <th className="px-2.5 py-2 text-left sticky top-0 bg-tbs-surface-light dark:bg-tbs-surface">Disparo (template)</th>
              <th className="px-2.5 py-2 text-center sticky top-0 bg-tbs-surface-light dark:bg-tbs-surface">Conta</th>
              <th className="px-2.5 py-2 text-right sticky top-0 bg-tbs-surface-light dark:bg-tbs-surface">Enviadas</th>
              <th className="px-2.5 py-2 text-right sticky top-0 bg-tbs-surface-light dark:bg-tbs-surface">Custo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {disparos.map((d) => {
              const on = sel.has(d.id);
              return (
                <tr key={d.id} className={`border-t border-tbs-line-light dark:border-tbs-line cursor-pointer ${on ? 'bg-tbs-orange/5' : 'hover:bg-tbs-surface-light dark:hover:bg-tbs-bg-3/40'}`} onClick={() => toggle(d.id)}>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={on} onChange={() => toggle(d.id)} onClick={(e) => e.stopPropagation()} /></td>
                  <td className="px-2.5 py-1.5 text-left text-tbs-ink-light dark:text-white">{d.name}{d.isTbs && <span className="ml-1 text-[9px] text-tbs-orange-deep dark:text-tbs-orange-light">TBS</span>}</td>
                  <td className="px-2.5 py-1.5 text-center text-tbs-mute-light dark:text-tbs-mute">{d.waba}</td>
                  <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtN(d.sent)}</td>
                  <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtR2(d.costBrl)}</td>
                </tr>
              );
            })}
            {disparos.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-tbs-mute-light dark:text-tbs-mute">Nenhum disparo com envios no período.</td></tr>}
          </tbody>
          <tfoot>
            <tr className="bg-tbs-ink-light/90 dark:bg-tbs-bg-3 text-white font-bold sticky bottom-0">
              <td className="px-2 py-2 text-center" colSpan={3}>SELECIONADOS ({selData.n})</td>
              <td className="px-2.5 py-2 text-right">{fmtN(selData.enviadas)}</td>
              <td className="px-2.5 py-2 text-right">{fmtR2(selData.custoBrl)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Retorno (agregado do canal) — usa o custo TOTAL exato, não o selecionado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-tbs-mute-light dark:text-tbs-mute">Custo total marketing (exato)</div>
          <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{fmtR(totalBrl)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">Max + Maria · categoria Marketing</div>
        </div>
        <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-tbs-mute-light dark:text-tbs-mute">Vendas via WhatsApp</div>
          <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{fmtN(waVendas)}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">
            {waLive != null && waUpsell != null ? <>live {fmtN(waLive)} · upsell {fmtN(waUpsell)}</> : 'canal (não por disparo)'}
          </div>
        </div>
        <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-tbs-mute-light dark:text-tbs-mute">Custo por venda (CAC)</div>
          <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{waVendas > 0 ? fmtR2(cac) : '—'}</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">custo total ÷ vendas WhatsApp</div>
        </div>
        <div className="rounded-xl border border-tbs-line-light dark:border-tbs-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-tbs-mute-light dark:text-tbs-mute">Detalhado por template</div>
          <div className="text-lg font-bold text-tbs-ink-light dark:text-white">{Math.round(coverage * 100)}%</div>
          <div className="text-[11px] text-tbs-mute-light dark:text-tbs-mute">{fmtR(attributedBrl)} de {fmtR(totalBrl)}</div>
        </div>
      </div>

      <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-3 leading-relaxed">
        <strong>Custo</strong> = valor real cobrado pela Meta (categoria Marketing), a <strong>US$ {(whatsapp.accounts[0]?.ratePerMsgUsd ?? 0).toFixed(4)}/msg</strong>. O total por conta é <strong>exato</strong>; a coluna por template cobre <strong>{Math.round(coverage * 100)}%</strong> do custo — o resto veio de templates que o WhatsApp só passou a detalhar por analytics recentemente (vai subir a cada dia). <strong>Câmbio</strong> do dia via {whatsapp.fxSource}, registrado acima com data/hora. O <strong>retorno</strong> acima é do <strong>canal WhatsApp</strong> (agregado); o retorno <strong>por disparo específico</strong> está no bloco abaixo. Autenticação/serviço ficam fora.
      </p>

      {/* Retorno por disparo específico — via propriedade carimbada pela automação HubSpot (sem UTM) */}
      {data.disparosHubspot && data.disparosHubspot.length > 0 && (
        <div className="mt-6 pt-5 border-t border-tbs-line-light dark:border-tbs-line">
          <h3 className="text-[13px] font-bold text-tbs-ink-light dark:text-white mb-1">Retorno por disparo específico</h3>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mb-3">
            Identificado via propriedade que a automação do HubSpot carimba em quem recebeu cada disparo — não depende de UTM nem de clique.
          </p>
          <div className="overflow-auto rounded-xl border border-tbs-line-light dark:border-tbs-line">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-tbs-surface-light dark:bg-tbs-surface">
                  <th className="px-2.5 py-2 text-left">Disparo</th>
                  <th className="px-2.5 py-2 text-right">Impactados</th>
                  <th className="px-2.5 py-2 text-right">Custo/msg</th>
                  <th className="px-2.5 py-2 text-right">Custo total</th>
                  <th className="px-2.5 py-2 text-right">Live</th>
                  <th className="px-2.5 py-2 text-right">Upsell</th>
                  <th className="px-2.5 py-2 text-right">Retorno (R$)</th>
                  <th className="px-2.5 py-2 text-right">% retorno</th>
                </tr>
              </thead>
              <tbody>
                {data.disparosHubspot.map((d) => {
                  const custoTotal = d.impactados * DISPARO_CUSTO_MSG;
                  const roiPct = custoTotal > 0 ? (d.retorno / custoTotal) * 100 : 0;
                  return (
                    <tr key={d.key} className="border-t border-tbs-line-light dark:border-tbs-line">
                      <td className="px-2.5 py-1.5 text-left text-tbs-ink-light dark:text-white">{d.label}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtN(d.impactados)}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-mute-light dark:text-tbs-mute">{fmtR2(DISPARO_CUSTO_MSG)}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtR2(custoTotal)}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtN(d.liveVendas)}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtN(d.upsellVendas)}</td>
                      <td className="px-2.5 py-1.5 text-right text-tbs-ink-light dark:text-white">{fmtR2(d.retorno)}</td>
                      <td className="px-2.5 py-1.5 text-right font-semibold" style={{ color: roiPct >= 100 ? '#1a9e5f' : '#d24b3e' }}>{roiPct.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-tbs-mute-light dark:text-tbs-mute mt-2 leading-relaxed">
            <strong>Custo/msg é uma estimativa fixa de R$ 0,30</strong> (não é o custo real da Meta por template como no bloco acima — aqui não dá pra saber o template exato de cada disparo, só quem foi impactado). <strong>Impactados</strong> = contatos com a propriedade do disparo marcada. <strong>Live/Upsell</strong> = vendas fechadas desses contatos (Kiwify/HubSpot), pode incluir venda que não foi causada pelo disparo (o contato pode ter comprado por outro caminho). <strong>% retorno</strong> = retorno ÷ custo total — acima de 100% significa que a receita gerada supera o custo do disparo.
          </p>
        </div>
      )}
    </section>
  );
}
