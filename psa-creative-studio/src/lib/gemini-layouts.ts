import { GoogleGenAI } from "@google/genai";
import { fallbackSpecs, sanitizeSpec, type CopyInput, type LayoutSpec } from "@/lib/layout-spec";

// Modelos de TEXTO (não o de imagem) — baratos, pra propor as plantas de
// layout. Tenta em ordem: modelos gemini-2.x foram descontinuados pra chaves
// novas (404), então a lista prioriza os atuais. GEMINI_TEXT_MODEL força um.
const MODELS = [
  process.env.GEMINI_TEXT_MODEL,
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
].filter((m): m is string => Boolean(m));

const SCHEMA_DOC = `
Cada layout é um objeto JSON:
{
  "concept": string (nome curto da ideia, ex "Manchete gigante"),
  "colorway": "navy" | "orange" | "light" | "mono",
  "vAlign": "top" | "center" | "bottom",
  "hAlign": "left" | "center",
  "photo": "none" | "full" | "side" | "bottom",   // onde entra a foto (placeholder)
  "bgFx": "none" | "bars" | "rings" | "burst" | "spotlight",  // fundo decorativo (glow laranja da marca) — use MUITO em peças sem foto; escondido quando photo=full
  "ctaStyle": "underline" | "pill",   // "underline" é o padrão da marca (texto com risco laranja); pill é secundário
  "band": "none" | "bottom",          // faixa laranja no rodapé com o CTA dentro (opcional)
  "credit": { "name": string, "role": string } | null,  // labels laterais de campeão (ex name "BETTY AGI", role "CAMPEÃ · 2ª EDIÇÃO"); use em peça de depoimento/campeão
  "seloPosition": "top-left"|"top-right"|"bottom-left"|"bottom-right"|"none",
  "logoPosition": "top-left"|"top-center"|"top-right"|"bottom-left"|"bottom-right",
  "blocks": [  // 1 a 6 blocos, NA ORDEM em que aparecem
     {"type":"eyebrow","text":string}
   | {"type":"headline","text":string,"scale":"md"|"lg"|"xl"|"mega","highlight":string|null}  // "mega" = palavra/linha gigante; highlight = 1 palavra do texto em laranja
   | {"type":"quote","text":string,"highlight":string|null}
   | {"type":"subtext","text":string}
   | {"type":"stat","number":string,"label":string}   // ex number "R$ 1mi", "35 mil", "150"
   | {"type":"cta","text":string}
   | {"type":"tag","name":string,"subtitle":string}
   | {"type":"divider"}
  ]
}`;

const BRAND = `
Marca: The Best Speaker Brasil (TBS) — o maior reality de palestrantes do Brasil.
Paleta: navy escuro #0E0031, laranja #FF7A1E, off-white #F4F4F4.
Fatos da campanha que você pode usar em stat/eyebrow: "20 chegam ao reality", "10 vão à final",
"1 leva R$ 1 milhão", "35 mil inscritos", "o único requisito é ter algo a dizer".
`;

function buildPrompt(copy: CopyInput, count: number, basedOn?: LayoutSpec[], brief?: string): string {
  const briefLine = brief?.trim()
    ? `\nDIREÇÃO DO USUÁRIO para esta leva (prioridade alta, siga à risca): "${brief.trim()}".\n`
    : "";
  const base = basedOn?.length
    ? `O usuário GOSTOU destes layouts (JSON): ${JSON.stringify(basedOn)}.\n` +
      `Proponha ${count} VARIAÇÕES que mantenham o espírito deles, mas mudem estrutura, ` +
      `hierarquia, colorway ou uso de foto. Não repita layouts idênticos.\n`
    : `Proponha ${count} layouts ESTRUTURALMENTE DIFERENTES entre si. Cada um deve parecer uma ` +
      `peça distinta, não uma variação de cor da mesma. Varie de propósito e sem repetir: ` +
      `vAlign, hAlign, ORDEM/escolha dos blocos, escala do headline (use md, lg, xl E mega), ` +
      `bgFx (bars/rings/burst/spotlight — principalmente nas peças SEM foto), photo, colorway, ` +
      `band, e a posição de selo e logo.\n` +
      `Espelhe estes arquétipos reais da marca (distribua entre eles, máx 2 do mesmo tipo):\n` +
      `1) Campeão/depoimento: photo full + credit {name,role} + headline no topo + cta underline.\n` +
      `2) Palavra gigante: headline scale "mega" (1 palavra) centralizado, bgFx bars ou rings, sem foto.\n` +
      `3) Prêmio/burst: headline com "R$ 1 milhão" em destaque, bgFx burst, sem foto.\n` +
      `4) Portal de anéis: photo full + bgFx rings + headline no topo.\n` +
      `5) Multi-statement: 2-3 headlines curtos empilhados (ex "150 vagas." / "R$ 1 milhão em prêmios." / "Uma história que pode ser a sua.") alternando highlight.\n` +
      `6) Faixa de rodapé: band "bottom" com o cta dentro, headline grande em cima.\n` +
      `7) Manifesto: várias subtext (parágrafos) à esquerda + photo side.\n` +
      `8) Split com foto lateral + bgFx spotlight.\n`;

  return (
    `Você é diretor de arte da TBS. Crie criativos estáticos como "plantas" JSON (NÃO HTML).\n` +
    BRAND +
    briefLine +
    `\nA copy base desta rodada (use e/ou reescreva o texto nos blocos, em português):\n` +
    `- persona: ${copy.persona}\n- headline: ${copy.headline}\n- texto: ${copy.textoPrincipal}\n` +
    `- cta: ${copy.cta}\n- ângulo: ${copy.angulo}\n\n` +
    base +
    `\nFormato do layout:${SCHEMA_DOC}\n\n` +
    `Regras: 'highlight' deve ser uma palavra que aparece no texto do bloco. Textos curtos e ` +
    `impactantes. Responda APENAS com um array JSON de ${count} objetos, sem comentários.`
  );
}

function extractJsonArray(text: string): unknown[] {
  // remove cercas de código e pega o primeiro array
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function proposeLayouts(
  copy: CopyInput,
  count: number,
  basedOn?: LayoutSpec[],
  brief?: string,
): Promise<{ specs: LayoutSpec[]; source: "ai" | "fallback" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { specs: fallbackSpecs(copy, count), source: "fallback" };

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(copy, count, basedOn, brief);

  for (const model of MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", temperature: 1.1 },
      });
      const raw = extractJsonArray(response.text ?? "");
      const specs = raw.map(sanitizeSpec).filter((s): s is LayoutSpec => s !== null);
      if (specs.length === 0) continue; // modelo respondeu vazio/ inválido → tenta o próximo
      if (specs.length < count) specs.push(...fallbackSpecs(copy, count - specs.length));
      return { specs: specs.slice(0, count), source: "ai" };
    } catch {
      // 404 (modelo descontinuado) / 503 (sobrecarga) → tenta o próximo modelo
      continue;
    }
  }
  return { specs: fallbackSpecs(copy, count), source: "fallback" };
}
