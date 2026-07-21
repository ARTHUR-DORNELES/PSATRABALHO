// =====================================================================
// Parser da colagem de copy — aceita dois formatos, auto-detectados:
//
// 1) TSV (colunas separadas por TAB, de colar planilha do Sheets/Excel):
//    Persona | Prioridade | # | Ângulo | Texto principal | Título (headline) | CTA
//    Pode vir com colunas extras em branco no final (efeito comum de colar
//    planilha). Detectado quando o texto colado contém pelo menos um TAB.
//
// 2) Solto (título da peça + parágrafo corrido, separados por linha em
//    branco), ex:
//      AD TÉCNICO DE SEGURANÇA 04 - ESTÁTICO
//      "Sou técnico, não tenho lábia." Você conduz DDS... Inscreva-se.
//    Sem TAB nenhum — usado quando não há a tabela estruturada. Nesse caso
//    não há CTA nem headline explícitos: são inferidos (ver parseLooseBlocks).
// =====================================================================

export interface ParsedCopyRow {
  persona: string;
  prioridade: string | null;
  numeroAngulo: string | null;
  angulo: string | null;
  textoPrincipal: string;
  headline: string;
  cta: string | null;
}

export interface ParseCopyResult {
  rows: ParsedCopyRow[];
  skipped: number;
}

const HEADER_ALIASES = ["persona"];

function cell(cols: string[], index: number): string {
  return (cols[index] ?? "").trim();
}

function parseTsv(raw: string): ParseCopyResult {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  let skipped = 0;
  const rows: ParsedCopyRow[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    const first = cell(cols, 0).toLowerCase();

    // Pula a linha de cabeçalho, se existir.
    if (HEADER_ALIASES.includes(first)) continue;

    const persona = cell(cols, 0);
    const prioridade = cell(cols, 1) || null;
    const numeroAngulo = cell(cols, 2) || null;
    const angulo = cell(cols, 3) || null;
    const textoPrincipal = cell(cols, 4);
    const headline = cell(cols, 5);
    const cta = cell(cols, 6);

    if (!persona || !textoPrincipal || !headline || !cta) {
      skipped += 1;
      continue;
    }

    rows.push({ persona, prioridade, numeroAngulo, angulo, textoPrincipal, headline, cta });
  }

  return { rows, skipped };
}

// Cada bloco: uma linha de título (ex: "AD TÉCNICO DE SEGURANÇA 04 - ESTÁTICO
// - nota opcional") seguida do parágrafo de copy, separados por linha(s) em
// branco. Não há headline/CTA explícitos nesse formato — são inferidos:
// headline = 1ª frase do parágrafo; CTA fica null (editável depois).
function parseLooseBlocks(raw: string): ParseCopyResult {
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  let skipped = 0;
  const rows: ParsedCopyRow[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      skipped += 1;
      continue;
    }

    const [titleLine, ...bodyLines] = lines;
    const textoPrincipal = bodyLines.join(" ").trim();
    if (!textoPrincipal) {
      skipped += 1;
      continue;
    }

    // "AD TÉCNICO DE SEGURANÇA 04 - ESTÁTICO - nota opcional"
    //   segments[0] = "AD TÉCNICO DE SEGURANÇA 04" -> persona + número
    //   segments[1] = "ESTÁTICO" (tag de formato, ignorada)
    //   segments[2+] = nota do autor -> vira "ângulo"
    const segments = titleLine.split(/\s+-\s+/).map((s) => s.trim());
    const subject = segments[0] || titleLine;
    const angulo = segments.length > 2 ? segments.slice(2).join(" - ") : null;

    const numeroMatch = subject.match(/(\d+)\s*$/);
    const numeroAngulo = numeroMatch ? numeroMatch[1] : null;
    const persona = subject.replace(/^ad\s+/i, "").replace(/\d+\s*$/, "").trim() || titleLine;

    // (?!\d) evita cortar em números com separador de milhar/decimal (ex: "3.000").
    const sentenceMatch = textoPrincipal.match(/^.+?[.!?](?!\d)/);
    const headline = (sentenceMatch ? sentenceMatch[0] : textoPrincipal).trim();

    rows.push({
      persona,
      prioridade: null,
      numeroAngulo,
      angulo,
      textoPrincipal,
      headline,
      cta: null,
    });
  }

  return { rows, skipped };
}

export function parseCopyPaste(raw: string): ParseCopyResult {
  return raw.includes("\t") ? parseTsv(raw) : parseLooseBlocks(raw);
}
