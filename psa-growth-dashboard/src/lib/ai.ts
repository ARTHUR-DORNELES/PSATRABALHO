// =====================================================================
// Geração de sugestões de melhoria por experimento.
// Usa @anthropic-ai/sdk (mesmo pacote do psa-bonus-dashboard). Se não
// houver ANTHROPIC_API_KEY, cai num gerador heurístico — assim o painel
// sempre devolve sugestões úteis.
// =====================================================================
import Anthropic from "@anthropic-ai/sdk";
import { createSuggestion, getFunnel, listBenchmarks, listMetricDefs } from "./db";
import type { AiSuggestion, Benchmark, ExperimentFunnel } from "./types";

// Modelo de geração de texto. Trocar aqui se quiser opus/haiku.
const MODEL = "claude-sonnet-4-6";

type Draft = {
  title: string;
  body: string;
  rationale?: string;
  expectedImpact?: string;
  priority: number;
};

function buildContext(
  funnel: ExperimentFunnel,
  targetLabel: string,
  benchmarks: Benchmark[],
) {
  const r = funnel.result;
  return {
    nome: funnel.experiment.name,
    canal: funnel.channel?.name,
    hipotese: funnel.experiment.hypothesis,
    execucao: funnel.experiment.execution,
    metricaAlvo: targetLabel,
    taxaControle: r?.controlRate,
    taxaMelhor: r?.bestRate,
    liftRelativo: r?.relativeLift,
    confianca: r?.confidence,
    significativo: r?.isSignificant,
    recomendacao: r?.recommendation,
    faltamPorBraco: r?.remainingNPerArm,
    leads: r?.leadsAttributed,
    receita: r?.revenueAttributed,
    cac: r?.cac,
    benchmarks: benchmarks
      .filter((b) => b.metricKey === funnel.criteria?.targetMetricKey)
      .map((b) => ({ tipo: b.kind, valor: b.value, fonte: b.source })),
  };
}

function extractJsonArray(text: string): string {
  const m = text.match(/\[[\s\S]*\]/);
  return m ? m[0] : text;
}

async function viaAnthropic(context: Record<string, unknown>): Promise<Draft[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const system =
    "Você é um especialista sênior de Growth da PSA (Profissionais SA). " +
    "Analise os dados do experimento e gere de 2 a 3 sugestões de melhoria, " +
    "práticas e específicas, em português do Brasil. Considere significância " +
    "estatística, comparação com benchmarks e próximos passos de aquisição. " +
    'Responda APENAS com um array JSON válido (sem markdown), no formato: ' +
    '[{"title":"...","body":"...","rationale":"...","expectedImpact":"...","priority":1}] ' +
    "onde priority é 1 (baixa), 2 (média) ou 3 (alta).";
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: JSON.stringify(context) }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(extractJsonArray(text)) as Draft[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Resposta vazia da IA.");
  return parsed;
}

function heuristic(
  funnel: ExperimentFunnel,
  targetLabel: string,
  benchmarks: Benchmark[],
): Draft[] {
  const r = funnel.result;
  const out: Draft[] = [];
  if (!r) {
    return [
      {
        title: "Sincronizar os números do teste",
        body: "Ainda não há métricas sincronizadas para este experimento. Conecte o canal (HubSpot/N8N) ou rode uma sincronização para começar a medir o retorno.",
        priority: 1,
      },
    ];
  }
  const lift = r.relativeLift != null ? `${(r.relativeLift * 100).toFixed(1)}%` : "—";
  const conf = r.confidence != null ? `${(r.confidence * 100).toFixed(0)}%` : "—";

  switch (r.recommendation) {
    case "DECLARE_WINNER":
      out.push({
        title: "Oficializar a variante vencedora e escalar",
        body: `A melhor variante supera o controle em ${lift} com ${conf} de confiança — acima do alvo. Promova-a como padrão, arquive a hipótese antiga e escale para o restante da base.`,
        rationale: "Significância estatística atingida no efeito mínimo relevante.",
        expectedImpact: `Ganho recorrente de ${lift} na ${targetLabel.toLowerCase()}.`,
        priority: 3,
      });
      break;
    case "STOP_NO_EFFECT":
      out.push({
        title: "Encerrar o teste e realocar a verba",
        body: "A amostra já é suficiente e o efeito ficou abaixo do mínimo relevante. Encerre sem mudança e direcione o esforço para hipóteses de maior potencial.",
        rationale: "Amostra superou o necessário sem diferença significativa.",
        expectedImpact: "Liberar capacidade de teste para novos formatos.",
        priority: 2,
      });
      break;
    case "INCONCLUSIVE":
      out.push({
        title: "Revisar o desenho do teste",
        body: "O prazo de decisão venceu sem significância. Reavalie o tamanho de efeito esperado, aumente o volume ou segmente melhor o público.",
        priority: 2,
      });
      break;
    default: // NEEDS_MORE_DATA / KEEP_RUNNING
      out.push({
        title: "Manter rodando para ganhar significância",
        body: `O lift observado é ${lift}, mas ainda não é conclusivo.${
          r.remainingNPerArm ? ` Faltam ~${Math.round(r.remainingNPerArm)} por braço.` : ""
        } Mantenha o teste antes de decidir.`,
        expectedImpact: "Chegar ao nível de confiança alvo sem decidir cedo demais.",
        priority: 1,
      });
  }

  const bmk = benchmarks.find((b) => b.metricKey === funnel.criteria?.targetMetricKey);
  if (bmk && r.bestRate != null) {
    const above = r.bestRate >= bmk.value;
    out.push({
      title: `Comparar com o benchmark ${bmk.kind === "MARKET" ? "de mercado" : "interno"}`,
      body: `A melhor variante está ${above ? "acima" : "abaixo"} do benchmark de ${(bmk.value * 100).toFixed(1)}%${bmk.source ? ` (${bmk.source})` : ""}. ${
        above
          ? "Bom patamar — registre como novo baseline interno."
          : "Há espaço para testar variações mais agressivas."
      }`,
      priority: 1,
    });
  }
  return out;
}

export async function generateSuggestions(experimentId: string): Promise<AiSuggestion[]> {
  const funnel = await getFunnel(experimentId);
  if (!funnel) throw new Error("Experimento não encontrado.");
  const [metricDefs, benchmarks] = await Promise.all([listMetricDefs(), listBenchmarks()]);
  const targetLabel =
    metricDefs.find((m) => m.key === funnel.criteria?.targetMetricKey)?.label ?? "métrica-alvo";
  const context = buildContext(funnel, targetLabel, benchmarks);

  let drafts: Draft[];
  let model = "heuristico";
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      drafts = await viaAnthropic(context as Record<string, unknown>);
      model = MODEL;
    } catch {
      drafts = heuristic(funnel, targetLabel, benchmarks);
    }
  } else {
    drafts = heuristic(funnel, targetLabel, benchmarks);
  }

  const saved: AiSuggestion[] = [];
  for (const d of drafts) {
    saved.push(
      await createSuggestion({
        experimentId,
        channelId: funnel.channel?.id ?? null,
        context: context as Record<string, unknown>,
        title: d.title,
        body: d.body,
        rationale: d.rationale ?? null,
        expectedImpact: d.expectedImpact ?? null,
        priority: d.priority ?? 1,
        model,
        status: "NEW",
      }),
    );
  }
  return saved;
}
