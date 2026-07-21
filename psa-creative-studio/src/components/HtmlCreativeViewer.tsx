"use client";

import { useRef, useState, type ReactNode } from "react";
import { Copy, Download } from "lucide-react";

// Serializa só o conteúdo do criativo (não o botão/chrome ao redor) num
// documento HTML autocontido — pronto pra colar na aba "Paste code" do
// plugin html.to.design, ou salvar como arquivo pra importar por upload.
function buildStandaloneHtml(inner: string): string {
  return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8" /></head>\n<body style="margin:0;">\n${inner}\n</body>\n</html>\n`;
}

export function HtmlCreativeViewer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCopy() {
    if (!ref.current) return;
    const html = buildStandaloneHtml(ref.current.innerHTML);
    try {
      await navigator.clipboard.writeText(html);
      setMessage('HTML copiado — cole no plugin html.to.design (aba "Paste code").');
    } catch {
      setMessage("Não deu pra copiar automaticamente — use \"Baixar .html\" e importe o arquivo.");
    }
  }

  function handleDownload() {
    if (!ref.current) return;
    const html = buildStandaloneHtml(ref.current.innerHTML);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "criativo.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-psa-bg p-8">
      <div className="flex gap-3">
        <button className="psa-btn-primary" onClick={handleCopy}>
          <Copy size={16} /> Copiar HTML
        </button>
        <button className="psa-btn-ghost" onClick={handleDownload}>
          <Download size={16} /> Baixar .html
        </button>
      </div>
      {message && <p className="text-xs text-psa-muted">{message}</p>}
      <div className="overflow-auto rounded-xl border border-psa-border" style={{ maxWidth: "100%" }}>
        <div style={{ transform: "scale(0.45)", transformOrigin: "top left" }}>
          <div ref={ref}>{children}</div>
        </div>
      </div>
    </div>
  );
}
