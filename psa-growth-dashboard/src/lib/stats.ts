// =====================================================================
// Engine de decisão de experimentos (etapa 5 do funil)
// ---------------------------------------------------------------------
// Função PURA, sem dependências externas nem I/O — assim é testável em
// isolamento (ver stats.test.ts) e pode rodar tanto no sync quanto no
// endpoint /api/experiments/[id]/recompute.
//
// Caso A/B de TAXA (RATE): z-test de duas proporções com SE pooled.
// Caso alvo absoluto (COUNT/CURRENCY/RATIO ou RATE sem controle):
// compara o valor observado contra o alvo cadastrado.
// =====================================================================
import type { MetricKind, Recommendation } from "./types";

// ---------------------------------------------------------------------
// Estatística básica (sem libs)
// ---------------------------------------------------------------------

/** Função erro — aproximação Abramowitz & Stegun 7.1.26 (|erro| < 1.5e-7). */
export function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** CDF da normal padrão. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Quantil normal inverso — aproximação de Peter Acklam (|erro| < 1.15e-9). */
export function invNormal(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ---------------------------------------------------------------------
// z-test de duas proporções (pooled)
// ---------------------------------------------------------------------
export function twoProportionZTest(
  xC: number,
  nC: number,
  xT: number,
  nT: number,
  testType: "two-sided" | "one-sided",
): { z: number; p: number } {
  if (nC <= 0 || nT <= 0) return { z: 0, p: 1 };
  const pC = xC / nC;
  const pT = xT / nT;
  const pPool = (xC + xT) / (nC + nT);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nC + 1 / nT));
  if (se === 0) return { z: 0, p: 1 };
  const z = (pT - pC) / se;
  const p =
    testType === "one-sided"
      ? 1 - normalCdf(z)
      : 2 * (1 - normalCdf(Math.abs(z)));
  return { z, p: clamp(p, 0, 1) };
}

// ---------------------------------------------------------------------
// Amostra necessária por braço (duas proporções)
// ---------------------------------------------------------------------
export function requiredSamplePerArm(
  p1: number,
  effect: number,
  confidenceLevel: number,
  power: number,
): number {
  if (p1 <= 0 || p1 >= 1 || effect <= 0) return Infinity;
  const alpha = 1 - confidenceLevel;
  const zAlpha = invNormal(1 - alpha / 2); // two-sided
  const zBeta = invNormal(power);
  const p2 = clamp(p1 * (1 + effect), 1e-6, 0.999999);
  const pBar = (p1 + p2) / 2;
  const den = p2 - p1;
  if (den === 0) return Infinity;
  const num =
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / (den * den));
}

// ---------------------------------------------------------------------
// Avaliação completa de um experimento
// ---------------------------------------------------------------------
export interface VariantStat {
  variantId: string;
  isControl: boolean;
  /** Para RATE: numerador (ex: conversões). */
  numerator: number;
  /** Para RATE: denominador / amostra (ex: enviados). */
  denominator: number;
  /** Valor bruto (para COUNT/CURRENCY/RATIO). */
  value: number;
}

export interface DecisionInput {
  metricKind: MetricKind;
  higherIsBetter: 1 | -1;
  variants: VariantStat[];
  mde: number;
  confidenceLevel: number;
  power: number;
  testType: "two-sided" | "one-sided";
  targetValue?: number | null;
  /** O sync calcula isto comparando decision_deadline com a data atual. */
  deadlinePassed?: boolean;
}

export interface DecisionOutput {
  controlRate: number | null;
  bestVariantId: string | null;
  bestRate: number | null;
  controlN: number;
  bestN: number;
  absoluteLift: number | null;
  relativeLift: number | null;
  zScore: number | null;
  pValue: number | null;
  confidence: number | null;
  isSignificant: boolean;
  requiredNPerArm: number | null;
  remainingNPerArm: number | null;
  progressPct: number | null;
  recommendation: Recommendation;
}

function emptyOutput(): DecisionOutput {
  return {
    controlRate: null,
    bestVariantId: null,
    bestRate: null,
    controlN: 0,
    bestN: 0,
    absoluteLift: null,
    relativeLift: null,
    zScore: null,
    pValue: null,
    confidence: null,
    isSignificant: false,
    requiredNPerArm: null,
    remainingNPerArm: null,
    progressPct: null,
    recommendation: "NEEDS_MORE_DATA",
  };
}

