// =====================================================================
// Wrapper do Google Gemini 2.5 Flash Image ("nano banana") via @google/genai.
// generateCreative: gera a 1ª versão a partir de 1 imagem de referência + copy.
// refineCreative: pega a versão anterior + uma instrução e gera a próxima.
//
// Modelo configurável via GEMINI_IMAGE_MODEL (default abaixo) caso o id
// mude no futuro.
// =====================================================================
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import type { CopyEntry } from "@/lib/types";
import type { GenerationMode } from "@/lib/constants";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no .env.local.");
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

export interface GeneratedImage {
  imageBuffer: Buffer;
  mimeType: string;
  promptUsado: string;
}

async function callGemini(
  promptText: string,
  images: Array<{ data: Buffer; mimeType: string }>,
): Promise<GeneratedImage> {
  const client = getClient();
  const parts: Part[] = [{ text: promptText }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") } });
  }

  const contents: Content[] = [{ role: "user", parts }];
  const response = await client.models.generateContent({
    model: MODEL,
    contents,
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });

  const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = candidateParts.find((p) => p?.inlineData?.data);
  const imageData = imagePart?.inlineData?.data;

  if (!imageData) {
    const textPart = candidateParts.find((p) => p?.text)?.text;
    throw new Error(
      `O Gemini não retornou uma imagem.${textPart ? ` Resposta do modelo: ${textPart}` : ""}`,
    );
  }

  return {
    imageBuffer: Buffer.from(imageData, "base64"),
    mimeType: imagePart?.inlineData?.mimeType || "image/png",
    promptUsado: promptText,
  };
}

// Instrução base de estilo, reaproveitada pelos modos que envolvem imagem
// de referência (todos exceto COPY_ONLY).
function buildStyleInstruction(referenceCount: number): string {
  return referenceCount > 1
    ? `Você recebeu ${referenceCount} imagens de referência anexadas. Combine o que há de ` +
        `melhor em cada uma delas — paleta de cores, tipografia, composição e elementos ` +
        `gráficos — num único estilo visual coeso para a nova peça`
    : `Recrie esta peça de campanha mantendo fielmente o estilo visual da imagem de ` +
        `referência anexada (paleta de cores, tipografia, composição, logo e elementos ` +
        `gráficos de fundo)`;
}

// A imagem do logo é sempre a ÚLTIMA anexada (ver generateCreative) — o
// prompt referencia "a última imagem" pra desambiguar das referências de
// estilo. Instrução forte de "não redesenhar" porque o modelo tende a
// reinterpretar/estilizar logos vistos só dentro de fotos de referência.
function buildLogoInstruction(hasLogo: boolean): string {
  if (!hasLogo) return "";
  return (
    ` A última imagem anexada é o logo oficial da marca — reproduza-o EXATAMENTE como está ` +
    `(mesmas cores, formato, proporções e texto), sem redesenhar, recriar ou estilizar de forma ` +
    `diferente. Posicione-o de forma discreta e coerente com o restante da peça (ex: canto ` +
    `superior).`
  );
}

