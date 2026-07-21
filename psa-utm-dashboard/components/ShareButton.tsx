'use client';

import { useState } from 'react';

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-psa-line bg-white hover:bg-psa-bg transition-colors text-psa-ink"
      title="Copia a URL atual com todos os filtros"
    >
      {copied ? (
        <>
          <span aria-hidden className="text-psa-good">✓</span>
          <span className="text-psa-good">Link copiado</span>
        </>
      ) : (
        <>
          <span aria-hidden>↗</span>
          <span>Compartilhar</span>
        </>
      )}
    </button>
  );
}