/** Caminho de alvo absoluto: COUNT/CURRENCY/RATIO, ou RATE sem controle. */
function evaluateAbsolute(input: DecisionInput): DecisionOutput {
  const out = emptyOutput();
  const { variants, higherIsBetter, targetValue, deadlinePassed } = input;
  if (variants.length === 0) return out;

  // RATIO usa média dos valores; COUNT/CURRENCY somam.
  const actual =
    input.metricKind === "RATIO"
      ? variants.reduce((s, v) => s + v.value, 0) / variants.length
      : variants.reduce((s, v) => s + v.value, 0);

  out.bestRate = actual;
  out.bestVariantId = variants[0]?.variantId ?? null;

  if (targetValue == null || targetValue === 0) {
    out.recommendation = "KEEP_RUNNING";
    return out;
  }

  const reached =
    higherIsBetter === 1 ? actual >= targetValue : actual <= targetValue;
  // Progresso: para "maior melhor" é actual/target; para "menor melhor"
  // (ex: CAC) é target/actual (quanto menor o atual, mais perto).
  const progress =
    higherIsBetter === 1
      ? (actual / targetValue) * 100
      : actual > 0
        ? (targetValue / actual) * 100
        : 0;
  out.progressPct = clamp(progress, 0, 100);

  if (reached) out.recommendation = "DECLARE_WINNER";
  else if (deadlinePassed) out.recommendation = "INCONCLUSIVE";
  else out.recommendation = "KEEP_RUNNING";
  return out;
}

/** Caminho A/B de taxa (RATE com controle + ≥1 tratamento). */
function evaluateRate(input: DecisionInput): DecisionOutput {
  const out = emptyOutput();
  const { variants, higherIsBetter, mde, confidenceLevel, power, testType } =
    input;

  const control = variants.find((v) => v.isControl);
  const treatments = variants.filter((v) => !v.isControl);
  // Sem controle ou sem tratamento → não há comparação possível.
  if (!control || treatments.length === 0 || control.denominator <= 0) {
    return evaluateAbsolute(input);
  }

  const pC = control.numerator / control.denominator;
  out.controlRate = pC;
  out.controlN = control.denominator;

  // "Melhor" tratamento conforme a direção desejada.
  const rate = (v: VariantStat) =>
    v.denominator > 0 ? v.numerator / v.denominator : 0;
  const best = treatments.reduce((acc, v) =>
    higherIsBetter === 1
      ? rate(v) > rate(acc)
        ? v
        : acc
      : rate(v) < rate(acc)
        ? v
        : acc,
  );

  const pT = rate(best);
  out.bestVariantId = best.variantId;
  out.bestRate = pT;
  out.bestN = best.denominator;
  out.absoluteLift = pT - pC;
  out.relativeLift = pC > 0 ? (pT - pC) / pC : null;

  const { z, p } = twoProportionZTest(
    control.numerator,
    control.denominator,
    best.numerator,
    best.denominator,
    testType,
  );
  out.zScore = z;
  out.pValue = p;
  out.confidence = clamp(1 - p, 0, 1);
  out.isSignificant = p < 1 - confidenceLevel;

  // "Quanto falta": usa o maior entre o MDE cadastrado e o lift observado,
  // para não prometer significância cedo demais.
  const observed = out.relativeLift != null ? Math.abs(out.relativeLift) : 0;
  const effect = Math.max(mde, observed);
  const required = requiredSamplePerArm(pC, effect, confidenceLevel, power);
  out.requiredNPerArm = Number.isFinite(required) ? required : null;
  const currentN = Math.min(control.denominator, best.denominator);
  out.remainingNPerArm =
    out.requiredNPerArm != null
      ? Math.max(0, out.requiredNPerArm - currentN)
      : null;
  out.progressPct =
    out.requiredNPerArm && out.requiredNPerArm > 0
      ? clamp((currentN / out.requiredNPerArm) * 100, 0, 100)
      : null;

  // Direção do lift coerente com o objetivo da métrica.
  const goodDirection =
    out.relativeLift != null &&
    ((higherIsBetter === 1 && out.relativeLift > 0) ||
      (higherIsBetter === -1 && out.relativeLift < 0));

  if (out.isSignificant && goodDirection && observed >= mde) {
    out.recommendation = "DECLARE_WINNER";
  } else if (out.isSignificant && !goodDirection) {
    out.recommendation = "STOP_NO_EFFECT";
  } else if (out.requiredNPerArm != null && currentN >= out.requiredNPerArm) {
    // Atingiu a amostra-alvo e ainda não deu significância no efeito relevante.
    out.recommendation = "STOP_NO_EFFECT";
  } else if (input.deadlinePassed) {
    out.recommendation = "INCONCLUSIVE";
  } else {
    out.recommendation = "NEEDS_MORE_DATA";
  }
  return out;
}

/**
 * Avalia um experimento e devolve os campos que alimentam
 * experiment_results (etapas 4 e 5 do funil). Pura e determinística.
 */
export function evaluateExperiment(input: DecisionInput): DecisionOutput {
  if (input.metricKind === "RATE") return evaluateRate(input);
  return evaluateAbsolute(input);
}
