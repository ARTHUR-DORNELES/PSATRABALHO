"use client";

import { useState } from "react";
import Link from "next/link";
import { BanlekPicker } from "@/components/BanlekPicker";

export default function FotosBanlekPage() {
  const [copied, setCopied] = useState(false);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-white">Fotos (Banlek)</h1>
        <p className="mt-1 max-w-2xl text-sm text-psa-muted">
          As fotos dos álbuns do{" "}
          <a href="https://banlek.com/psa" target="_blank" rel="noreferrer" className="text-psa-accent underline">Banlek da PSA</a>,
          direto aqui. Cole a URL de um álbum, clique numa foto pra copiar a URL, ou use{" "}
          <strong className="text-white">Testar com foto</strong> num criativo do{" "}
          <Link href="/diretor" className="text-psa-accent underline">Diretor de Arte</Link>.
          {copied && <span className="ml-2 text-psa-accent">URL copiada ✓</span>}
        </p>
      </div>
      <BanlekPicker onPick={copyUrl} pickLabel="Copiar URL" />
    </div>
  );
}
