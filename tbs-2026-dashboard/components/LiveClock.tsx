'use client';
import { useEffect, useState } from 'react';

// Relógio corrido (igual relógio do sistema), horário de Brasília — independente das atualizações do dash.
export function LiveClock() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[13px] text-white/85 font-mono tabular-nums leading-none" suppressHydrationWarning>
      {now || '—'}
    </span>
  );
}
