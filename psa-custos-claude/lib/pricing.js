// Preços de API por 1M tokens (USD). in = entrada, out = saída.
// cache read ≈ 0,1× do preço de entrada; cache write ≈ 1,25×.
export const PRICING = {
  "opus-4-8": [5, 25],
  "opus-4-7": [5, 25],
  "opus-4-6": [5, 25],
  "opus-4-5": [5, 25],
  "sonnet-5": [3, 15],
  "sonnet-4-6": [3, 15],
  "sonnet-4-5": [3, 15],
  "haiku-4-5": [1, 5],
  "fable-5": [10, 50],
};

// normaliza um id/nome de modelo qualquer para uma chave de PRICING
export function normalizeModel(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("fable")) return "fable-5";
  if (s.includes("haiku")) return "haiku-4-5";
  if (s.includes("opus")) {
    if (s.includes("4-8") || s.includes("4.8")) return "opus-4-8";
    if (s.includes("4-7") || s.includes("4.7")) return "opus-4-7";
    if (s.includes("4-6") || s.includes("4.6")) return "opus-4-6";
    return "opus-4-8";
  }
  if (s.includes("sonnet")) {
    if (s.includes("4-6") || s.includes("4.6")) return "sonnet-4-6";
    if (s.includes("-5") || s.includes(" 5") || s.endsWith("5")) return "sonnet-5";
    return "sonnet-5";
  }
  return "opus-4-8"; // default conservador (mais caro) quando desconhecido
}

export const MODEL_LABEL = {
  "opus-4-8": "Opus 4.8", "opus-4-7": "Opus 4.7", "opus-4-6": "Opus 4.6", "opus-4-5": "Opus 4.5",
  "sonnet-5": "Sonnet 5", "sonnet-4-6": "Sonnet 4.6", "sonnet-4-5": "Sonnet 4.5",
  "haiku-4-5": "Haiku 4.5", "fable-5": "Fable 5",
};

// valor-equivalente de API (USD) dado tokens por tipo
export function equivCost(modelKey, { inTok = 0, outTok = 0, cacheRead = 0, cacheWrite = 0 }) {
  const [pi, po] = PRICING[modelKey] || [5, 25];
  return (inTok * pi + outTok * po + cacheRead * pi * 0.1 + cacheWrite * pi * 1.25) / 1e6;
}
