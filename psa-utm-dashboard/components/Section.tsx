import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Section({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
  bare,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <section className={clsx(!bare && 'card', className)}>
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-psa-mute mb-1">{eyebrow}</div>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-psa-ink">{title}</h2>
          {description && (
            <p className="text-sm text-psa-mute mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  );
}