function buildGenerationPrompt(
  mode: GenerationMode,
  copyEntry: CopyEntry | null,
  referenceCount: number,
  brandNotes?: string,
  hasLogo?: boolean,
): string {
  const notas = brandNotes ? ` Observações de marca adicionais: ${brandNotes}.` : "";
  const logoInstrucao = buildLogoInstruction(Boolean(hasLogo));

  if (mode === "COPY_ONLY") {
    if (!copyEntry) throw new Error("Modo 'somente copy' exige uma linha de copy.");
    const ctaLine = copyEntry.cta ? `- CTA: "${copyEntry.cta}"\n` : "";
    return (
      `Crie uma peça de campanha do zero, com estilo visual moderno, fotografia profissional, ` +
      `paleta escura com tons de laranja e roxo, tema de palco/auditório/holofotes (na linha da ` +
      `identidade visual "The Best Speaker Brasil"), incorporando o seguinte texto:\n` +
      `- Texto principal: "${copyEntry.textoPrincipal}"\n` +
      `- Headline: "${copyEntry.headline}"\n` +
      ctaLine +
      `Formato quadrado, tipografia bold e legível, sem marca d'água.${notas}${logoInstrucao}`
    );
  }

  const instrucaoEstilo = buildStyleInstruction(referenceCount);

  if (mode === "MERGE_NO_TEXT") {
    const tema = copyEntry
      ? ` Use como direção temática, sem escrever nenhum texto: persona "${copyEntry.persona}"` +
        `${copyEntry.angulo ? `, ângulo "${copyEntry.angulo}"` : ""}.`
      : "";
    return (
      `${instrucaoEstilo}.${tema} IMPORTANTE: não inclua nenhum texto, palavra, letra ou número ` +
      `na imagem — só elementos visuais (fotografia, cores, composição, gráficos).${notas}${logoInstrucao}`
    );
  }

  if (mode === "MERGE_INSPIRED") {
    if (!copyEntry) throw new Error("Modo 'copy como inspiração' exige uma linha de copy.");
    return (
      `${instrucaoEstilo}. Use a linha de copy abaixo como DIREÇÃO CRIATIVA e tom — não copie o ` +
      `texto literalmente, escreva um headline e texto novos nessa mesma linha, direcionados à ` +
      `persona "${copyEntry.persona}":\n` +
      `- Tema/ângulo: "${copyEntry.angulo ?? copyEntry.headline}"\n` +
      `- Referência de mensagem: "${copyEntry.textoPrincipal}"\n` +
      `Mantenha o mesmo formato e proporção das referências, tipografia legível e sem marca ` +
      `d'água.${notas}${logoInstrucao}`
    );
  }

  // MERGE_LITERAL (padrão)
  if (!copyEntry) throw new Error("Modo 'copy literal' exige uma linha de copy.");
  const ctaLine = copyEntry.cta ? `- Botão ou chamada de ação (CTA): "${copyEntry.cta}"\n` : "";
  return (
    `${instrucaoEstilo}, mas troque o texto por uma nova mensagem direcionada à persona ` +
    `"${copyEntry.persona}":\n` +
    `- Texto principal / corpo: "${copyEntry.textoPrincipal}"\n` +
    `- Título / headline em destaque: "${copyEntry.headline}"\n` +
    ctaLine +
    `Mantenha o mesmo formato e proporção das referências, com qualidade fotográfica profissional, ` +
    `tipografia legível e sem marca d'água.${notas}${logoInstrucao}`
  );
}

export async function generateCreative(input: {
  mode: GenerationMode;
  referenceImages: Array<{ bytes: Buffer; mimeType: string }>;
  copyEntry: CopyEntry | null;
  brandNotes?: string;
  logo?: { bytes: Buffer; mimeType: string };
}): Promise<GeneratedImage> {
  const promptText = buildGenerationPrompt(
    input.mode,
    input.copyEntry,
    input.referenceImages.length,
    input.brandNotes,
    Boolean(input.logo),
  );
  // Logo sempre por último, pra bater com "a última imagem anexada" no prompt.
  const images = input.referenceImages.map((r) => ({ data: r.bytes, mimeType: r.mimeType }));
  if (input.logo) images.push({ data: input.logo.bytes, mimeType: input.logo.mimeType });
  return callGemini(promptText, images);
}

// Geração por PROMPT livre (Estúdio de imagem): o usuário escreve o prompt,
// escolhe o formato e opcionalmente anexa imagens de referência da biblioteca.
function buildImagePrompt(userPrompt: string, formatLabel: string, hasRefs: boolean): string {
  const brand =
    `Identidade The Best Speaker Brasil (TBS): paleta escura navy (#0E0031) com laranja ` +
    `(#FF7A1E), clima de palco/auditório/reality show, tipografia bold e legível. Sem marca d'água.`;
  const fmt = `Proporção/enquadramento da imagem: ${formatLabel}.`;
  const refs = hasRefs
    ? ` Use as imagens de referência anexadas como direção de estilo (paleta, composição, ` +
      `elementos gráficos) — sem copiá-las literalmente.`
    : "";
  return `${userPrompt.trim()}\n\n${brand} ${fmt}${refs}`;
}

export async function generateFromPrompt(input: {
  prompt: string;
  formatLabel: string;
  referenceImages: Array<{ bytes: Buffer; mimeType: string }>;
}): Promise<GeneratedImage> {
  const text = buildImagePrompt(input.prompt, input.formatLabel, input.referenceImages.length > 0);
  return callGemini(
    text,
    input.referenceImages.map((r) => ({ data: r.bytes, mimeType: r.mimeType })),
  );
}

export async function refineCreative(input: {
  previousImageBytes: Buffer;
  previousMimeType: string;
  instruction: string;
}): Promise<GeneratedImage> {
  const promptText =
    `Ajuste a imagem anexada de acordo com esta instrução, mantendo tudo o resto igual ` +
    `(estilo, composição e texto) exceto o que for pedido:\n"${input.instruction}"`;
  return callGemini(promptText, [
    { data: input.previousImageBytes, mimeType: input.previousMimeType },
  ]);
}
