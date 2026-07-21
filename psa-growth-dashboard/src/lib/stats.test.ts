// Testes da engine de decisão. Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  erf,
  normalCdf,
  invNormal,
  twoProportionZTest,
  requiredSamplePerArm,
  evaluateExperiment,
  type DecisionInput,
} from "./stats";

const base = {
  confidenceLevel: 0.95,
  power: 0.8,
  testType: "two-sided" as const,
  mde: 0.1,
};

test("erf / normalCdf valores conhecidos", () => {
  assert.ok(Math.abs(erf(0)) < 1e-9);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 2e-3);
  assert.ok(Math.abs(normalCdf(-1.96) - 0.025) < 2e-3);
});

test("invNormal é inverso da normalCdf", () => {
  assert.ok(Math.abs(invNormal(0.5)) < 1e-6);
  assert.ok(Math.abs(invNormal(0.975) - 1.959964) < 1e-3);
  assert.ok(Math.abs(invNormal(0.8) - 0.841621) < 1e-3);
});

test("twoProportionZTest detecta diferença forte", () => {
  const { z, p } = twoProportionZTest(1000, 10000, 1300, 10000, "two-sided");
  assert.ok(z > 6, `z esperado > 6, veio ${z}`);
  assert.ok(p < 0.001, `p esperado < 0.001, veio ${p}`);
});

test("requiredSamplePerArm cresce quando o efeito diminui", () => {
  const big = requiredSamplePerArm(0.1, 0.3, 0.95, 0.8);
  const small = requiredSamplePerArm(0.1, 0.1, 0.95, 0.8);
  assert.ok(small > big, "efeito menor deve exigir amostra maior");
  assert.ok(Number.isFinite(small));
});

test("A/B com vencedor significativo → DECLARE_WINNER", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "RATE",
    higherIsBetter: 1,
    targetValue: null,
    variants: [
      { variantId: "c", isControl: true, numerator: 1000, denominator: 10000, value: 1000 },
      { variantId: "a", isControl: false, numerator: 1300, denominator: 10000, value: 1300 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.isSignificant, true);
  assert.equal(out.recommendation, "DECLARE_WINNER");
  assert.equal(out.bestVariantId, "a");
  assert.ok(out.relativeLift! > 0.25 && out.relativeLift! < 0.35);
  assert.ok(out.confidence! > 0.99);
});

test("A/B sem efeito e amostra pequena → NEEDS_MORE_DATA", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "RATE",
    higherIsBetter: 1,
    targetValue: null,
    variants: [
      { variantId: "c", isControl: true, numerator: 100, denominator: 1000, value: 100 },
      { variantId: "a", isControl: false, numerator: 105, denominator: 1000, value: 105 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.isSignificant, false);
  assert.equal(out.recommendation, "NEEDS_MORE_DATA");
  assert.ok(out.remainingNPerArm! > 0, "deve faltar amostra");
  assert.ok(out.progressPct! < 100);
});

test("RATE sem controle cai no caminho de alvo absoluto", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "RATE",
    higherIsBetter: 1,
    targetValue: null,
    variants: [
      { variantId: "a", isControl: false, numerator: 50, denominator: 500, value: 50 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.zScore, null);
  assert.equal(out.recommendation, "KEEP_RUNNING");
});

test("alvo absoluto COUNT atingido → DECLARE_WINNER", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "COUNT",
    higherIsBetter: 1,
    targetValue: 50,
    variants: [
      { variantId: "a", isControl: false, numerator: 0, denominator: 0, value: 60 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.recommendation, "DECLARE_WINNER");
  assert.equal(out.progressPct, 100);
});

test("alvo absoluto COUNT não atingido → KEEP_RUNNING (progresso parcial)", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "COUNT",
    higherIsBetter: 1,
    targetValue: 50,
    variants: [
      { variantId: "a", isControl: false, numerator: 0, denominator: 0, value: 30 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.recommendation, "KEEP_RUNNING");
  assert.equal(out.progressPct, 60);
});

test("CAC (menor é melhor) atingido → DECLARE_WINNER", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "RATIO",
    higherIsBetter: -1,
    targetValue: 100,
    variants: [
      { variantId: "a", isControl: false, numerator: 0, denominator: 0, value: 80 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.recommendation, "DECLARE_WINNER");
  assert.equal(out.progressPct, 100);
});

test("deadline vencido sem significância → INCONCLUSIVE", () => {
  const input: DecisionInput = {
    ...base,
    metricKind: "RATE",
    higherIsBetter: 1,
    targetValue: null,
    deadlinePassed: true,
    variants: [
      { variantId: "c", isControl: true, numerator: 100, denominator: 1000, value: 100 },
      { variantId: "a", isControl: false, numerator: 103, denominator: 1000, value: 103 },
    ],
  };
  const out = evaluateExperiment(input);
  assert.equal(out.isSignificant, false);
  assert.equal(out.recommendation, "INCONCLUSIVE");
});
