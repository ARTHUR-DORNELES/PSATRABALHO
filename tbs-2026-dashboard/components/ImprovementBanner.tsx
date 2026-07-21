'use client';
import { useState, useEffect } from 'react';

const LS_KEY = 'tbs-banner-dismissed';

export function ImprovementBanner() {
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Lê a preferência de "fechado" do navegador (fica fechado nas próximas visitas).
  useEffect(() => {
    setHidden(localStorage.getItem(LS_KEY) === '1');
    setLoaded(true);
  }, []);

  if (loaded && hidden) return null;

  const fechar = () => {
    try { localStorage.setItem(LS_KEY, '1'); } catch {}
    setHidden(true);
  };

  return (
    <div className="mb-5 rounded-xl border border-tbs-orange/40 bg-tbs-orange/10 px-4 py-3 flex items-start gap-3 relative">
      <span className="text-lg leading-none mt-0.5">🛠️</span>
      <div className="text-[12px] leading-relaxed text-tbs-ink-light dark:text-white pr-7">
        <strong className="text-tbs-orange-deep dark:text-tbs-orange-light">Painel em constante melhoria e aprendizado.</strong>{' '}
        Os relatórios estão em evolução contínua — métricas e cálculos podem ser ajustados conforme refinamos as regras e novas fontes de dados entram.
        Passe o mouse sobre cada número para ver a <strong>prova real</strong> (como ele foi calculado). Dúvidas ou divergências, fale com o time de Growth/MKT-OPS.
      </div>
      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar aviso"
        title="Fechar aviso"
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-tbs-mute-light dark:text-tbs-mute hover:text-tbs-ink-light dark:hover:text-white hover:bg-tbs-orange/20 transition text-base leading-none"
      >
        ✕
      </button>
    </div>
  );
}
